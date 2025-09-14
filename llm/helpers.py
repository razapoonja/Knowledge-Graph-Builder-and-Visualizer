import io

from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError

from fastapi import UploadFile, HTTPException

PDF_CT = {
    "application/pdf",
    "application/x-pdf",
    "application/acrobat",
    "applications/vnd.pdf",
    "text/pdf",
    "application/octet-stream"
}

MAX_MB = 25

def assert_valid_pdf(upload: UploadFile, content: bytes) -> None:
    if len(content) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (> {MAX_MB} MB)")

    ct = (upload.content_type or "").lower()
    if ct not in PDF_CT:
        raise HTTPException(status_code=400, detail=f"Invalid Content-Type for PDF: {ct}")

    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Not a real PDF (missing %PDF- header)")

    tail = content[-4096:] if len(content) > 4096 else content
    if b"%%EOF" not in tail:
        raise HTTPException(status_code=400, detail="Not a real PDF (missing %%EOF trailer)")

    try:
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                raise HTTPException(status_code=400, detail="Encrypted PDFs are not supported")
        _ = reader.pages[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid/corrupted PDF: {e}")
