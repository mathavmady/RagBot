# config.py
# ----------------------------------------------------------
# Central configuration loader for the RAG system.
# Reads all settings from the .env file.
# ----------------------------------------------------------

import os

# dotenv is optional in some environments (e.g., deployment containers).
# Gracefully fall back if python-dotenv is not installed.
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    def load_dotenv(*args, **kwargs):
        return False

# Load the .env file into environment variables (no-op if dotenv missing)
load_dotenv(override=True)


# ── Pinecone ──────────────────────────────────────────────
PINECONE_API_KEY      = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME   = os.getenv("PINECONE_INDEX_NAME", "rag-system")
PINECONE_CLOUD        = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION       = os.getenv("PINECONE_REGION", "us-east-1")

# ── Groq / LLM ───────────────────────────────────────────
GROQ_API_KEY          = os.getenv("GROQ_API_KEY")
LLM_MODEL_NAME        = os.getenv("LLM_MODEL_NAME", "llama-3.1-8b-instant")   # Groq's Mistral-class model (70B quality)

# ── Embedding Model ───────────────────────────────────────
EMBEDDING_MODEL_NAME  = os.getenv("EMBEDDING_MODEL_NAME", "Qwen/Qwen3-Embedding-0.6B")
EMBEDDING_DIMENSION   = int(os.getenv("EMBEDDING_DIMENSION", "1024"))

# ── Chunking ─────────────────────────────────────────────
CHUNK_SIZE            = int(os.getenv("CHUNK_SIZE", "512"))
CHUNK_OVERLAP         = int(os.getenv("CHUNK_OVERLAP", "50"))

# ── Retrieval ─────────────────────────────────────────────
TOP_K_RESULTS         = int(os.getenv("TOP_K_RESULTS", "5"))

# ── API Server ────────────────────────────────────────────
API_HOST              = os.getenv("API_HOST", "0.0.0.0")
API_PORT              = int(os.getenv("API_PORT", "8000"))

# ── Upload folder ────────────────────────────────────────
UPLOAD_DIR            = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def validate_config():
    """
    Check that the required API keys are set before the app starts.
    Raises a clear error if something is missing.
    """
    missing = []
    if not PINECONE_API_KEY:
        missing.append("PINECONE_API_KEY")
    if not GROQ_API_KEY:
        missing.append("GROQ_API_KEY")

    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            f"Please copy .env.example to .env and fill in the values."
        )
    

print("Current Working Directory:", os.getcwd())
