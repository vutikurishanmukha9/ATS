import io
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 16 * 1024 * 1024  # 16 MB
MAX_TEXT_LENGTH = 15000


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Extracts raw text from PDF or TXT bytes in-memory using PyMuPDF or UTF-8 decoding."""
    if not file_bytes:
        return ""

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError("File exceeds maximum allowed upload size (16 MB)")

    filename_lower = filename.lower()

    if filename_lower.endswith(".pdf"):
        try:
            import pymupdf

            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            pages_text = []
            for page_num in range(min(len(doc), 15)):
                page = doc[page_num]
                text = page.get_text()
                if text:
                    pages_text.append(text)
            full_text = "\n".join(pages_text).strip()
            return full_text[:MAX_TEXT_LENGTH]
        except Exception as e:
            logger.warning(f"PyMuPDF failed to extract text from {filename}: {e}")
            raise ValueError(f"Could not parse PDF content: {str(e)}")

    # Assume text file or decode with common encodings
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return file_bytes.decode(encoding)[:MAX_TEXT_LENGTH]
        except UnicodeDecodeError:
            continue

    return file_bytes.decode("utf-8", errors="ignore")[:MAX_TEXT_LENGTH]
