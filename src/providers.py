import tiktoken
from text_splitter import RecursiveCharacterTextSplitter, TextSplitterParams

# Models
gpt4_model = {
    "model": "gpt-4o",
    "structured_outputs": True
}

gpt4_mini_model = {
    "model": "gpt-4o-mini",
    "structured_outputs": True
}

o3_mini_model = {
    "model": "o3-mini",
    "reasoning_effort": "high",
    "response_format": {
        "type": "text"
    },
    "structured_outputs": True
}

MIN_CHUNK_SIZE = 200
encoder = tiktoken.get_encoding("cl100k_base")

def trim_prompt(prompt: str, context_size: int = 120_000) -> str:
    """
    Trims a prompt to a given context size.
    
    """
    if not prompt:
        return ""
        
    length = len(encoder.encode(prompt))
    if length <= context_size:
        return prompt
        
    overflow_tokens = length - context_size
    # Estimate characters per token
    chunk_size = len(prompt) - overflow_tokens * 3
    
    if chunk_size < MIN_CHUNK_SIZE:
        return prompt[:MIN_CHUNK_SIZE]
        
    splitter = RecursiveCharacterTextSplitter(fields=TextSplitterParams(chunk_size=chunk_size, chunk_overlap=0))
    trimmed_prompt = splitter.split_text(prompt)[0]
    
    # Handle edge case where trimmed length equals original
    if len(trimmed_prompt) == len(prompt):
        return trim_prompt(prompt[:chunk_size], context_size)
        
    return trim_prompt(trimmed_prompt, context_size)