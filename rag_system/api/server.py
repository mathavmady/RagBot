# api/server.py
# ----------------------------------------------------------
# FastAPI web server — exposes the RAG pipeline via HTTP.
# ----------------------------------------------------------

import os
import shutil

from fastapi            import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses  import JSONResponse
from pydantic           import BaseModel
from loguru             import logger

from vector_store.pinecone_store import delete_document_vectors
import config
from pipeline import ingest_document, answer_question, get_system_status

config.validate_config()

# ── FastAPI app ───────────────────────────────────────────
app = FastAPI(
    title="RAG Study Assistant",
    description=(
        "Upload your study materials (PDF, DOCX, PPTX) and ask questions. "
        "Powered by Qwen3 embeddings + Pinecone + Mistral 70B via Groq."
    ),
    version="1.0.0"
)


# ── Request/Response models ───────────────────────────────

class QuestionRequest(BaseModel):
    question:            str
    top_k:               int  = 5
    source_file_filter:  str  = None

    class Config:
        json_schema_extra = {
            "example": {
                "question": "What is the difference between supervised and unsupervised learning?",
                "top_k": 5,
                "source_file_filter": None
            }
        }


# ── Endpoints ─────────────────────────────────────────────

@app.get("/status", tags=["Health"])
def health_check():
    status = get_system_status()
    return JSONResponse(content=status)


# 🔥 UPDATED ENDPOINT (only change is here)
@app.post("/upload", tags=["Documents"])
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    allowed_extensions = {".pdf", ".docx", ".pptx"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: '{file_ext}'. "
                f"Allowed types: {', '.join(allowed_extensions)}"
            )
        )

    save_path = os.path.join(config.UPLOAD_DIR, file.filename)
    logger.info(f"Received upload: '{file.filename}' → saving to '{save_path}'")

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ✅ ONLY CHANGE: run ingestion in background
    background_tasks.add_task(
        ingest_document,
        file_path=save_path,
        replace_existing=True
    )

    return JSONResponse(content={
        "status": "success",
        "message": f"{file.filename} uploaded. Processing in background."
    })


@app.delete("/documents/{filename}", tags=["Documents"])
def delete_document(filename: str):
    file_path = os.path.join(config.UPLOAD_DIR, filename)

    # 1. Delete from uploads folder
    if os.path.exists(file_path):
        os.remove(file_path)
        logger.info(f"Deleted file from uploads: {filename}")
    else:
        logger.warning(f"File not found in uploads: {filename}")

    # 2. Delete from Pinecone
    try:
        delete_document_vectors(filename)
    except Exception as e:
        logger.error(f"Pinecone delete failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete from Pinecone")

    return JSONResponse(content={
        "status": "success",
        "message": f"{filename} deleted from system and Pinecone."
    })
@app.post("/ask", tags=["Query"])
def ask_question(request: QuestionRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    result = answer_question(
        question=request.question,
        top_k=request.top_k,
        source_file_filter=request.source_file_filter
    )

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["answer"])

    return JSONResponse(content=result)