# watch.py
# ----------------------------------------------------------
# Folder Watcher — Auto-ingests new documents into Pinecone.
#
# Drop any PDF / DOCX / PPTX into the watch folder and this
# script will automatically:
#   1. Detect the new file
#   2. Extract text page by page
#   3. Generate embeddings with Qwen3
#   4. Store in Pinecone
#
# Already-processed files are NEVER re-ingested.
# A local file "processed_files.txt" tracks what's done.
#
# Usage:
#   Watch the default "uploads/" folder:
#       python watch.py
#
#   Watch a custom folder:
#       python watch.py --folder "./study_materials"
#
#   Watch a folder and process existing files too:
#       python watch.py --folder "./study_materials" --process-existing
# ----------------------------------------------------------

import os
import sys
import time
import argparse

sys.path.insert(0, os.path.dirname(__file__))

import config
from document_processor.extractor import extract_document
from document_processor.chunker   import create_chunks_from_pages
from embedder.embedding_model     import embed_texts
from vector_store.pinecone_store  import upsert_chunks, get_index_stats

# ─────────────────────────────────────────────────────────
# SETTINGS
# ─────────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS  = {".pdf", ".docx", ".pptx"}
PROCESSED_LOG_FILE    = "processed_files.txt"   # tracks already-done files
POLL_INTERVAL_SECONDS = 5                        # how often to scan the folder


# ─────────────────────────────────────────────────────────
# PROCESSED FILE TRACKER
# ─────────────────────────────────────────────────────────

def load_processed_files() -> set:
    """
    Read the list of already-processed filenames from disk.
    Returns a set of filenames (not full paths).
    """
    if not os.path.exists(PROCESSED_LOG_FILE):
        return set()

    with open(PROCESSED_LOG_FILE, "r", encoding="utf-8") as f:
        lines = f.read().strip().splitlines()

    processed = set(line.strip() for line in lines if line.strip())
    return processed


def mark_as_processed(file_name: str):
    """
    Add a filename to the processed log so it won't be ingested again.
    """
    with open(PROCESSED_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(file_name + "\n")


def is_already_processed(file_name: str, processed_set: set) -> bool:
    """
    Check if this file has already been ingested.
    """
    return file_name in processed_set


# ─────────────────────────────────────────────────────────
# INGEST ONE FILE
# ─────────────────────────────────────────────────────────

def ingest_file(file_path: str) -> bool:
    """
    Run the full ingestion pipeline on a single file.

    Steps:
      1. Extract text
      2. Chunk it
      3. Embed with Qwen3
      4. Store in Pinecone

    Returns True if successful, False if failed.
    """
    file_name = os.path.basename(file_path)

    print(f"\n  {'='*54}")
    print(f"  NEW FILE DETECTED: {file_name}")
    print(f"  {'='*54}")

    try:
        # Step 1 — Extract
        print(f"  [1/4] Extracting text...")
        pages = extract_document(file_path)

        if not pages:
            print(f"  [ERROR] No text extracted from '{file_name}'. Skipping.")
            return False

        print(f"         {len(pages)} pages extracted.")

        # Step 2 — Chunk
        print(f"  [2/4] Creating chunks...")
        chunks = create_chunks_from_pages(
            pages         = pages,
            chunk_size    = config.CHUNK_SIZE,
            chunk_overlap = config.CHUNK_OVERLAP
        )
        print(f"         {len(chunks)} chunks created.")

        # Step 3 — Embed
        print(f"  [3/4] Generating embeddings (Qwen3)...")
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings  = embed_texts(chunk_texts, batch_size=16)
        print(f"         {len(embeddings)} embeddings generated.")

        # Step 4 — Store
        print(f"  [4/4] Storing in Pinecone...")
        upsert_chunks(chunks=chunks, embeddings=embeddings)

        print(f"\n  [DONE] '{file_name}' stored successfully.")
        print(f"         Pages: {len(pages)} | Chunks: {len(chunks)}")
        return True

    except Exception as e:
        print(f"\n  [ERROR] Failed to ingest '{file_name}': {e}")
        return False


# ─────────────────────────────────────────────────────────
# SCAN FOLDER FOR NEW FILES
# ─────────────────────────────────────────────────────────

def scan_and_ingest(watch_folder: str, processed_files: set):
    """
    Scan the watch folder for any new supported files.
    Ingest any file not already in the processed set.

    Args:
        watch_folder    : folder path to scan
        processed_files : set of already-processed filenames (modified in place)
    """
    for filename in sorted(os.listdir(watch_folder)):
        ext = os.path.splitext(filename)[1].lower()

        # Skip unsupported file types
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        # Skip already-processed files
        if is_already_processed(filename, processed_files):
            continue

        file_path = os.path.join(watch_folder, filename)

        # Skip files that are still being written (size keeps changing)
        # Wait 2 seconds and check if file size is stable
        size_before = os.path.getsize(file_path)
        time.sleep(2)
        size_after = os.path.getsize(file_path)

        if size_before != size_after:
            print(f"  [WAIT] '{filename}' is still being copied... will retry.")
            continue

        # Ingest the new file
        success = ingest_file(file_path)

        if success:
            # Mark as processed so we never ingest it again
            processed_files.add(filename)
            mark_as_processed(filename)
        else:
            print(f"  [SKIP] '{filename}' failed — will retry on next scan.")


# ─────────────────────────────────────────────────────────
# MAIN WATCHER LOOP
# ─────────────────────────────────────────────────────────

def start_watching(watch_folder: str, process_existing: bool = False):
    """
    Start the folder watcher loop.
    Scans every POLL_INTERVAL_SECONDS for new files.

    Args:
        watch_folder     : folder to monitor
        process_existing : if True, also ingest files already in the folder
                           that haven't been processed yet
    """
    # Make sure the watch folder exists
    os.makedirs(watch_folder, exist_ok=True)

    # Load the list of already-processed files
    processed_files = load_processed_files()

    print(f"\n{'='*60}")
    print(f"  RAG Auto-Watcher — Started")
    print(f"{'='*60}")
    print(f"  Watch folder     : {os.path.abspath(watch_folder)}")
    print(f"  Scan interval    : every {POLL_INTERVAL_SECONDS} seconds")
    print(f"  Already tracked  : {len(processed_files)} file(s)")
    print(f"  Supported types  : {', '.join(SUPPORTED_EXTENSIONS)}")
    print(f"  Log file         : {PROCESSED_LOG_FILE}")
    print(f"\n  Drop any PDF / DOCX / PPTX into the watch folder.")
    print(f"  It will be automatically embedded and stored in Pinecone.")
    print(f"\n  Press Ctrl+C to stop.")
    print(f"{'='*60}\n")

    # Show current Pinecone stats
    try:
        stats = get_index_stats()
        print(f"  Pinecone index   : {stats['index_name']}")
        print(f"  Vectors stored   : {stats['total_vectors']}")
        print()
    except Exception as e:
        print(f"  [WARN] Could not fetch Pinecone stats: {e}\n")

    # If process_existing is False, mark all current files as already seen
    # so the watcher only picks up NEW files added after it starts
    if not process_existing:
        existing_files = [
            f for f in os.listdir(watch_folder)
            if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
        ]
        newly_seen = 0
        for filename in existing_files:
            if filename not in processed_files:
                processed_files.add(filename)
                mark_as_processed(filename)
                newly_seen += 1

        if newly_seen > 0:
            print(f"  [INFO] Skipped {newly_seen} existing file(s) already in folder.")
            print(f"         (Use --process-existing to ingest them)\n")

    # ── Main loop ─────────────────────────────────────────
    while True:
        try:
            scan_and_ingest(watch_folder, processed_files)
            time.sleep(POLL_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            print(f"\n\n  Watcher stopped. Goodbye!\n")
            break

        except Exception as e:
            print(f"\n  [ERROR] Unexpected error: {e}")
            print(f"  Retrying in {POLL_INTERVAL_SECONDS} seconds...\n")
            time.sleep(POLL_INTERVAL_SECONDS)


# ─────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        config.validate_config()
    except EnvironmentError as e:
        print(f"\n[ERROR] {e}\n")
        sys.exit(1)

    parser = argparse.ArgumentParser(
        description="RAG Auto-Watcher — Automatically ingests new documents into Pinecone",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Examples:
  Watch the default uploads/ folder:
    python watch.py

  Watch a custom folder:
    python watch.py --folder "./study_materials"

  Watch AND process files already in the folder:
    python watch.py --folder "./study_materials" --process-existing
        """
    )

    parser.add_argument(
        "--folder",
        type=str,
        default=config.UPLOAD_DIR,
        help=f"Folder to watch (default: {config.UPLOAD_DIR})"
    )
    parser.add_argument(
        "--process-existing",
        action="store_true",
        default=False,
        help="Also ingest files already in the folder that haven't been processed yet"
    )

    args = parser.parse_args()

    start_watching(
        watch_folder     = args.folder,
        process_existing = args.process_existing
    )