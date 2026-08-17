# retriever/retriever.py
# ----------------------------------------------------------
# Combines embedding + Pinecone query into a single function.
#
# Flow:
#   1. Embed the user's query using Qwen3.
#   2. Query Pinecone for the top-k most similar chunks.
#   3. Return the retrieved chunks with full metadata.
#
# The retriever does NOT call the LLM — it only finds
# the relevant context. The LLM call is a separate step.
# ----------------------------------------------------------

from typing import List, Dict, Any
from loguru import logger

import config
from embedder.embedding_model import embed_single_text
from vector_store.pinecone_store import query_similar_chunks


def retrieve_relevant_chunks(
    query: str,
    top_k: int = None,
    source_file_filter: str = None
) -> List[Dict[str, Any]]:
    """
    Find the most relevant text chunks for a given user query.

    Steps:
      1. Embed the query with Qwen3.
      2. Search Pinecone for similar vectors.
      3. Return the top-k matches with metadata.

    Args:
        query              : the user's question or search text
        top_k              : number of chunks to retrieve
                             (defaults to config.TOP_K_RESULTS)
        source_file_filter : optional — restrict search to one file

    Returns:
        List of chunk dicts, sorted by similarity score (highest first).
        Each dict has: chunk_id, score, source_file, page_number,
                       chunk_index, text
    """
    if top_k is None:
        top_k = config.TOP_K_RESULTS

    logger.info(f"Retrieving top {top_k} chunks for query: '{query[:80]}...'")

    # Step 1 — Embed the query
    query_embedding = embed_single_text(query)

    # Step 2 — Query Pinecone
    chunks = query_similar_chunks(
        query_embedding=query_embedding,
        top_k=top_k,
        source_file_filter=source_file_filter
    )

    # Step 3 — Log what we found
    for i, chunk in enumerate(chunks):
        logger.debug(
            f"  [{i+1}] score={chunk['score']:.4f} | "
            f"file='{chunk['source_file']}' | "
            f"page={chunk['page_number']} | "
            f"chunk={chunk['chunk_index']}"
        )

    return chunks


def format_context_for_llm(chunks: List[Dict[str, Any]]) -> str:
    """
    Format retrieved chunks into a readable context block
    that can be inserted into the LLM prompt.

    Format per chunk:
        --- Source: filename.pdf | Page: 3 | Chunk: 0 ---
        <chunk text here>

    Args:
        chunks : list of chunk dicts from retrieve_relevant_chunks()

    Returns:
        A formatted string ready to be placed in the LLM prompt.
    """
    if not chunks:
        return "No relevant content found in the uploaded documents."

    context_parts = []

    for chunk in chunks:
        header = (
            f"--- Source: {chunk['source_file']} | "
            f"Page: {chunk['page_number']} | "
            f"Chunk: {chunk['chunk_index']} "
            f"(relevance: {chunk['score']:.2f}) ---"
        )
        context_parts.append(f"{header}\n{chunk['text']}")

    return "\n\n".join(context_parts)