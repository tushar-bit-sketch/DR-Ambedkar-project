from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from abc import ABC, abstractmethod

@dataclass
class OCRBlockResult:
    text: str
    confidence: float # Numerical 0.0 to 1.0 (OCR MODEL CONFIDENCE)
    x: int = 0
    y: int = 0
    width: int = 0
    height: int = 0
    block_type: str = "PARAGRAPH" # PARAGRAPH, LINE, HEADING, WORD

@dataclass
class OCRPageResult:
    page_number: int
    raw_text: str
    cleaned_text: str
    confidence: float # Average OCR MODEL CONFIDENCE (0.0 - 1.0)
    confidence_category: str # HIGH, MEDIUM, LOW
    is_low_confidence: bool # True if confidence < 0.70
    width: int = 0
    height: int = 0
    dpi: int = 300
    processing_time_ms: int = 0
    blocks: List[OCRBlockResult] = field(default_factory=list)
    image_derivative_path: Optional[str] = None
    original_page_image_path: Optional[str] = None
    error: Optional[str] = None

class BaseOCRProvider(ABC):
    """
    Abstract base class for all pluggable OCR engines.
    Every engine must declare its name, version, supported languages,
    and implement extract_from_image.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique engine identifier, e.g. 'PADDLEOCR', 'TESSERACT'"""
        pass

    @property
    @abstractmethod
    def version(self) -> str:
        """Version string of the underlying engine / model"""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Model identifier, e.g. 'PP-OCRv4', 'tesseract-v5'"""
        pass

    @abstractmethod
    def supports_language(self, language: str) -> bool:
        """Returns True if the engine supports the requested language"""
        pass

    @abstractmethod
    def extract_from_image(
        self, 
        image_path: str, 
        language: str = "English"
    ) -> OCRPageResult:
        """
        Extracts text from a single preprocessed image folio.
        Returns an OCRPageResult with raw_text, blocks, and model confidence.
        """
        pass
