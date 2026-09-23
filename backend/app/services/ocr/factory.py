from typing import Dict, Type
from app.services.ocr.base import BaseOCRProvider
from app.services.ocr.paddle_provider import PaddleOCRProvider
from app.services.ocr.tesseract_provider import TesseractProvider

_PROVIDERS: Dict[str, Type[BaseOCRProvider]] = {
    "PADDLEOCR": PaddleOCRProvider,
    "TESSERACT": TesseractProvider,
}

def get_ocr_provider(engine_name: str = "PADDLEOCR") -> BaseOCRProvider:
    """
    Returns an instance of the requested OCR engine.
    Defaults to PaddleOCRProvider (Primary Engine).
    """
    engine_key = engine_name.upper().strip() if engine_name else "PADDLEOCR"
    provider_cls = _PROVIDERS.get(engine_key, PaddleOCRProvider)
    return provider_cls()
