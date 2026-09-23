from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
import datetime

class OCRPreprocessingConfig(BaseModel):
    target_dpi: int = 300
    grayscale: bool = True
    deskew: bool = True
    denoise: bool = True
    contrast_clahe: bool = True
    thresholding: bool = False
    remove_borders: bool = True

class OCRJobCreate(BaseModel):
    document_id: int
    engine: Optional[str] = "PADDLEOCR"
    language: Optional[str] = "English"
    preprocessing_config: Optional[OCRPreprocessingConfig] = None

class OCRBlockOut(BaseModel):
    id: int
    text: str
    confidence: float # OCR MODEL CONFIDENCE
    x: int
    y: int
    width: int
    height: int
    block_type: str

    model_config = ConfigDict(from_attributes=True)

class OCRTextVersionOut(BaseModel):
    id: int
    version_number: int
    text: str
    engine: str
    language: str
    change_summary: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class OCRReviewOut(BaseModel):
    id: int
    reviewer_id: Optional[int] = None
    reviewer_email: Optional[str] = None
    status: str
    corrected_text: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class OCRPageOut(BaseModel):
    id: int
    ocr_job_id: int
    page_number: int
    width: int
    height: int
    dpi: Optional[int] = 300
    raw_text: Optional[str] = None
    cleaned_text: Optional[str] = None
    confidence: float # Numerical OCR MODEL CONFIDENCE
    confidence_category: str # HIGH, MEDIUM, LOW
    is_low_confidence: bool
    status: str
    processing_time_ms: int
    image_derivative_path: Optional[str] = None
    original_page_image_path: Optional[str] = None
    error: Optional[str] = None
    blocks: Optional[List[OCRBlockOut]] = None
    versions: Optional[List[OCRTextVersionOut]] = None
    reviews: Optional[List[OCRReviewOut]] = None

    model_config = ConfigDict(from_attributes=True)

class OCRJobOut(BaseModel):
    id: int
    document_id: int
    document_title: Optional[str] = None
    document_archive_id: Optional[str] = None
    status: str # QUEUED, PROCESSING, COMPLETED, FAILED, REVIEW_REQUIRED, APPROVED
    engine: str
    engine_version: Optional[str] = None
    model_name: Optional[str] = None
    model_config_detail: Optional[str] = None
    preprocessing_config: Optional[str] = None
    language: str
    total_pages: int
    processed_pages: int
    failed_pages: int
    avg_confidence: Optional[float] = None
    started_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    error: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class OCRCorrectionRequest(BaseModel):
    corrected_text: str
    review_notes: Optional[str] = None
    mark_approved: bool = False

class OCRReviewStatusRequest(BaseModel):
    review_notes: Optional[str] = None

class OCRPageRerunRequest(BaseModel):
    engine: Optional[str] = None
    language: Optional[str] = None
    preprocessing_config: Optional[Dict[str, Any]] = None
