# vector_store/pinecone_store.py
# ----------------------------------------------------------
# Manages all interactions with Pinecone (vector database).
#
# FIX: Added namespace auto-detection and explicit namespace
# passing to all upsert/query/delete calls.
# This fixes the "0 results" bug when vectors exist but are
# stored in a different namespace than what is being queried.
# ----------------------------------------------------------

from typing import List, Dict, Any
from loguru import logger

import config
from document_processor.chunker import TextChunk


# ── Module-level Pinecone client cache ────────────────────
_pinecone_index = None


def _get_index():
    """
    Connect to Pinecone and return the index object.
    Connection is cached so we don't reconnect on every call.
    """
    global _pinecone_index

    if _pinecone_index is not None:
        return _pinecone_index

    logger.info("Connecting to Pinecone...")

    from pinecone import Pinecone, ServerlessSpec

    pc = Pinecone(api_key=config.PINECONE_API_KEY)

    existing_indexes = [idx.name for idx in pc.list_indexes()]

    if config.PINECONE_INDEX_NAME not in existing_indexes:
        logger.info(f"Creating Pinecone index '{config.PINECONE_INDEX_NAME}'...")

        pc.create_index(
            name      = config.PINECONE_INDEX_NAME,
            dimension = config.EMBEDDING_DIMENSION,
            metric    = "cosine",
            spec      = ServerlessSpec(
                cloud  = config.PINECONE_CLOUD,
                region = config.PINECONE_REGION
            )
        )
        logger.success(f"Index '{config.PINECONE_INDEX_NAME}' created.")
    else:
        logger.info(f"Index '{config.PINECONE_INDEX_NAME}' already exists.")

    _pinecone_index = pc.Index(config.PINECONE_INDEX_NAME)
    logger.success("Connected to Pinecone index.")

    return _pinecone_index


def _get_active_namespace() -> str:
    """
    Auto-detect which namespace the vectors are stored in.

    When vectors are upserted without specifying a namespace,
    Pinecone puts them in the default namespace (empty string '').
    Some Pinecone client versions behave differently — this
    function detects the correct namespace automatically so
    queries always find the right vectors.

    Returns:
        Namespace string — either '' (default) or a named namespace.
    """
    index = _get_index()
    stats = index.describe_index_stats()
    namespaces = list(stats.namespaces.keys())

    if not namespaces:
        # Stats show vectors but no namespace breakdown — use default
        return ""

    if len(namespaces) == 1:
        ns = namespaces[0]
        logger.debug(f"Single namespace detected: '{ns}'")
        return ns

    # Multiple namespaces — pick the one with the most vectors
    best = max(namespaces, key=lambda ns: stats.namespaces[ns].vector_count)
    logger.debug(f"Multiple namespaces {namespaces} — using '{best}' (most vectors)")
    return best


def upsert_chunks(chunks: List[TextChunk], embeddings: List[List[float]]):
    """
    Store chunks and their embeddings in Pinecone.

    Each vector record has:
      - id       : chunk_id  (e.g. "lecture1.pdf::page3::chunk0")
      - values   : embedding vector
      - metadata : source_file, page_number, chunk_index, text

    Args:
        chunks     : list of TextChunk objects
        embeddings : corresponding embedding vectors (same order as chunks)
    """
    index = _get_index()

    if len(chunks) != len(embeddings):
        raise ValueError(
            f"Mismatch: {len(chunks)} chunks but {len(embeddings)} embeddings."
        )

    # Always upsert into default namespace '' so queries always match
    namespace = ""

    vectors = []
    for chunk, embedding in zip(chunks, embeddings):
        vectors.append({
            "id":     chunk.chunk_id,
            "values": embedding,
            "metadata": {
                "source_file": chunk.source_file,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "text":        chunk.text
            }
        })

    batch_size     = 100
    total_upserted = 0

    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch, namespace=namespace)
        total_upserted += len(batch)
        logger.debug(f"  Upserted batch {i // batch_size + 1} ({len(batch)} vectors).")

    logger.success(
        f"Upserted {total_upserted} vectors into index "
        f"'{config.PINECONE_INDEX_NAME}' namespace='{namespace}'."
    )


def query_similar_chunks(
    query_embedding: List[float],
    top_k: int = 5,
    source_file_filter: str = None
) -> List[Dict[str, Any]]:
    """
    Find the top-k most similar chunks for a given query embedding.

    Args:
        query_embedding    : embedding vector of the user's query
        top_k              : number of results to return
        source_file_filter : if set, only return chunks from this file

    Returns:
        List of dicts with: chunk_id, score, source_file,
                            page_number, chunk_index, text
    """
    index = _get_index()

    # Auto-detect the namespace where vectors are actually stored
    # This is the KEY fix — without this, queries return 0 results
    namespace = _get_active_namespace()
    logger.debug(f"Querying namespace='{namespace}'")

    query_filter = None
    if source_file_filter:
        query_filter = {"source_file": {"$eq": source_file_filter}}

    response = index.query(
        vector           = query_embedding,
        top_k            = top_k,
        include_metadata = True,
        filter           = query_filter,
        namespace        = namespace        # ← THE FIX
    )

    results = []
    for match in response.matches:
        results.append({
            "chunk_id":    match.id,
            "score":       round(match.score, 4),
            "source_file": match.metadata.get("source_file", ""),
            "page_number": match.metadata.get("page_number", 0),
            "chunk_index": match.metadata.get("chunk_index", 0),
            "text":        match.metadata.get("text", "")
        })

    logger.info(
        f"Retrieved {len(results)} similar chunks "
        f"(namespace='{namespace}')."
    )
    return results


def delete_document_vectors(source_file: str):
    """
    Remove all vectors from Pinecone that belong to a specific file.

    Args:
        source_file : the filename whose vectors should be deleted
    """
    index     = _get_index()
    namespace = _get_active_namespace()

    logger.info(
        f"Deleting all vectors for '{source_file}' "
        f"from namespace='{namespace}'..."
    )

    index.delete(
        filter    = {"source_file": {"$eq": source_file}},
        namespace = namespace
    )

    logger.success(f"Deleted vectors for '{source_file}'.")


def get_index_stats() -> Dict[str, Any]:
    """
    Return basic stats about the Pinecone index.
    """
    index = _get_index()
    stats = index.describe_index_stats()

    return {
        "total_vectors": stats.total_vector_count,
        "dimension":     stats.dimension,
        "index_name":    config.PINECONE_INDEX_NAME,
        "namespaces":    list(stats.namespaces.keys())
    }