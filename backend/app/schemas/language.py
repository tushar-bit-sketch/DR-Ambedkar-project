"""
Schemas for Multilingual System Metadata and Diagnostics.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class SupportedLanguage(BaseModel):
    code: str
    name: str
    native_name: str
    is_ui_supported: bool
    is_translation_supported: bool
    is_tts_supported: bool

class MultilingualDiagnosticsResponse(BaseModel):
    active_phase: str
    translation: Dict[str, Any]
    tts: Dict[str, Any]
    stt: Dict[str, Any]
    supported_languages: List[SupportedLanguage]
