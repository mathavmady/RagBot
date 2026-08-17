# pipeline.py
# ----------------------------------------------------------
# The main RAG pipeline — ties all modules together.
#
# Two primary functions:
#   1. ingest_document(file_path)
#      → Extract → Chunk → Embed → Store in Pinecone
#
#   2. answer_question(question)
#      → Embed query → Retrieve → Generate answer with LLM
#
# These are the only functions the API layer needs to call.
# ----------------------------------------------------------

import os
from typing import Dict, Any, Optional
from loguru import logger

import config
from document_processor.extractor import extract_document
from document_processor.chunker   import create_chunks_from_pages
from embedder.embedding_model      import embed_texts
from vector_store.pinecone_store   import upsert_chunks, get_index_stats, delete_document_vectors
from retriever.retriever           import retrieve_relevant_chunks, format_context_for_llm
from llm.groq_llm                  import generate_answer


# ── 1. Ingestion Pipeline ─────────────────────────────────

def ingest_document(file_path: str, replace_existing: bool = True) -> Dict[str, Any]:
    """
    Full ingestion pipeline for a single document.

    Steps:
      1. Extract text page-by-page from PDF / DOCX / PPTX.
      2. Split each page into overlapping chunks.
      3. Embed all chunks using Qwen3.
      4. Store vectors + metadata in Pinecone.

    Args:
        file_path        : path to the uploaded document
        replace_existing : if True, delete old vectors for this file before re-ingesting

    Returns:
        Dict with ingestion summary:
          - source_file   : filename
          - total_pages   : number of pages extracted
          - total_chunks  : number of chunks created and stored
          - status        : "success" or "error"
          - message       : human-readable summary
    """
    file_name = os.path.basename(file_path)
    logger.info(f"=== Starting ingestion for '{file_name}' ===")

    try:
        # Step 1 — Extract pages
        logger.info("Step 1/4: Extracting text from document...")
        pages = extract_document(file_path)

        if not pages:
            return {
                "source_file":  file_name,
                "total_pages":  0,
                "total_chunks": 0,
                "status":       "error",
                "message":      "No text could be extracted from the document."
            }

        # Step 2 — Chunk pages
        logger.info("Step 2/4: Splitting pages into chunks...")
        chunks = create_chunks_from_pages(
            pages=pages,
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP
        )

        # Step 3 — Embed chunks
        logger.info("Step 3/4: Generating embeddings...")
        chunk_texts  = [chunk.text for chunk in chunks]
        embeddings   = embed_texts(chunk_texts)

        # Step 4 — Store in Pinecone
        logger.info("Step 4/4: Storing vectors in Pinecone...")

        if replace_existing:
            delete_document_vectors(file_name)   # clean up old vectors first

        upsert_chunks(chunks=chunks, embeddings=embeddings)

        summary = (
            f"Successfully ingested '{file_name}': "
            f"{len(pages)} pages → {len(chunks)} chunks stored."
        )
        logger.success(summary)

        return {
            "source_file":  file_name,
            "total_pages":  len(pages),
            "total_chunks": len(chunks),
            "status":       "success",
            "message":      summary
        }

    except Exception as e:
        error_message = f"Ingestion failed for '{file_name}': {str(e)}"
        logger.error(error_message)
        return {
            "source_file":  file_name,
            "total_pages":  0,
            "total_chunks": 0,
            "status":       "error",
            "message":      error_message
        }


# ── 2. Query Pipeline ──────────────────────────────────────

def answer_question(
    question: str,
    top_k: int = None,
    source_file_filter: Optional[str] = None
) -> Dict[str, Any]:
    """
    Full RAG query pipeline.

    Steps:
      1. Embed the user's question.
      2. Retrieve top-k relevant chunks from Pinecone.
      3. Format the chunks into a context block.
      4. Send context + question to Mistral 70B via Groq.
      5. Return the answer + source references.

    Args:
        question           : the user's question
        top_k              : number of chunks to retrieve
        source_file_filter : optional — restrict answers to one file

    Returns:
        Dict with:
          - question  : original question
          - answer    : LLM-generated explanation
          - sources   : list of source dicts (file, page, chunk_id, score)
          - model_used: LLM model name
          - status    : "success" or "error"
    """
    if top_k is None:
        top_k = config.TOP_K_RESULTS

    logger.info(f"=== Processing question: '{question[:80]}' ===")

    try:
        # Step 1 — Retrieve relevant chunks
        chunks = retrieve_relevant_chunks(
            query=question,
            top_k=top_k,
            source_file_filter=source_file_filter
        )

        if not chunks:
            return {
                "question":   question,
                "answer":     "No relevant content found in the uploaded documents.",
                "sources":    [],
                "model_used": config.LLM_MODEL_NAME,
                "status":     "no_results"
            }

        # Step 2 — Format context
        context = format_context_for_llm(chunks)

        # Step 3 — Generate answer
        result = generate_answer(
            question=question,
            context=context,
            retrieved_chunks=chunks
        )

        return {
            "question":   question,
            "answer":     result["answer"],
            "sources":    result["sources"],
            "model_used": result["model_used"],
            "status":     "success"
        }

    except Exception as e:
        error_message = f"Query failed: {str(e)}"
        logger.error(error_message)
        return {
            "question":   question,
            "answer":     error_message,
            "sources":    [],
            "model_used": config.LLM_MODEL_NAME,
            "status":     "error"
        }


# ── 3. Health check ────────────────────────────────────────

def get_system_status() -> Dict[str, Any]:
    """
    Return basic system status for health check endpoint.
    """
    try:
        stats = get_index_stats()
        return {
            "status":        "healthy",
            "pinecone_index": stats["index_name"],
            "total_vectors": stats["total_vectors"],
            "llm_model":     config.LLM_MODEL_NAME,
            "embed_model":   config.EMBEDDING_MODEL_NAME
        }
    except Exception as e:
        return {
            "status":  "unhealthy",
            "error":   str(e)
        }