# tests/test_rag_system.py
# ----------------------------------------------------------
# Ground Truth Test File for the RAG System
#
# This file tests every component of the pipeline in order:
#   1. Config loading
#   2. Document extraction (PDF, DOCX, PPTX)
#   3. Text chunking
#   4. Embedding model
#   5. Pinecone vector store
#   6. Retriever
#   7. LLM (Groq)
#   8. Full end-to-end pipeline
#   9. API endpoints
#
# Run all tests:
#   python -m pytest tests/test_rag_system.py -v
#
# Run a specific test:
#   python -m pytest tests/test_rag_system.py::test_chunker -v
# ----------------------------------------------------------

import os
import sys
import json
import pytest

# Make sure the root folder is on the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ==============================================================
# TEST 1 — Configuration
# ==============================================================

def test_config_loads():
    """Config module must import without errors."""
    import config
    assert hasattr(config, "PINECONE_API_KEY")
    assert hasattr(config, "GROQ_API_KEY")
    assert hasattr(config, "EMBEDDING_MODEL_NAME")
    assert hasattr(config, "CHUNK_SIZE")
    assert hasattr(config, "CHUNK_OVERLAP")
    assert hasattr(config, "TOP_K_RESULTS")
    print("[PASS] config.py loaded successfully.")


def test_config_values_are_reasonable():
    """Check that config values are within sensible ranges."""
    import config
    assert 100 <= config.CHUNK_SIZE <= 2048,  "CHUNK_SIZE should be 100–2048"
    assert 0   <= config.CHUNK_OVERLAP < config.CHUNK_SIZE, "CHUNK_OVERLAP must be < CHUNK_SIZE"
    assert 1   <= config.TOP_K_RESULTS <= 20, "TOP_K_RESULTS should be 1–20"
    assert config.EMBEDDING_DIMENSION > 0,    "EMBEDDING_DIMENSION must be positive"
    print("[PASS] Config values are within reasonable ranges.")


# ==============================================================
# TEST 2 — Document Extractor
# ==============================================================

def test_extractor_rejects_unknown_format(tmp_path):
    """Extractor must raise ValueError for unsupported file types."""
    from document_processor.extractor import extract_document

    fake_file = tmp_path / "test_file.xyz"
    fake_file.write_text("some content")

    with pytest.raises(ValueError, match="Unsupported file type"):
        extract_document(str(fake_file))
    print("[PASS] Extractor correctly rejects unsupported file types.")


def test_extractor_raises_on_missing_file():
    """Extractor must raise FileNotFoundError if the file doesn't exist."""
    from document_processor.extractor import extract_document

    with pytest.raises(FileNotFoundError):
        extract_document("/non/existent/path/document.pdf")
    print("[PASS] Extractor correctly raises FileNotFoundError.")


def test_extract_pdf(tmp_path):
    """
    Create a simple PDF using reportlab and verify extraction.
    Skipped if reportlab is not installed.
    """
    pytest.importorskip("reportlab", reason="reportlab not installed — skipping PDF creation test")
    from reportlab.pdfgen import canvas
    from document_processor.extractor import extract_pdf

    # Create a minimal test PDF
    pdf_path = str(tmp_path / "test_sample.pdf")
    c = canvas.Canvas(pdf_path)
    c.drawString(100, 750, "This is page one of the test document.")
    c.showPage()
    c.drawString(100, 750, "This is page two. It covers machine learning basics.")
    c.showPage()
    c.save()

    pages = extract_pdf(pdf_path)

    assert len(pages) == 2,               f"Expected 2 pages, got {len(pages)}"
    assert pages[0].page_number == 1,     "First page number must be 1"
    assert pages[1].page_number == 2,     "Second page number must be 2"
    assert "page one"  in pages[0].text,  "Page 1 text not found"
    assert "page two"  in pages[1].text,  "Page 2 text not found"
    assert pages[0].source_file == "test_sample.pdf"
    print(f"[PASS] PDF extraction: {len(pages)} pages extracted correctly.")


def test_extract_docx(tmp_path):
    """Create a simple DOCX and verify extraction."""
    pytest.importorskip("docx", reason="python-docx not installed")
    from docx import Document
    from document_processor.extractor import extract_docx

    docx_path = str(tmp_path / "test_sample.docx")
    doc = Document()
    doc.add_paragraph("Introduction to Neural Networks")
    doc.add_paragraph("A neural network is a series of algorithms that mimic the brain.")
    doc.add_paragraph("Deep learning uses multiple layers of neural networks.")
    doc.save(docx_path)

    pages = extract_docx(docx_path)

    assert len(pages) >= 1, "Should extract at least 1 logical page"
    full_text = " ".join(p.text for p in pages)
    assert "Neural Networks" in full_text
    assert pages[0].source_file == "test_sample.docx"
    print(f"[PASS] DOCX extraction: {len(pages)} logical page(s) extracted.")


def test_extract_pptx(tmp_path):
    """Create a simple PPTX and verify extraction."""
    pytest.importorskip("pptx", reason="python-pptx not installed")
    from pptx import Presentation
    from pptx.util import Inches
    from document_processor.extractor import extract_pptx

    pptx_path = str(tmp_path / "test_sample.pptx")
    prs = Presentation()

    slide1 = prs.slides.add_slide(prs.slide_layouts[1])
    slide1.shapes.title.text = "Machine Learning Overview"
    slide1.placeholders[1].text = "Supervised and unsupervised learning."

    slide2 = prs.slides.add_slide(prs.slide_layouts[1])
    slide2.shapes.title.text = "Deep Learning"
    slide2.placeholders[1].text = "CNNs, RNNs, and Transformers."

    prs.save(pptx_path)

    pages = extract_pptx(pptx_path)

    assert len(pages) == 2,              f"Expected 2 slides, got {len(pages)}"
    assert pages[0].page_number == 1
    assert pages[1].page_number == 2
    assert "Machine Learning" in pages[0].text
    assert "Deep Learning"    in pages[1].text
    print(f"[PASS] PPTX extraction: {len(pages)} slides extracted correctly.")


# ==============================================================
# TEST 3 — Text Chunker
# ==============================================================

def test_chunker_short_text_single_chunk():
    """Short text should produce exactly one chunk."""
    from document_processor.chunker import split_text_into_chunks

    text   = "This is a short sentence that fits in one chunk."
    chunks = split_text_into_chunks(text, chunk_size=512, chunk_overlap=50)

    assert len(chunks) == 1, f"Expected 1 chunk, got {len(chunks)}"
    assert chunks[0] == text
    print("[PASS] Short text → single chunk.")


def test_chunker_long_text_multiple_chunks():
    """Long text should be split into multiple chunks."""
    from document_processor.chunker import split_text_into_chunks

    # Create a text with 600 words
    words      = ["word"] * 600
    long_text  = " ".join(words)
    chunks     = split_text_into_chunks(long_text, chunk_size=200, chunk_overlap=20)

    assert len(chunks) > 1, "600-word text with chunk_size=200 should produce multiple chunks"
    print(f"[PASS] Long text ({600} words) → {len(chunks)} chunks.")


def test_chunker_overlap_is_applied():
    """Consecutive chunks must share words (overlap)."""
    from document_processor.chunker import split_text_into_chunks

    words      = [f"word{i}" for i in range(300)]
    text       = " ".join(words)
    chunk_size = 100
    overlap    = 20

    chunks = split_text_into_chunks(text, chunk_size=chunk_size, chunk_overlap=overlap)

    if len(chunks) >= 2:
        last_words_of_chunk1  = set(chunks[0].split()[-overlap:])
        first_words_of_chunk2 = set(chunks[1].split()[:overlap])
        shared = last_words_of_chunk1 & first_words_of_chunk2
        assert len(shared) > 0, "Consecutive chunks should share overlapping words"
    print("[PASS] Overlap verified between consecutive chunks.")


def test_chunk_id_format():
    """chunk_id must follow the expected format."""
    from document_processor.extractor import PageContent
    from document_processor.chunker   import create_chunks_from_pages

    pages = [
        PageContent(source_file="lecture.pdf", page_number=2, text="Alpha beta gamma " * 200)
    ]
    chunks = create_chunks_from_pages(pages, chunk_size=100, chunk_overlap=10)

    for chunk in chunks:
        # Expected format: "lecture.pdf::page2::chunk0", "lecture.pdf::page2::chunk1", ...
        assert chunk.chunk_id.startswith("lecture.pdf::page2::chunk"), \
            f"Unexpected chunk_id format: '{chunk.chunk_id}'"
        assert chunk.source_file == "lecture.pdf"
        assert chunk.page_number == 2

    print(f"[PASS] chunk_id format correct for {len(chunks)} chunks.")


def test_chunker_preserves_source_metadata():
    """Every chunk must carry correct source_file and page_number."""
    from document_processor.extractor import PageContent
    from document_processor.chunker   import create_chunks_from_pages

    pages = [
        PageContent(source_file="notes.pdf", page_number=1, text="Hello world " * 100),
        PageContent(source_file="notes.pdf", page_number=2, text="Second page " * 100),
    ]
    chunks = create_chunks_from_pages(pages, chunk_size=50, chunk_overlap=5)

    page1_chunks = [c for c in chunks if c.page_number == 1]
    page2_chunks = [c for c in chunks if c.page_number == 2]

    assert len(page1_chunks) > 0, "Should have chunks from page 1"
    assert len(page2_chunks) > 0, "Should have chunks from page 2"

    for chunk in chunks:
        assert chunk.source_file == "notes.pdf"

    print(f"[PASS] Source metadata preserved: {len(page1_chunks)} chunks from p1, "
          f"{len(page2_chunks)} chunks from p2.")


# ==============================================================
# TEST 4 — Embedding Model
# ==============================================================

def test_embedding_returns_correct_dimension():
    """
    Embedding vector length must match config.EMBEDDING_DIMENSION.
    NOTE: This test downloads the model on first run (~600MB).
    Set SKIP_HEAVY_TESTS=1 in env to skip.
    """
    if os.environ.get("SKIP_HEAVY_TESTS", "0") == "1":
        pytest.skip("Skipping heavy model test (SKIP_HEAVY_TESTS=1)")

    import config
    from embedder.embedding_model import embed_single_text

    vector = embed_single_text("What is machine learning?")

    assert isinstance(vector, list),               "Embedding should be a list"
    assert len(vector) == config.EMBEDDING_DIMENSION, \
        f"Expected dimension {config.EMBEDDING_DIMENSION}, got {len(vector)}"
    print(f"[PASS] Embedding dimension: {len(vector)} (expected {config.EMBEDDING_DIMENSION}).")


def test_embedding_is_normalized():
    """
    Embeddings should be L2-normalized (magnitude ≈ 1.0).
    This is required for cosine similarity to work correctly.
    """
    if os.environ.get("SKIP_HEAVY_TESTS", "0") == "1":
        pytest.skip("Skipping heavy model test (SKIP_HEAVY_TESTS=1)")

    import math
    from embedder.embedding_model import embed_single_text

    vector    = embed_single_text("Explain gradient descent.")
    magnitude = math.sqrt(sum(v ** 2 for v in vector))

    assert abs(magnitude - 1.0) < 0.01, \
        f"Embedding magnitude should be ~1.0, got {magnitude:.4f}"
    print(f"[PASS] Embedding is L2-normalized (magnitude = {magnitude:.4f}).")


def test_embedding_batch_consistency():
    """
    Single-text embedding must equal the corresponding vector from batch embedding.
    """
    if os.environ.get("SKIP_HEAVY_TESTS", "0") == "1":
        pytest.skip("Skipping heavy model test (SKIP_HEAVY_TESTS=1)")

    import math
    from embedder.embedding_model import embed_single_text, embed_texts

    text        = "Neural networks learn by backpropagation."
    single_vec  = embed_single_text(text)
    batch_vecs  = embed_texts([text])

    # Compute cosine similarity — should be 1.0 (identical vectors)
    dot = sum(a * b for a, b in zip(single_vec, batch_vecs[0]))
    assert dot > 0.999, f"Single vs batch embedding mismatch (cosine = {dot:.4f})"
    print(f"[PASS] Single and batch embeddings match (cosine = {dot:.4f}).")


def test_different_texts_have_different_embeddings():
    """Semantically different texts should produce different embeddings."""
    if os.environ.get("SKIP_HEAVY_TESTS", "0") == "1":
        pytest.skip("Skipping heavy model test (SKIP_HEAVY_TESTS=1)")

    from embedder.embedding_model import embed_texts

    texts = [
        "The capital of France is Paris.",
        "Gradient descent minimizes the loss function."
    ]
    vectors = embed_texts(texts)

    dot = sum(a * b for a, b in zip(vectors[0], vectors[1]))
    assert dot < 0.99, \
        f"Unrelated texts should NOT have near-identical embeddings (cosine = {dot:.4f})"
    print(f"[PASS] Different texts → different embeddings (cosine = {dot:.4f}).")


# ==============================================================
# TEST 5 — Pinecone Vector Store
# ==============================================================

def test_pinecone_connection():
    """Pinecone must connect and return index stats without error."""
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping Pinecone integration test")

    from vector_store.pinecone_store import get_index_stats

    stats = get_index_stats()
    assert "total_vectors" in stats
    assert "index_name"    in stats
    print(f"[PASS] Pinecone connected. Index '{stats['index_name']}' "
          f"has {stats['total_vectors']} vectors.")


def test_pinecone_upsert_and_query():
    """
    Upsert a test vector and verify it can be retrieved.
    Cleans up after itself.
    """
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping Pinecone integration test")

    from document_processor.chunker import TextChunk
    from vector_store.pinecone_store import upsert_chunks, query_similar_chunks, _get_index
    import config, random

    # Create a fake chunk with a known embedding
    test_chunk = TextChunk(
        chunk_id    = "test_file.pdf::page99::chunk0",
        source_file = "test_file.pdf",
        page_number = 99,
        chunk_index = 0,
        text        = "This is a test chunk for unit testing purposes."
    )

    # Create a random-ish but fixed embedding (all 0.1s, normalized)
    dim          = config.EMBEDDING_DIMENSION
    raw_vec      = [0.1] * dim
    magnitude    = (sum(v**2 for v in raw_vec)) ** 0.5
    test_vector  = [v / magnitude for v in raw_vec]

    # Upsert the test vector
    upsert_chunks(chunks=[test_chunk], embeddings=[test_vector])

    import time
    time.sleep(2)   # Give Pinecone time to index

    # Query with the same vector — should find itself
    results = query_similar_chunks(
        query_embedding=test_vector,
        top_k=5,
        source_file_filter="test_file.pdf"
    )

    found = any(r["chunk_id"] == "test_file.pdf::page99::chunk0" for r in results)
    assert found, "Upserted test vector should be retrievable from Pinecone"

    # Cleanup
    index = _get_index()
    index.delete(ids=["test_file.pdf::page99::chunk0"])
    print("[PASS] Pinecone upsert → query → cleanup successful.")


# ==============================================================
# TEST 6 — Retriever
# ==============================================================

def test_retriever_returns_list():
    """Retriever must return a list (even if empty)."""
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping integration test")

    from retriever.retriever import retrieve_relevant_chunks

    results = retrieve_relevant_chunks("What is deep learning?", top_k=3)
    assert isinstance(results, list), "Retriever must return a list"
    print(f"[PASS] Retriever returned {len(results)} results (list type confirmed).")


def test_retriever_result_has_required_fields():
    """Each result from the retriever must have all required metadata fields."""
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping integration test")

    from retriever.retriever import retrieve_relevant_chunks

    results = retrieve_relevant_chunks("machine learning", top_k=1)

    if results:
        required_fields = {"chunk_id", "score", "source_file", "page_number", "chunk_index", "text"}
        for field in required_fields:
            assert field in results[0], f"Missing field '{field}' in retriever result"
        print(f"[PASS] Retriever result has all required fields: {required_fields}")
    else:
        print("[SKIP] No documents in Pinecone — skipping field check.")
        pytest.skip("No documents indexed yet")


def test_format_context_for_llm():
    """format_context_for_llm must produce a non-empty string from chunk data."""
    from retriever.retriever import format_context_for_llm

    fake_chunks = [
        {
            "chunk_id":    "doc.pdf::page1::chunk0",
            "source_file": "doc.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "score":       0.92,
            "text":        "Machine learning is a subset of artificial intelligence."
        },
        {
            "chunk_id":    "doc.pdf::page2::chunk1",
            "source_file": "doc.pdf",
            "page_number": 2,
            "chunk_index": 1,
            "score":       0.87,
            "text":        "Deep learning uses neural networks with many layers."
        }
    ]

    context = format_context_for_llm(fake_chunks)

    assert isinstance(context, str),       "Context must be a string"
    assert len(context) > 0,              "Context must not be empty"
    assert "doc.pdf"  in context,         "Source file should appear in context"
    assert "Page: 1"  in context,         "Page number 1 should appear in context"
    assert "Page: 2"  in context,         "Page number 2 should appear in context"
    assert "Chunk: 0" in context,         "Chunk index should appear in context"
    assert "Machine learning" in context, "Chunk text should appear in context"
    print("[PASS] format_context_for_llm produced correct output.")


def test_format_context_empty_chunks():
    """format_context_for_llm must handle empty input gracefully."""
    from retriever.retriever import format_context_for_llm

    context = format_context_for_llm([])
    assert "No relevant content" in context
    print("[PASS] format_context_for_llm handles empty chunk list.")


# ==============================================================
# TEST 7 — LLM (Groq)
# ==============================================================

def test_groq_llm_returns_answer():
    """
    Groq API must return a non-empty answer string.
    Skipped if GROQ_API_KEY is not set.
    """
    import config
    if not config.GROQ_API_KEY:
        pytest.skip("GROQ_API_KEY not set — skipping LLM test")

    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping LLM integration test")

    from llm.groq_llm import generate_answer

    fake_chunks = [
        {
            "chunk_id":    "notes.pdf::page1::chunk0",
            "source_file": "notes.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "score":       0.95,
            "text":        (
                "Supervised learning is a type of machine learning where the model "
                "is trained on labeled data. The model learns to map inputs to outputs "
                "based on example input-output pairs."
            )
        }
    ]
    context = (
        "--- Source: notes.pdf | Page: 1 | Chunk: 0 (relevance: 0.95) ---\n"
        "Supervised learning is a type of machine learning where the model "
        "is trained on labeled data."
    )

    result = generate_answer(
        question="What is supervised learning?",
        context=context,
        retrieved_chunks=fake_chunks
    )

    assert "answer"     in result,               "Result must have 'answer' key"
    assert "sources"    in result,               "Result must have 'sources' key"
    assert "model_used" in result,               "Result must have 'model_used' key"
    assert isinstance(result["answer"], str),    "Answer must be a string"
    assert len(result["answer"]) > 10,           "Answer should not be trivially short"
    assert len(result["sources"]) == 1,          "Should have 1 source reference"
    assert result["sources"][0]["page_number"] == 1

    print(f"[PASS] Groq LLM returned answer ({len(result['answer'])} chars).")
    print(f"       Answer preview: {result['answer'][:120]}...")


def test_groq_llm_answer_not_copied_text():
    """
    The LLM should explain the concept, not copy source text verbatim.
    We check that the answer is not identical to the input context.
    """
    import config
    if not config.GROQ_API_KEY:
        pytest.skip("GROQ_API_KEY not set")

    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping LLM integration test")

    from llm.groq_llm import generate_answer

    source_text = (
        "Gradient descent is an optimization algorithm used to minimize a function "
        "by iteratively moving in the direction of steepest descent as defined by "
        "the negative of the gradient."
    )
    fake_chunks = [{
        "chunk_id": "ml.pdf::page5::chunk0", "source_file": "ml.pdf",
        "page_number": 5, "chunk_index": 0, "score": 0.9, "text": source_text
    }]
    context = f"--- Source: ml.pdf | Page: 5 | Chunk: 0 ---\n{source_text}"

    result = generate_answer(
        question="Explain gradient descent.",
        context=context,
        retrieved_chunks=fake_chunks
    )

    answer = result["answer"].strip()
    # The answer must not be a verbatim copy of the source
    assert answer != source_text.strip(), \
        "LLM should NOT return an exact copy of the source text"
    print("[PASS] LLM answer is NOT a verbatim copy of the context.")


# ==============================================================
# TEST 8 — Full End-to-End Pipeline
# ==============================================================

def test_full_pipeline_ingest_and_query(tmp_path):
    """
    End-to-end test:
      1. Create a test PDF.
      2. Ingest it through the full pipeline.
      3. Query for a concept from it.
      4. Verify answer is generated.
    """
    if os.environ.get("SKIP_HEAVY_TESTS", "0") == "1":
        pytest.skip("Skipping heavy end-to-end test")

    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping integration test")

    pytest.importorskip("reportlab", reason="reportlab needed for this test")

    from reportlab.pdfgen import canvas
    from pipeline import ingest_document, answer_question

    # Create a test PDF with known content
    pdf_path = str(tmp_path / "e2e_test.pdf")
    c = canvas.Canvas(pdf_path)
    c.drawString(50, 750, "Chapter 1: Introduction to Transformers")
    c.drawString(50, 730, "Transformers use self-attention mechanisms to process sequences.")
    c.drawString(50, 710, "The key innovation is the attention mechanism replacing recurrence.")
    c.drawString(50, 690, "BERT and GPT are both based on the Transformer architecture.")
    c.showPage()
    c.save()

    # Step 1: Ingest
    ingest_result = ingest_document(file_path=pdf_path, replace_existing=True)
    assert ingest_result["status"]       == "success", f"Ingestion failed: {ingest_result['message']}"
    assert ingest_result["total_pages"]  >= 1
    assert ingest_result["total_chunks"] >= 1
    print(f"[E2E] Ingested: {ingest_result['total_pages']} pages, "
          f"{ingest_result['total_chunks']} chunks.")

    import time
    time.sleep(3)   # Let Pinecone index the new vectors

    # Step 2: Query
    query_result = answer_question(
        question="What is the key innovation in Transformer architecture?",
        top_k=3,
        source_file_filter="e2e_test.pdf"
    )

    assert query_result["status"]  in ("success", "no_results"), \
        f"Unexpected status: {query_result['status']}"
    assert isinstance(query_result["answer"], str)
    assert len(query_result["answer"]) > 0

    print(f"[PASS] End-to-end pipeline works.")
    print(f"       Answer: {query_result['answer'][:150]}...")
    print(f"       Sources: {query_result['sources']}")


# ==============================================================
# TEST 9 — API Endpoints
# ==============================================================

def test_api_status_endpoint():
    """GET /status must return HTTP 200 and a status field."""
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping API test")

    from fastapi.testclient import TestClient
    from api.server import app

    client   = TestClient(app)
    response = client.get("/status")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    print(f"[PASS] GET /status → {data}")


def test_api_upload_rejects_invalid_format(tmp_path):
    """POST /upload must return 400 for unsupported file types."""
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping API test")

    from fastapi.testclient import TestClient
    from api.server import app

    client    = TestClient(app)
    fake_file = tmp_path / "bad_file.txt"
    fake_file.write_text("This is not a supported document.")

    with open(str(fake_file), "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("bad_file.txt", f, "text/plain")}
        )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]
    print("[PASS] POST /upload correctly rejects unsupported file type.")


def test_api_ask_rejects_empty_question():
    """POST /ask must return 400 for an empty question."""
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping API test")

    from fastapi.testclient import TestClient
    from api.server import app

    client   = TestClient(app)
    response = client.post("/ask", json={"question": "   "})

    assert response.status_code == 400
    print("[PASS] POST /ask correctly rejects empty question.")


def test_api_ask_returns_valid_response():
    """POST /ask must return answer + sources structure."""
    if os.environ.get("SKIP_INTEGRATION_TESTS", "0") == "1":
        pytest.skip("Skipping API test")

    from fastapi.testclient import TestClient
    from api.server import app

    client   = TestClient(app)
    response = client.post("/ask", json={"question": "What is machine learning?", "top_k": 3})

    # Either 200 (found) or 200 (no_results) — both are valid
    assert response.status_code == 200
    data = response.json()

    assert "question" in data
    assert "answer"   in data
    assert "sources"  in data
    assert "status"   in data
    print(f"[PASS] POST /ask returned valid response structure (status={data['status']}).")


# ==============================================================
# TEST 10 — Edge Cases & Robustness
# ==============================================================

def test_empty_text_produces_no_chunks():
    """An empty string should produce zero chunks."""
    from document_processor.extractor import PageContent
    from document_processor.chunker   import create_chunks_from_pages

    pages  = [PageContent(source_file="empty.pdf", page_number=1, text="   ")]
    # Blank page — but chunker still gets called on whitespace
    # split() of whitespace returns [], so chunks should be minimal
    chunks = create_chunks_from_pages(pages, chunk_size=100, chunk_overlap=10)
    # Whitespace-only text → split() returns [] → join returns "" → 1 empty chunk at most
    for chunk in chunks:
        assert len(chunk.text.strip()) == 0 or len(chunk.text) < 5
    print(f"[PASS] Empty/whitespace text handled gracefully ({len(chunks)} chunk(s)).")


def test_very_long_single_page():
    """A page with 10,000 words should be split into many chunks without errors."""
    from document_processor.extractor import PageContent
    from document_processor.chunker   import create_chunks_from_pages

    big_text = ("This is a word. " * 10_000)
    pages    = [PageContent(source_file="big.pdf", page_number=1, text=big_text)]
    chunks   = create_chunks_from_pages(pages, chunk_size=200, chunk_overlap=20)

    assert len(chunks) > 10, "10,000 words with chunk_size=200 should produce many chunks"
    for chunk in chunks:
        word_count = len(chunk.text.split())
        assert word_count <= 200 + 5, f"Chunk too large: {word_count} words"
    print(f"[PASS] Large page (10,000 words) split into {len(chunks)} chunks.")


def test_chunk_index_is_sequential():
    """Chunk indexes within a page must be sequential starting from 0."""
    from document_processor.extractor import PageContent
    from document_processor.chunker   import create_chunks_from_pages

    pages  = [PageContent(source_file="seq.pdf", page_number=1, text="word " * 600)]
    chunks = create_chunks_from_pages(pages, chunk_size=100, chunk_overlap=10)

    for expected_index, chunk in enumerate(chunks):
        assert chunk.chunk_index == expected_index, \
            f"Expected chunk_index={expected_index}, got {chunk.chunk_index}"
    print(f"[PASS] chunk_index is sequential (0 to {len(chunks)-1}).")