# ingest.py
# ----------------------------------------------------------
# Standalone script to convert documents → embeddings → Pinecone
#
# Run this directly WITHOUT starting the API server.
#
# Usage:
#   Single file:
#       python ingest.py --file "Artificial Intelligence.pdf"
#
#   Entire folder:
#       python ingest.py --folder "./my_documents"
#
#   Show what's already stored:
#       python ingest.py --status
#
#   Delete a document from Pinecone:
#       python ingest.py --delete "Artificial Intelligence.pdf"
# ----------------------------------------------------------

import os
import sys
import argparse
from loguru import logger

# Make sure the project root is on the Python path
sys.path.insert(0, os.path.dirname(__file__))

import config
from document_processor.extractor  import extract_document
from document_processor.chunker    import create_chunks_from_pages
from embedder.embedding_model      import embed_texts
from vector_store.pinecone_store   import (
    upsert_chunks,
    delete_document_vectors,
    get_index_stats
)

import torch

print("CUDA Available:", torch.cuda.is_available())
print("CUDA Version:", torch.version.cuda)

if torch.cuda.is_available():
    print("GPU Name:", torch.cuda.get_device_name(0))
    print("GPU Count:", torch.cuda.device_count())
# ─────────────────────────────────────────────────────────
# SUPPORTED FILE TYPES
# ─────────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx"}


# ─────────────────────────────────────────────────────────
# CORE FUNCTION: process one document
# ─────────────────────────────────────────────────────────
def ingest_one_file(file_path: str, replace_existing: bool = True):
    """
    Full pipeline for a single document:
      1. Extract text page by page
      2. Split into overlapping chunks
      3. Generate embeddings with Qwen3
      4. Store vectors + metadata in Pinecone

    Args:
        file_path        : full path to the document
        replace_existing : delete old vectors for this file before re-ingesting
    """
    file_name = os.path.basename(file_path)
    ext       = os.path.splitext(file_name)[1].lower()

    # ── Validate ──────────────────────────────────────────
    if not os.path.exists(file_path):
        print(f"  [ERROR] File not found: {file_path}")
        return False

    if ext not in SUPPORTED_EXTENSIONS:
        print(f"  [ERROR] Unsupported format '{ext}'. "
              f"Supported: {', '.join(SUPPORTED_EXTENSIONS)}")
        return False

    print(f"\n{'='*60}")
    print(f"  Processing: {file_name}")
    print(f"{'='*60}")

    # ── Step 1: Extract text ──────────────────────────────
    print(f"\n  [1/4] Extracting text from document...")
    pages = extract_document(file_path)

    if not pages:
        print(f"  [ERROR] No text could be extracted from '{file_name}'.")
        return False

    print(f"        Extracted {len(pages)} pages / slides.")

    # ── Step 2: Chunk pages ───────────────────────────────
    print(f"\n  [2/4] Splitting pages into chunks...")
    chunks = create_chunks_from_pages(
        pages         = pages,
        chunk_size    = config.CHUNK_SIZE,
        chunk_overlap = config.CHUNK_OVERLAP
    )
    print(f"        Created {len(chunks)} chunks "
          f"(size={config.CHUNK_SIZE} words, overlap={config.CHUNK_OVERLAP} words).")

    # Print a sample chunk so you can verify it looks correct
    if chunks:
        sample = chunks[0]
        print(f"\n        Sample chunk:")
        print(f"          chunk_id   : {sample.chunk_id}")
        print(f"          source_file: {sample.source_file}")
        print(f"          page_number: {sample.page_number}")
        print(f"          chunk_index: {sample.chunk_index}")
        print(f"          text preview: {sample.text[:120].strip()}...")

    # ── Step 3: Generate embeddings ───────────────────────
    print(f"\n  [3/4] Generating embeddings with Qwen3...")
    print(f"        (First run downloads ~600MB model — please wait)")

    chunk_texts = [chunk.text for chunk in chunks]
    embeddings  = embed_texts(chunk_texts, batch_size=32)

    print(f"        Generated {len(embeddings)} embeddings "
          f"(dimension = {len(embeddings[0])}).")

    # ── Step 4: Store in Pinecone ─────────────────────────
    print(f"\n  [4/4] Storing vectors in Pinecone...")

    if replace_existing:
        print(f"        Removing old vectors for '{file_name}'...")
        try:
            delete_document_vectors(file_name)
        except Exception as e:
            if "Namespace not found" in str(e):
                print("        First run → no namespace yet, skipping delete ✅")
            else:
                raise e

    upsert_chunks(chunks=chunks, embeddings=embeddings)

    print(f"\n  [DONE] '{file_name}' successfully stored in Pinecone.")
    print(f"         Pages: {len(pages)}  |  Chunks: {len(chunks)}  "
          f"|  Embedding dim: {len(embeddings[0])}")

    return True


# ─────────────────────────────────────────────────────────
# PROCESS AN ENTIRE FOLDER
# ─────────────────────────────────────────────────────────
def ingest_folder(folder_path: str, replace_existing: bool = True):
    """
    Find all supported documents in a folder and ingest them one by one.

    Args:
        folder_path      : path to the folder containing documents
        replace_existing : delete old vectors before re-ingesting
    """
    if not os.path.isdir(folder_path):
        print(f"[ERROR] Folder not found: {folder_path}")
        return

    # Find all supported files
    all_files = []
    for filename in sorted(os.listdir(folder_path)):
        ext = os.path.splitext(filename)[1].lower()
        if ext in SUPPORTED_EXTENSIONS:
            all_files.append(os.path.join(folder_path, filename))

    if not all_files:
        print(f"[INFO] No supported documents found in '{folder_path}'.")
        print(f"       Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}")
        return

    print(f"\nFound {len(all_files)} document(s) in '{folder_path}':")
    for f in all_files:
        print(f"  - {os.path.basename(f)}")

    # Process each file
    success_count = 0
    fail_count    = 0

    for file_path in all_files:
        ok = ingest_one_file(file_path, replace_existing=replace_existing)
        if ok:
            success_count += 1
        else:
            fail_count += 1

    # Final summary
    print(f"\n{'='*60}")
    print(f"  FOLDER INGESTION COMPLETE")
    print(f"  Success : {success_count} file(s)")
    print(f"  Failed  : {fail_count} file(s)")
    print(f"{'='*60}\n")


# ─────────────────────────────────────────────────────────
# SHOW PINECONE STATUS
# ─────────────────────────────────────────────────────────
def show_status():
    """
    Print the current state of the Pinecone index.
    Shows total vectors stored and index settings.
    """
    print(f"\n{'='*60}")
    print(f"  Pinecone Index Status")
    print(f"{'='*60}")

    stats = get_index_stats()

    print(f"  Index Name    : {stats['index_name']}")
    print(f"  Total Vectors : {stats['total_vectors']}")
    print(f"  Dimension     : {stats['dimension']}")
    print(f"  Embed Model   : {config.EMBEDDING_MODEL_NAME}")
    print(f"  LLM Model     : {config.LLM_MODEL_NAME}")
    print(f"{'='*60}\n")


# ─────────────────────────────────────────────────────────
# DELETE A DOCUMENT FROM PINECONE
# ─────────────────────────────────────────────────────────
def delete_document(file_name: str):
    """
    Remove all vectors for a specific document from Pinecone.

    Args:
        file_name : just the filename, e.g. 'lecture.pdf'
    """
    print(f"\nDeleting all vectors for '{file_name}' from Pinecone...")
    delete_document_vectors(file_name)
    print(f"Done. Vectors for '{file_name}' have been removed.")


# ─────────────────────────────────────────────────────────
# CLI ARGUMENT PARSER
# ─────────────────────────────────────────────────────────
def build_parser():
    parser = argparse.ArgumentParser(
        description="RAG System — Document Ingestion Tool",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Examples:
  Ingest a single PDF:
    python ingest.py --file "Artificial Intelligence.pdf"

  Ingest all documents in a folder:
    python ingest.py --folder "./study_materials"

  Check Pinecone index status:
    python ingest.py --status

  Delete a document from Pinecone:
    python ingest.py --delete "Artificial Intelligence.pdf"

  Re-ingest without deleting old vectors:
    python ingest.py --file "notes.pdf" --no-replace
        """
    )

    parser.add_argument(
        "--file",
        type=str,
        help="Path to a single document to ingest (PDF, DOCX, or PPTX)"
    )
    parser.add_argument(
        "--folder",
        type=str,
        help="Path to a folder — ingests all supported documents inside it"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show current Pinecone index stats (how many vectors are stored)"
    )
    parser.add_argument(
        "--delete",
        type=str,
        help="Delete all vectors for a specific document from Pinecone"
    )
    parser.add_argument(
        "--no-replace",
        action="store_true",
        default=False,
        help="Do NOT delete old vectors before re-ingesting (default: replace)"
    )

    return parser


# ─────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Validate config before doing anything
    try:
        config.validate_config()
    except EnvironmentError as e:
        print(f"\n[ERROR] {e}\n")
        sys.exit(1)

    parser = build_parser()
    args   = parser.parse_args()

    # If no arguments given, print help
    if not any([args.file, args.folder, args.status, args.delete]):
        parser.print_help()
        sys.exit(0)

    replace = not args.no_replace   # default: replace=True

    # ── Route to the correct function ─────────────────────
    if args.status:
        show_status()

    elif args.delete:
        delete_document(args.delete)

    elif args.file:
        ok = ingest_one_file(
            file_path        = args.file,
            replace_existing = replace
        )
        sys.exit(0 if ok else 1)

    elif args.folder:
        ingest_folder(
            folder_path      = args.folder,
            replace_existing = replace
        )