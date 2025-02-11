import asyncio
from typing import TypedDict, List, Optional
from dataclasses import dataclass
import os
from openai import OpenAI
from firecrawl import FirecrawlApp
from pydantic import BaseModel, Field
from providers import o3_mini_model, trim_prompt
from prompt import system_prompt, generate_serp_queries_prompt, generate_feedback_prompt, final_report_prompt, process_serp_result_prompt
from dotenv import load_dotenv
import logging, colorlog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
if not logger.handlers:
    logger.setLevel(logging.INFO)
    console_handler = colorlog.StreamHandler()
    console_handler.setFormatter(colorlog.ColoredFormatter("%(log_color)s %(name)s - %(levelname)s - %(asctime)s - %(message)s"))
    logger.addHandler(console_handler)
    logger.propagate = False

load_dotenv()

# Initialize Firecrawl and OpenAI client
firecrawl = FirecrawlApp()
client = OpenAI()

class ResearchResult(TypedDict):
    learnings: List[str]
    visited_urls: List[str]

# increase this if you have higher API limits
CONCURRENCY_LIMIT = 2

class SerpQuery(BaseModel):
    query: str
    research_goal: str

class SerpQueryResponse(BaseModel):
    queries: List[SerpQuery]

class ProcessResponse(BaseModel):
    learnings: List[str] = Field(default_factory=list, description="A list of learnings from the research")
    followUpQuestions: List[str]

class ReportResponse(BaseModel):
    reportMarkdown: str

class FeedbackResponse(BaseModel):
    questions: List[str]

async def generate_feedback(
    query: str,
    num_questions: int = 3
) -> List[str]:
    """Generate follow-up questions to clarify research direction."""

    prompt = generate_feedback_prompt.format(query=query, num_questions=num_questions)

    response = client.beta.chat.completions.parse(  # Removed await
        model=o3_mini_model["model"],
        messages=[
            {"role": "system", "content": system_prompt() + "\nRespond with JSON."},
            {"role": "user", "content": prompt}
        ],
        reasoning_effort=o3_mini_model["reasoning_effort"],
        response_format=FeedbackResponse
    ).choices[0].message

    # Parse the response JSON
    if response.parsed:
        result = response.parsed.dict()
    else:
        raise Exception("Failed to parse response")
    return result["questions"][:num_questions]

async def generate_serp_queries(
        query: str,
        num_queries: int = 3,
        learnings: Optional[List[str]] = None
    ) -> List[SerpQuery]:
    
    learnings_string =f"Here are some learnings from previous research, use them to generate more specific queries: {chr(10).join(learnings)}" if learnings else ""

    prompt = generate_serp_queries_prompt.format(query=query, num_queries=num_queries, learnings_string=learnings_string)

    response = client.beta.chat.completions.parse(
        model=o3_mini_model["model"],
        messages=[
            {"role": "system", "content": system_prompt() + "\nRespond with JSON."},
            {"role": "user", "content": prompt}
        ],
        reasoning_effort=o3_mini_model["reasoning_effort"],
        response_format=SerpQueryResponse
    ).choices[0].message
    
    if response.parsed:
        result = response.parsed.dict()
    else:
        raise Exception("Failed to parse response")
    logger.info(f"Created {len(result['queries'])} queries" +  f"\n{str(result['queries'])}")
    return [SerpQuery(**query) for query in result['queries']]

async def process_serp_result(
    query: str,
    contents: List[dict],
    num_learnings: int = 3,
    num_follow_up_questions: int = 3
) -> dict:
    """
    TODO: augment urls within the result, cite URL in each learning, 
    """
    
    logger.info(f"Query: {query}, \nFound {len(contents)} contents")
    contents_string = "".join(f"<content>{content['content']}, from source {content['url']}</content>" for content in contents)
    prompt = process_serp_result_prompt.format(query=query, 
                                               contents_string=contents_string, 
                                               num_learnings=num_learnings, 
                                               num_follow_up_questions=num_follow_up_questions)
    response = client.beta.chat.completions.parse(
        model=o3_mini_model["model"],
        messages=[
            {"role": "system", "content": system_prompt() + "\nRespond with JSON."},
            {"role": "user", "content": prompt}
        ],
        reasoning_effort=o3_mini_model["reasoning_effort"],
        response_format=ProcessResponse
    ).choices[0].message
    
    if response.parsed:
        result = response.parsed.dict()
    else:
        raise Exception("Failed to parse response")
    logger.info(f"Created {len(result['learnings'])} learnings" +  f"\n{str(result['learnings'])}")
    return result


async def write_final_report(
    prompt: str,
    learnings: List[str],
    visited_urls: List[str]
) -> str:
    learnings_string = trim_prompt(
        "".join(f"<learning>\n{learning}\n</learning>" for learning in learnings),
        150_000
    )

    prompt = final_report_prompt.format(prompt=prompt, learnings_string=learnings_string)
    response = client.beta.chat.completions.parse(
        model=o3_mini_model["model"],
        messages=[
            {"role": "system", "content": system_prompt() + "\nRespond with JSON."},
            {"role": "user", "content": prompt}
        ],
        reasoning_effort=o3_mini_model["reasoning_effort"],
        response_format=ReportResponse
    ).choices[0].message

    if response.parsed:
        result = response.parsed.dict()
    else:
        raise Exception("Failed to parse response")

    # Append the visited URLs section to the report
    urls_section = f"\n\n## Sources\n\n{chr(10).join(f'- {url}' for url in visited_urls)}"
    return result['reportMarkdown'] + urls_section

async def deep_research(
    query: str,
    breadth: int,
    depth: int,
    learnings: Optional[List[str]] = None,
    visited_urls: Optional[List[str]] = None
) -> ResearchResult:
    learnings = learnings or []
    visited_urls = visited_urls or []
    
    serp_queries = await generate_serp_queries(
        query=query,
        num_queries=breadth,
        learnings=learnings
    )

    async def process_query(serp_query: SerpQuery) -> ResearchResult:
        try:
            result = firecrawl.search(
                serp_query.query,
            )
            # result is a list of dicts {'markdown': '...','metadata': {'url': '...', 'title': '...', 'source': '...'}}
            
            processed_result = [
            (item.get("metadata", {}).get("url"), trim_prompt(item.get("markdown", ""), 25_000))
                for item in result
                if item.get("markdown")
            ]
            contents = [{'index': idx, 'url': url, 'content': content} for idx, (url, content) in enumerate(processed_result)]

            new_breadth = breadth // 2
            new_depth = depth - 1

            new_learnings = await process_serp_result(
                query=serp_query.query,
                contents=contents,
                num_follow_up_questions=new_breadth
            )
            new_urls = [item.get("metadata", {}).get("url") for item in result if item.get("metadata", {}).get("url")]
            all_learnings = learnings + new_learnings["learnings"]
            all_urls = visited_urls + new_urls
            logger.info(f"New learnings: {new_learnings['learnings']}")
            logger.info(f"New urls: {new_urls}")
            if new_depth > 0:
                logger.info(f"Researching deeper, breadth: {new_breadth}, depth: {new_depth}")
                
                next_query = f"""Previous research goal: {serp_query.research_goal}
Follow-up research directions: {chr(10).join(new_learnings["followUpQuestions"])}""".strip()

                return await deep_research(
                    query=next_query,
                    breadth=new_breadth,
                    depth=new_depth,
                    learnings=all_learnings,
                    visited_urls=all_urls
                )
            
            return {
                "learnings": all_learnings,
                "visited_urls": all_urls
            }
            
        except Exception as e:
            logger.warning(f"Error running query: {serp_query.query}" + '\n' + str(e))
            return {
                "learnings": [],
                "visited_urls": []
            }
    
    # Create tasks for concurrent processing
    tasks = [asyncio.create_task(process_query(query)) for query in serp_queries]
    
    # Wait for all tasks to complete
    results = await asyncio.gather(*tasks)
    
    return {
        "learnings": list(set(sum((r["learnings"] for r in results), []))),
        "visited_urls": list(set(sum((r["visited_urls"] for r in results), [])))
    }