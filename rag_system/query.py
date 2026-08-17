# query.py
# ----------------------------------------------------------
# Ask questions directly in the terminal.
# No server needed — runs standalone.
#
# Usage:
#   Single question:
#       python query.py --ask "What is Artificial Intelligence?"
#
#   Interactive chat mode (keep asking questions):
#       python query.py --chat
#
#   Filter answers to one specific file:
#       python query.py --ask "What is AI?" --file "Artificial Intelligence.pdf"
#
#   Control how many chunks to retrieve:
#       python query.py --ask "Explain neural networks" --top-k 8
# ----------------------------------------------------------

import os
import sys
import argparse

# Make sure the project root is on the Python path
sys.path.insert(0, os.path.dirname(__file__))

import config
from retriever.retriever    import retrieve_relevant_chunks, format_context_for_llm
from llm.groq_llm           import generate_answer


# ─────────────────────────────────────────────────────────
# CORE: ask one question and print the answer
# ─────────────────────────────────────────────────────────
def ask(question: str, top_k: int = None, source_file_filter: str = None):
    """
    Retrieve relevant chunks from Pinecone and generate an answer
    using Mistral 70B via Groq. Prints everything to the terminal.

    Args:
        question           : the question to ask
        top_k              : number of chunks to retrieve (default from config)
        source_file_filter : restrict search to one specific file (optional)
    """
    if top_k is None:
        top_k = config.TOP_K_RESULTS

    print(f"\n{'='*60}")
    print(f"  Question: {question}")
    print(f"{'='*60}")

    # ── Step 1: Retrieve relevant chunks from Pinecone ────
    print(f"\n  Searching knowledge base (top {top_k} chunks)...")

    chunks = retrieve_relevant_chunks(
        query              = question,
        top_k              = top_k,
        source_file_filter = source_file_filter
    )

    if not chunks:
        print("\n  [!] No relevant content found in the knowledge base.")
        print("      Make sure you have run:  python ingest.py --file <your_document>")
        return

    # ── Step 2: Show which sources were found ─────────────
    print(f"\n  Found {len(chunks)} relevant chunk(s):\n")
    for i, chunk in enumerate(chunks):
        print(f"    [{i+1}] {chunk['source_file']}  |  "
              f"Page {chunk['page_number']}  |  "
              f"Chunk {chunk['chunk_index']}  |  "
              f"Score: {chunk['score']:.4f}")

    # ── Step 3: Format context for the LLM ────────────────
    context = format_context_for_llm(chunks)

    # ── Step 4: Generate answer with Mistral 70B ──────────
    print(f"\n  Generating answer with {config.LLM_MODEL_NAME}...")

    result = generate_answer(
        question        = question,
        context         = context,
        retrieved_chunks = chunks
    )

    # ── Step 5: Print the answer ───────────────────────────
    print(f"\n{'='*60}")
    print(f"  ANSWER")
    print(f"{'='*60}\n")
    print(result["answer"])

    # ── Step 6: Print source references ───────────────────
    print(f"\n{'─'*60}")
    print(f"  Sources used:")
    for src in result["sources"]:
        print(f"    • {src['source_file']}  |  "
              f"Page {src['page_number']}  |  "
              f"Chunk ID: {src['chunk_id']}  |  "
              f"Relevance: {src['relevance_score']:.4f}")
    print(f"{'─'*60}\n")


# ─────────────────────────────────────────────────────────
# INTERACTIVE CHAT MODE
# ─────────────────────────────────────────────────────────
def chat_mode(top_k: int = None, source_file_filter: str = None):
    """
    Keep asking questions in a loop until the user types 'exit' or 'quit'.
    """
    print(f"\n{'='*60}")
    print(f"  RAG Study Assistant — Interactive Mode")
    print(f"  Model     : {config.LLM_MODEL_NAME}")
    print(f"  Embed     : {config.EMBEDDING_MODEL_NAME}")
    if source_file_filter:
        print(f"  Filter    : {source_file_filter}")
    print(f"  Type 'exit' or 'quit' to stop.")
    print(f"{'='*60}")

    while True:
        try:
            # Get question from user
            print()
            question = input("  Your question: ").strip()

            # Exit conditions
            if question.lower() in ("exit", "quit", "q", "bye"):
                print("\n  Goodbye!\n")
                break

            # Skip empty input
            if not question:
                print("  [!] Please type a question.")
                continue

            # Ask and print the answer
            ask(
                question           = question,
                top_k              = top_k,
                source_file_filter = source_file_filter
            )

        except KeyboardInterrupt:
            # Handle Ctrl+C gracefully
            print("\n\n  Stopped. Goodbye!\n")
            break


# ─────────────────────────────────────────────────────────
# CLI ARGUMENT PARSER
# ─────────────────────────────────────────────────────────
def build_parser():
    parser = argparse.ArgumentParser(
        description="RAG Study Assistant — Ask questions from the terminal",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Examples:
  Ask a single question:
    python query.py --ask "What is Artificial Intelligence?"

  Interactive mode (keep asking):
    python query.py --chat

  Filter to one specific document:
    python query.py --ask "Explain deep learning" --file "Artificial Intelligence.pdf"

  Retrieve more context chunks:
    python query.py --ask "What are neural networks?" --top-k 8

  Interactive mode with file filter:
    python query.py --chat --file "Artificial Intelligence.pdf"
        """
    )

    parser.add_argument(
        "--ask",
        type=str,
        help="Ask a single question and get an answer"
    )
    parser.add_argument(
        "--chat",
        action="store_true",
        help="Start interactive chat mode — keep asking questions"
    )
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Only search within this specific document (e.g. 'Artificial Intelligence.pdf')"
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=None,
        help=f"Number of chunks to retrieve (default: {config.TOP_K_RESULTS})"
    )

    return parser


# ─────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Validate API keys before doing anything
    try:
        config.validate_config()
    except EnvironmentError as e:
        print(f"\n[ERROR] {e}\n")
        sys.exit(1)

    parser = build_parser()
    args   = parser.parse_args()

    # If no arguments, start chat mode by default
    if not args.ask and not args.chat:
        print("\n  No arguments given — starting interactive chat mode.")
        print("  (Run  python query.py --help  to see all options)\n")
        chat_mode()
        sys.exit(0)

    # Single question mode
    if args.ask:
        ask(
            question           = args.ask,
            top_k              = args.top_k,
            source_file_filter = args.file
        )

    # Interactive chat mode
    elif args.chat:
        chat_mode(
            top_k              = args.top_k,
            source_file_filter = args.file
        )