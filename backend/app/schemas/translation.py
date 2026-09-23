"""
Schemas for Translation Derivatives.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TranslationCreateRequest(BaseModel):
    document_id: int
    target_language: str
    page_id: Optional[int] = None
    provider: Optional[str] = None

class TranslationReviewRequest(BaseModel):
    action: str # "APPROVE", "REJECT", "EDIT_AND_APPROVE"
    edited_text: Optional[str] = None
    reviewer_notes: Optional[str] = None

class TranslationResponse(BaseModel):
    id: int
    document_id: int
    document_version_id: Optional[int] = None
    ocr_page_id: Optional[int] = None
    ocr_text_version_id: Optional[int] = None
    source_language: str
    target_language: str
    translated_title: Optional[str] = None
    translated_text: str
    translation_provider: str
    translation_model: Optional[str] = None
    model_version: Optional[str] = None
    translation_version: int
    status: str
    reviewer_notes: Optional[str] = None
    created_by: Optional[int] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class TranslationSideBySideResponse(BaseModel):
    translation_id: int
    document_id: int
    document_title: str
    ocr_page_id: Optional[int] = None
    source_language: str
    target_language: str
    original_text: str
    translated_text: str
    translation_version: int
    status: str
    provider: str
    model: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[str] = None
    created_at: Optional[str] = None
    is_machine_generated: bool
