# main.py
# ----------------------------------------------------------
# Entry point to start the RAG system API server.
# Run this file to launch the FastAPI server.
#
# Usage:
#   python main.py
#
# Then open your browser at:
#   http://localhost:8000/docs   ← interactive API docs
# ----------------------------------------------------------

import uvicorn
import config

if __name__ == "__main__":
    config.validate_config()   # Fail fast if API keys are missing

    print("\n" + "="*60)
    print("  RAG Study Assistant — Starting Server")
    print("="*60)
    print(f"  Embedding Model : {config.EMBEDDING_MODEL_NAME}")
    print(f"  LLM Model       : {config.LLM_MODEL_NAME}")
    print(f"  Pinecone Index  : {config.PINECONE_INDEX_NAME}")
    print(f"  Server URL      : http://{config.API_HOST}:{config.API_PORT}")
    print(f"  API Docs        : http://localhost:{config.API_PORT}/docs")
    print("="*60 + "\n")

    uvicorn.run(
        "api.server:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=False     # Set True during development
    )