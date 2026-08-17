# document_processor/chunker.py
# ----------------------------------------------------------
# Splits extracted page text into smaller overlapping chunks.
# Each chunk knows:
#   - which file it came from
#   - which page it came from
#   - its unique chunk_id (used as the Pinecone vector ID)
#   - its position within the page (chunk_index)
#
# Why overlap?
#   A sentence that spans a chunk boundary would be cut off.
#   Overlap ensures context is not lost at the edges.
# ----------------------------------------------------------

from dataclasses import dataclass
from typing import List

from loguru import logger

from document_processor.extractor import PageContent


# ── Data structure for a single chunk ────────────────────
@dataclass
class TextChunk:
    """
    A single text chunk ready to be embedded and stored.

    Fields:
        chunk_id      : globally unique ID  →  used as Pinecone vector ID
                        format: "{source_file}::page{page_number}::chunk{chunk_index}"
        source_file   : original filename
        page_number   : 1-based page / slide number where this chunk lives
        chunk_index   : 0-based position of this chunk within the page
        text          : the actual text content of this chunk
    """
    chunk_id:    str
    source_file: str
    page_number: int
    chunk_index: int
    text:        str


# ── Chunker ───────────────────────────────────────────────
def split_text_into_chunks(
    text: str,
    chunk_size: int  = 512,
    chunk_overlap: int = 50
) -> List[str]:
    """
    Split a long string into overlapping word-based chunks.

    Args:
        text          : raw text to split
        chunk_size    : max number of words per chunk
        chunk_overlap : number of words shared between consecutive chunks

    Returns:
        List of text strings (chunks)
    """
    words = text.split()

    if len(words) <= chunk_size:
        # Text is short enough — return as a single chunk
        return [text]

    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))

        # Move forward by (chunk_size - overlap) so the next chunk
        # shares 'overlap' words with this one.
        start += chunk_size - chunk_overlap

        # Prevent infinite loop if overlap >= chunk_size
        if chunk_overlap >= chunk_size:
            logger.warning("chunk_overlap >= chunk_size. Setting overlap to chunk_size // 4.")
            chunk_overlap = chunk_size // 4

    return chunks


def create_chunks_from_pages(
    pages: List[PageContent],
    chunk_size: int   = 512,
    chunk_overlap: int = 50
) -> List[TextChunk]:
    """
    Convert a list of PageContent objects into a flat list of TextChunk objects.

    Steps per page:
      1. Split the page text into word-based chunks.
      2. Assign each chunk a unique chunk_id.
      3. Record which file and page it came from.

    Args:
        pages         : output from extractor.extract_document()
        chunk_size    : words per chunk
        chunk_overlap : words shared between consecutive chunks

    Returns:
        Flat list of TextChunk objects.
    """
    all_chunks: List[TextChunk] = []

    for page in pages:
        raw_chunks = split_text_into_chunks(
            text=page.text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        for chunk_index, chunk_text in enumerate(raw_chunks):
            # Build a clean, traceable chunk ID
            # Example: "lecture1.pdf::page3::chunk0"
            chunk_id = f"{page.source_file}::page{page.page_number}::chunk{chunk_index}"

            all_chunks.append(TextChunk(
                chunk_id=chunk_id,
                source_file=page.source_file,
                page_number=page.page_number,
                chunk_index=chunk_index,
                text=chunk_text
            ))

    logger.info(
        f"Created {len(all_chunks)} chunks from {len(pages)} pages "
        f"(chunk_size={chunk_size}, overlap={chunk_overlap})."
    )
    return all_chunks