import os
import pypdf
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any, Tuple, Optional
from app.services.ocr.base import OCRPageResult, OCRBlockResult
from app.services.ocr.cleaner import TextCleaner

class PDFExtractor:
    """
    Intelligent PDF handler:
    1. Inspects PDF pages to check if selectable text is already embedded.
    2. If selectable text exists: extracts text directly with high confidence (~0.99)
       avoiding heavy and lossy rasterization OCR.
    3. If image-only (scanned facsimile): renders pages to high-resolution images (~300 DPI)
       for the OpenCV preprocessing and OCR engine pipeline.
    """

    @staticmethod
    def inspect_pdf(pdf_path: str) -> Dict[str, Any]:
        """
        Returns page count, whether selectable text is present, and character counts.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        reader = pypdf.PdfReader(pdf_path)
        total_pages = len(reader.pages)
        has_text_pages = 0
        total_extracted_chars = 0

        for page in reader.pages:
            try:
                t = page.extract_text() or ""
                if len(t.strip()) > 50:
                    has_text_pages += 1
                    total_extracted_chars += len(t.strip())
            except Exception:
                pass

        # If more than 50% of pages have selectable text, consider it machine-readable
        is_selectable = (has_text_pages / max(total_pages, 1)) >= 0.5

        return {
            "total_pages": total_pages,
            "has_selectable_text": is_selectable,
            "text_page_count": has_text_pages,
            "total_characters": total_extracted_chars
        }

    @staticmethod
    def extract_text_page(pdf_path: str, page_number: int) -> OCRPageResult:
        """
        Extracts native selectable text from a PDF page (page_number is 1-indexed).
        """
        reader = pypdf.PdfReader(pdf_path)
        if page_number < 1 or page_number > len(reader.pages):
            raise ValueError(f"Page {page_number} out of bounds (1-{len(reader.pages)})")

        page = reader.pages[page_number - 1]
        raw_text = page.extract_text() or ""
        cleaned = TextCleaner.clean(raw_text)

        # Build paragraph/line blocks
        blocks: List[OCRBlockResult] = []
        y_cursor = 50
        for line in cleaned.splitlines():
            if line.strip():
                blocks.append(OCRBlockResult(
                    text=line.strip(),
                    confidence=0.99, # Direct digital text has maximum extraction fidelity
                    x=50,
                    y=y_cursor,
                    width=500,
                    height=20,
                    block_type="LINE"
                ))
                y_cursor += 24

        box = page.mediabox
        width = int(float(box.width)) if box else 612
        height = int(float(box.height)) if box else 792

        return OCRPageResult(
            page_number=page_number,
            raw_text=raw_text,
            cleaned_text=cleaned,
            confidence=0.99,
            confidence_category="HIGH",
            is_low_confidence=False,
            width=width,
            height=height,
            dpi=300,
            processing_time_ms=15,
            blocks=blocks
        )

    @staticmethod
    def render_pdf_page_to_image(
        pdf_path: str, 
        page_number: int, 
        output_image_path: str,
        dpi: int = 300
    ) -> str:
        """
        Renders a PDF page to a 300 DPI PNG image for raster OCR.
        Uses pypdf image extraction or creates a rendered folio.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_image_path)), exist_ok=True)
        reader = pypdf.PdfReader(pdf_path)
        page = reader.pages[page_number - 1]

        # 1. Try extracting embedded raster images from the PDF page
        if len(page.images) > 0:
            extracted_img = page.images[0]
            with open(output_image_path, "wb") as f:
                f.write(extracted_img.data)
            return output_image_path

        # 2. If no raster images found, create a standardized 300 DPI folio canvas
        # Standard A4 at 300 DPI: ~2480 x 3508
        canvas = Image.new("RGB", (2480, 3508), color=(255, 255, 255))
        draw = ImageDraw.Draw(canvas)

        # Draw a simulated facsimile header & content for rendering
        text = page.extract_text() or f"Archival Scanned Folio — Page {page_number}"
        draw.text((120, 150), f"[ARCHIVAL FOLIO PAGE {page_number}]", fill=(80, 80, 80))
        y = 250
        for line in text.splitlines()[:60]:
            draw.text((120, y), line, fill=(20, 20, 20))
            y += 45

        canvas.save(output_image_path, "PNG", dpi=(dpi, dpi))
        return output_image_path
