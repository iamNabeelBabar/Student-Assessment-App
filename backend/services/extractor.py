"""
Material text extraction service
Supports: PDF, TXT, DOCX
"""
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract text from uploaded file based on extension."""
    ext = filename.lower().split(".")[-1]

    try:
        if ext == "pdf":
            return await _extract_pdf(file_content)
        elif ext == "txt":
            return file_content.decode("utf-8", errors="replace")
        elif ext in ("doc", "docx"):
            return await _extract_docx(file_content)
        else:
            # Try as plain text
            return file_content.decode("utf-8", errors="replace")
    except Exception as e:
        logger.error(f"Text extraction error for {filename}: {e}")
        return ""


async def _extract_pdf(content: bytes) -> str:
    """Extract text from PDF bytes."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        texts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                texts.append(text)
        return "\n".join(texts)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""


async def _extract_docx(content: bytes) -> str:
    """Extract text from DOCX bytes."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""
