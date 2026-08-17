# llm/groq_llm.py
# ----------------------------------------------------------
# Calls the Groq API to generate answers using Mistral 70B.
#
# Key design:
#   - The system prompt instructs the model to:
#       (a) Use ONLY the provided context to answer.
#       (b) NOT copy text — instead understand and explain clearly.
#       (c) Say "I don't know" if the context doesn't help.
#   - The user prompt includes the retrieved context + question.
#   - We return both the answer and the source references.
# ----------------------------------------------------------

from typing import List, Dict, Any
from loguru import logger

import config


# ── System prompt ─────────────────────────────────────────
SYSTEM_PROMPT = """You are a knowledgeable study assistant. 
Your job is to help students understand concepts from their uploaded study materials.

STRICT RULES you must follow:
1. Answer ONLY based on the provided context from the study materials.
2. Do NOT copy or repeat text from the context — instead, understand the concept and explain it clearly in your own words.
3. If the context does not contain enough information to answer the question, say: "I could not find enough information in the uploaded documents to answer this."
4. Always explain clearly as if teaching a student — be concise but thorough.
5. Never invent facts or add information that is not supported by the context.
6. If multiple sources support the answer, mention all of them.
"""


def generate_answer(
    question: str,
    context: str,
    retrieved_chunks: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generate an answer to the user's question using the retrieved context.

    Args:
        question         : the user's question
        context          : formatted context string from retriever
        retrieved_chunks : raw chunk metadata (for source references)

    Returns:
        Dict with:
          - answer         : the LLM-generated answer text
          - sources        : list of source references (file, page, chunk)
          - model_used     : model name
    """
    try:
        from groq import Groq
    except ImportError:
        raise ImportError("Install groq:  pip install groq")

    logger.info(f"Using key: {config.GROQ_API_KEY[:15]}...")
    client = Groq(api_key=config.GROQ_API_KEY)

    # Build the user message: context + question
    user_message = f"""Here is the relevant content from the study materials:

{context}

---

Based ONLY on the content above, please answer the following question:
{question}

Remember: Explain the concept clearly in your own words. Do not copy text from the context.
"""

    logger.info(f"Sending query to Groq ({config.LLM_MODEL_NAME})...")
    logger.debug(f"Context length: {len(context)} characters")

    response = client.chat.completions.create(
        model=config.LLM_MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message}
        ],
        temperature=0.3,    # Lower = more factual, less creative
        max_tokens=1024,
    )

    answer_text = response.choices[0].message.content.strip()

    # Build source reference list for the response
    sources = []
    seen_sources = set()

    for chunk in retrieved_chunks:
        source_key = f"{chunk['source_file']}::page{chunk['page_number']}"

        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources.append({
                "source_file":  chunk["source_file"],
                "page_number":  chunk["page_number"],
                "chunk_id":     chunk["chunk_id"],
                "relevance_score": chunk["score"]
            })

    logger.success("Answer generated successfully.")

    return {
        "answer":      answer_text,
        "sources":     sources,
        "model_used":  config.LLM_MODEL_NAME
    }