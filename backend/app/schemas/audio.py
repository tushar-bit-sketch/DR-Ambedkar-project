"""
Schemas for Audio Narration Derivatives and Voice Queries.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AudioSynthesizeRequest(BaseModel):
    document_id: int
    translation_id: Optional[int] = None
    page_id: Optional[int] = None
    language: Optional[str] = None
    voice: Optional[str] = None
    provider: Optional[str] = None

class AudioDerivativeResponse(BaseModel):
    id: int
    audio_id: str
    document_id: int
    document_version_id: Optional[int] = None
    ocr_page_id: Optional[int] = None
    translation_id: Optional[int] = None
    source_text_version_id: Optional[int] = None
    language: str
    voice: Optional[str] = None
    provider: str
    duration_seconds: float
    file_format: str
    file_size_bytes: int
    checksum: str
    status: str
    created_at: str

    class Config:
        from_attributes = True

class VoiceQueryResponse(BaseModel):
    query: str
    detected_language: str
    provider: str
    validation_passed: bool
