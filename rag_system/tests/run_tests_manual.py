# tests/run_tests_manual.py
# ----------------------------------------------------------
# Manual test runner — runs without pytest.
# Use this to quickly verify the system step by step.
#
# Usage:
#   python tests/run_tests_manual.py
#
# Set these env vars to skip slow tests:
#   SKIP_HEAVY_TESTS=1        → skip model download tests
#   SKIP_INTEGRATION_TESTS=1  → skip Pinecone / Groq API tests
# ----------------------------------------------------------

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

SKIP_HEAVY        = os.environ.get("SKIP_HEAVY_TESTS", "0")        == "1"
SKIP_INTEGRATION  = os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1"

PASS  = "\033[92m[PASS]\033[0m"
FAIL  = "\033[91m[FAIL]\033[0m"
SKIP  = "\033[93m[SKIP]\033[0m"
INFO  = "\033[94m[INFO]\033[0m"

results = {"pass": 0, "fail": 0, "skip": 0}


def run_test(name, fn):
    try:
        fn()
        results["pass"] += 1
    except Exception as e:
        print(f"{FAIL} {name}: {e}")
        results["fail"] += 1


def skip_test(name, reason):
    print(f"{SKIP} {name}: {reason}")
    results["skip"] += 1


# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  RAG System — Manual Test Runner")
print("="*60)

# ── TEST 1: Config ────────────────────────────────────────────
print(f"\n{INFO} ── Config Tests ──")

def check_config():
    import config
    assert config.CHUNK_SIZE > 0
    assert config.CHUNK_OVERLAP >= 0
    assert config.EMBEDDING_DIMENSION > 0
    assert config.TOP_K_RESULTS > 0
    print(f"{PASS} Config loaded: chunk_size={config.CHUNK_SIZE}, "
          f"overlap={config.CHUNK_OVERLAP}, top_k={config.TOP_K_RESULTS}")

run_test("Config loads correctly", check_config)


# ── TEST 2: Text Chunker ──────────────────────────────────────
print(f"\n{INFO} ── Chunker Tests ──")

def check_short_text():
    from document_processor.chunker import split_text_into_chunks
    chunks = split_text_into_chunks("Hello world this is a test.", chunk_size=512, chunk_overlap=50)
    assert len(chunks) == 1
    print(f"{PASS} Short text → 1 chunk")

def check_long_text():
    from document_processor.chunker import split_text_into_chunks
    words  = " ".join([f"w{i}" for i in range(600)])
    chunks = split_text_into_chunks(words, chunk_size=100, chunk_overlap=10)
    assert len(chunks) > 1
    print(f"{PASS} Long text (600 words) → {len(chunks)} chunks")

def check_chunk_ids():
    from document_processor.extractor import PageContent
    from document_processor.chunker   import create_chunks_from_pages
    pages  = [PageContent("test.pdf", 3, "word " * 300)]
    chunks = create_chunks_from_pages(pages, chunk_size=100, chunk_overlap=10)
    assert all(c.chunk_id.startswith("test.pdf::page3::chunk") for c in chunks)
    assert all(c.page_number == 3 for c in chunks)
    print(f"{PASS} Chunk IDs correct: e.g. '{chunks[0].chunk_id}'")

def check_sequential_indexes():
    from document_processor.extractor import PageContent
    from document_processor.chunker   import create_chunks_from_pages
    pages  = [PageContent("seq.pdf", 1, "word " * 500)]
    chunks = create_chunks_from_pages(pages, chunk_size=100, chunk_overlap=10)
    for i, c in enumerate(chunks):
        assert c.chunk_index == i, f"Expected {i} got {c.chunk_index}"
    print(f"{PASS} chunk_index is sequential (0–{len(chunks)-1})")

run_test("Short text → 1 chunk",           check_short_text)
run_test("Long text → multiple chunks",    check_long_text)
run_test("Chunk IDs have correct format",  check_chunk_ids)
run_test("Chunk index is sequential",      check_sequential_indexes)


# ── TEST 3: Extractor file-type check ─────────────────────────
print(f"\n{INFO} ── Extractor Tests ──")

def check_unsupported_format():
    import tempfile, os
    from document_processor.extractor import extract_document
    with tempfile.NamedTemporaryFile(suffix=".xyz", delete=False) as f:
        f.write(b"content")
        name = f.name
    try:
        extract_document(name)
        assert False, "Should have raised ValueError"
    except ValueError:
        print(f"{PASS} Extractor rejects unsupported format (.xyz)")
    finally:
        os.unlink(name)

def check_missing_file():
    from document_processor.extractor import extract_document
    try:
        extract_document("/tmp/nonexistent_99999.pdf")
        assert False, "Should have raised FileNotFoundError"
    except FileNotFoundError:
        print(f"{PASS} Extractor raises FileNotFoundError for missing file")

run_test("Extractor rejects .xyz format",     check_unsupported_format)
run_test("Extractor raises on missing file",  check_missing_file)


# ── TEST 4: Context formatter ─────────────────────────────────
print(f"\n{INFO} ── Retriever / Context Formatter Tests ──")

def check_context_format():
    from retriever.retriever import format_context_for_llm
    chunks = [
        {"chunk_id": "a.pdf::page1::chunk0", "source_file": "a.pdf",
         "page_number": 1, "chunk_index": 0, "score": 0.9,
         "text": "Neural networks are powerful."}
    ]
    ctx = format_context_for_llm(chunks)
    assert "a.pdf"             in ctx
    assert "Page: 1"           in ctx
    assert "Chunk: 0"          in ctx
    assert "Neural networks"   in ctx
    print(f"{PASS} Context formatter includes file, page, chunk, and text")

def check_empty_context():
    from retriever.retriever import format_context_for_llm
    ctx = format_context_for_llm([])
    assert "No relevant content" in ctx
    print(f"{PASS} Empty chunk list → 'No relevant content' message")

run_test("Context formatter works",            check_context_format)
run_test("Context formatter handles empty",    check_empty_context)


# ── TEST 5: Heavy model tests ─────────────────────────────────
print(f"\n{INFO} ── Embedding Model Tests ──")

if SKIP_HEAVY:
    skip_test("Embedding dimension check",    "SKIP_HEAVY_TESTS=1")
    skip_test("Embedding is normalized",      "SKIP_HEAVY_TESTS=1")
    skip_test("Batch vs single consistency",  "SKIP_HEAVY_TESTS=1")
else:
    def check_embed_dimension():
        import config
        from embedder.embedding_model import embed_single_text
        vec = embed_single_text("Test sentence")
        assert len(vec) == config.EMBEDDING_DIMENSION, \
            f"Expected {config.EMBEDDING_DIMENSION}, got {len(vec)}"
        print(f"{PASS} Embedding dimension = {len(vec)}")

    def check_normalized():
        import math
        from embedder.embedding_model import embed_single_text
        vec = embed_single_text("Gradient descent explanation")
        mag = math.sqrt(sum(v**2 for v in vec))
        assert abs(mag - 1.0) < 0.01, f"Magnitude = {mag:.4f}, expected ~1.0"
        print(f"{PASS} Embedding is L2-normalized (magnitude={mag:.4f})")

    def check_batch_vs_single():
        from embedder.embedding_model import embed_single_text, embed_texts
        text = "Attention mechanism in transformers"
        s    = embed_single_text(text)
        b    = embed_texts([text])[0]
        dot  = sum(a*b for a, b in zip(s, b))
        assert dot > 0.999, f"Cosine similarity = {dot:.4f}"
        print(f"{PASS} Single and batch embeddings match (cosine={dot:.4f})")

    run_test("Embedding dimension correct", check_embed_dimension)
    run_test("Embedding is normalized",     check_normalized)
    run_test("Batch vs single match",       check_batch_vs_single)


# ── TEST 6: Integration tests ─────────────────────────────────
print(f"\n{INFO} ── Integration Tests (Pinecone + Groq) ──")

if SKIP_INTEGRATION:
    skip_test("Pinecone connection",  "SKIP_INTEGRATION_TESTS=1")
    skip_test("Groq LLM answer",      "SKIP_INTEGRATION_TESTS=1")
    skip_test("Full pipeline",        "SKIP_INTEGRATION_TESTS=1")
else:
    def check_pinecone():
        from vector_store.pinecone_store import get_index_stats
        stats = get_index_stats()
        assert "total_vectors" in stats
        print(f"{PASS} Pinecone connected. Vectors in index: {stats['total_vectors']}")

    def check_groq():
        import config
        if not config.GROQ_API_KEY:
            print(f"{SKIP} Groq API key not set")
            return
        from llm.groq_llm import generate_answer
        result = generate_answer(
            question = "What is supervised learning?",
            context  = (
                "--- Source: notes.pdf | Page: 1 | Chunk: 0 ---\n"
                "Supervised learning trains a model on labeled examples."
            ),
            retrieved_chunks = [{
                "chunk_id": "notes.pdf::page1::chunk0",
                "source_file": "notes.pdf", "page_number": 1,
                "chunk_index": 0, "score": 0.95,
                "text": "Supervised learning trains a model on labeled examples."
            }]
        )
        assert len(result["answer"]) > 10
        print(f"{PASS} Groq LLM answer ({len(result['answer'])} chars): "
              f"{result['answer'][:80]}...")

    run_test("Pinecone connection",  check_pinecone)
    run_test("Groq LLM answer",      check_groq)


# ── Summary ───────────────────────────────────────────────────
print("\n" + "="*60)
print(f"  Results: {results['pass']} passed | "
      f"{results['fail']} failed | "
      f"{results['skip']} skipped")
print("="*60 + "\n")

if results["fail"] > 0:
    sys.exit(1)   # Non-zero exit code signals failure to CI systems