import asyncio
from typing import TypedDict, List, Optional
from dataclasses import dataclass
import os
from openai import OpenAI
from firecrawl import FirecrawlApp
from pydantic import BaseModel
from providers import o3_mini_model, trim_prompt
from prompt import system_prompt
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
    learnings: List[str]
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
    
    prompt = f"""Given the following query from the user, ask some follow up questions to clarify the research direction. 
    Return a maximum of {num_questions} questions, but feel free to return less if the original query is clear: 
    <query>{query}</query>
    
    Respond with JSON in the format: {{"questions": ["question1", "question2", "question3"]}}"""

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
    
    prompt = f"""Given the following prompt from the user, generate a list of SERP queries to research the topic. 
Return a maximum of {num_queries} queries, but feel free to return less if the original prompt is clear. 
Make sure each query is unique and not similar to each other: <prompt>{query}</prompt>

{f"Here are some learnings from previous research, use them to generate more specific queries: {chr(10).join(learnings)}" if learnings else ""}

"""

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
    result: List[dict],
    num_learnings: int = 3,
    num_follow_up_questions: int = 3
) -> dict:
    contents = [
        trim_prompt(item.get("markdown", ""), 25_000)
        for item in result
        if item.get("markdown")
    ]
    logger.info(f"Ran {query}, found {len(contents)} contents")

    prompt = f"""Given the following contents from a SERP search for the query <query>{query}</query>, 
generate a list of learnings from the contents. Return a maximum of {num_learnings} learnings, and a list of {num_follow_up_questions} follow up questions.
but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. 
The learnings should be concise and to the point, as detailed and information dense as possible. 
Make sure to include any entities like people, places, companies, products, things, etc in the learnings, 
as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.

<contents>{"".join(f"<content>{content}</content>" for content in contents)}</contents>

Respond with JSON in the format: {{"learnings": ["learning1", ...], "followUpQuestions": ["question1", ...]}}"""

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

    prompt = f"""Given the following prompt from the user, write a final report on the topic using the learnings from research. 
Make it as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:

<prompt>{prompt}</prompt>

Here are all the learnings from previous research:

<learnings>
{learnings_string}
</learnings>

Respond with JSON in the format: {{"reportMarkdown": "# Report\\n\\n..."}}"""


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
            new_urls = [item.get("metadata", {}).get("url") for item in result if item.get("metadata", {}).get("url")]
            new_breadth = breadth // 2
            new_depth = depth - 1

            new_learnings = await process_serp_result(
                query=serp_query.query,
                result=result,
                num_follow_up_questions=new_breadth
            )
            
            all_learnings = learnings + new_learnings["learnings"]
            logger.info(f"All learnings: {all_learnings}")
            all_urls = visited_urls + new_urls
            logger.info(f"All urls: {all_urls}")
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