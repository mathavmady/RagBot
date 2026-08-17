# bulk_upload.py
import os
import requests

UPLOAD_URL  = "http://localhost:8000/upload"
DOCS_FOLDER = "./my_documents"   # ← put your folder path here

supported = {".pdf", ".docx", ".pptx"}

for filename in os.listdir(DOCS_FOLDER):
    ext = os.path.splitext(filename)[1].lower()
    if ext not in supported:
        continue

    file_path = os.path.join(DOCS_FOLDER, filename)
    print(f"Uploading: {filename} ...")

    with open(file_path, "rb") as f:
        response = requests.post(UPLOAD_URL, files={"file": (filename, f)})

    result = response.json()
    if result.get("status") == "success":
        print(f"  ✓ {result['total_pages']} pages → {result['total_chunks']} chunks stored")
    else:
        print(f"  ✗ Error: {result.get('message')}")