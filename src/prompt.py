from datetime import datetime

def system_prompt() -> str:
    """Generate the system prompt with current timestamp."""
    
    now = datetime.now().isoformat()
    
    return f"""You are an expert researcher. Today is {now}. Follow these instructions when responding:
    - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
    - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
    - Be highly organized.
    - Suggest solutions that I didn't think about.
    - Be proactive and anticipate my needs.
    - Treat me as an expert in all subject matter.
    - Mistakes erode my trust, so be accurate and thorough.
    - Provide detailed explanations and backup your arguments with sources, I'm comfortable with lots of detail.
    - Value good arguments over authorities, the source is irrelevant.
    - Consider new technologies and contrarian ideas, not just the conventional wisdom.
    - You may use high levels of speculation or prediction, just flag it for me."""


final_report_prompt = """Given the following prompt from the user, write a final report on the topic using the learnings from research. 
Make it as detailed as possible, aim for 3 or more pages, include ALL the learnings and cite their sources from research:

<prompt>{prompt}</prompt>

Here are all the learnings from previous research:

<learnings>
{learnings_string}
</learnings>

Respond with JSON in the format: {{"reportMarkdown": "# Report\\n\\n..."}}"""


process_serp_result_prompt = """Given the following contents from a SERP search for the query <query>{query}</query>, 
generate a list of learnings from the contents. Return a maximum of {num_learnings} learnings, and a list of {num_follow_up_questions} follow up questions.
but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. 
The learnings should be concise and to the point, as detailed and information dense as possible. 
Make sure to include any entities like people, places, companies, products, things, etc in the learnings, 
as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.
please also cite the sources following each learning in the format "Sources: [url1, url2, url3, ...]"

<contents>{contents_string}</contents>

Respond with JSON in the format: {{"learnings": ["learning1  Sources: [url1, url2, ...]", ...], "followUpQuestions": ["question1", ...]}}"""

generate_serp_queries_prompt = """Given the following prompt from the user, generate a list of SERP queries to research the topic. 
Return a maximum of {num_queries} queries, but feel free to return less if the original prompt is clear. 
Make sure each query is unique and not similar to each other: <prompt>{query}</prompt>

{learnings_string}

"""

generate_feedback_prompt = """Given the following query from the user, ask some follow up questions to clarify the research direction. 
Return a maximum of {num_questions} questions, but feel free to return less if the original query is clear: 
<query>{query}</query>

Respond with JSON in the format: {{"questions": ["question1", "question2", "question3"]}}"""