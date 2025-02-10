import asyncio
from typing import List
from pathlib import Path
import logging, colorlog

from deep_research import (
    deep_research, 
    write_final_report, 
    generate_feedback,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
if not logger.handlers:
    logger.setLevel(logging.INFO)
    console_handler = colorlog.StreamHandler()
    console_handler.setFormatter(colorlog.ColoredFormatter("%(log_color)s %(name)s - %(levelname)s - %(asctime)s - %(message)s"))
    logger.addHandler(console_handler)
    logger.propagate = False

async def ask_question(query: str) -> str:
    return input(query)

async def main():
    # Get initial query
    initial_query = await ask_question("What would you like to research? ")
    
    # Get breath and depth parameters
    try:
        breadth = int(await ask_question("Enter research breadth (recommended 2-10, default 4): "))
    except ValueError:
        breadth = 4
        
    try:
        depth = int(await ask_question("Enter research depth (recommended 1-5, default 2): "))
    except ValueError:
        depth = 2

    logger.info("Creating research plan...")

    # Generate follow-up questions
    follow_up_questions = await generate_feedback(query=initial_query)
    logger.info("\nTo better understand your research needs, please answer these follow-up questions:")

    # Collect answers to follow-up questions
    answers: List[str] = []
    for question in follow_up_questions:
        answer = await ask_question(f"\n{question}\nYour answer: ")
        answers.append(answer)

    # Combine all information for deep research
    combined_query = f"""
    Initial Query: {initial_query}
    Follow-up Questions and Answers:
    {chr(10).join(f'Q: {q} A: {a}' for q, a in zip(follow_up_questions, answers))}
    """

    logger.info("\nResearching your topic...")

    result = await deep_research(
        query=combined_query,
        breadth=breadth,
        depth=depth
    )
    
    learnings = result["learnings"]
    visited_urls = result["visited_urls"]

    logger.info(f"\n\nLearnings:\n\n{chr(10).join(learnings)}")
    logger.info(f"\n\nVisited URLs ({len(visited_urls)}):\n\n{chr(10).join(visited_urls)}")
    logger.info("Writing final report...")

    report = await write_final_report(
        prompt=combined_query,
        learnings=learnings,
        visited_urls=visited_urls
    )

    # Save report to file
    Path("report.md").write_text(report, encoding="utf-8")

    logger.info(f"\n\nFinal Report:\n\n{report}")
    logger.info("\nReport has been saved to report.md")

if __name__ == "__main__":
    asyncio.run(main())