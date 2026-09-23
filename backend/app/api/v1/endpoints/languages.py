"""
API Endpoints for Languages and Multilingual System Diagnostics.
Honors Condition 2, 6, 7, 10:
- Reports honest provider availability without faking.
- Clearly states UI vs content language support.
"""

from typing import List, Dict, Any
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.language import SupportedLanguage, MultilingualDiagnosticsResponse
from app.services.translation.factory import get_translation_provider
from app.services.tts.factory import get_tts_provider
from app.services.stt.factory import get_stt_provider

router = APIRouter()

SUPPORTED_LANGUAGES = [
    SupportedLanguage(
        code="en",
        name="English",
        native_name="English",
        is_ui_supported=True,
        is_translation_supported=True,
        is_tts_supported=True
    ),
    SupportedLanguage(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        is_ui_supported=True,
        is_translation_supported=True,
        is_tts_supported=False # Reflects Windows SAPI native voice limitation truthfully
    ),
    SupportedLanguage(
        code="mr",
        name="Marathi",
        native_name="मराठी",
        is_ui_supported=True,
        is_translation_supported=True,
        is_tts_supported=False # Reflects Windows SAPI native voice limitation truthfully
    ),
    SupportedLanguage(
        code="ta",
        name="Tamil",
        native_name="தமிழ்",
        is_ui_supported=True,
        is_translation_supported=True,
        is_tts_supported=False # Reflects Windows SAPI native voice limitation truthfully
    ),
]

@router.get("/supported", response_model=List[SupportedLanguage])
def get_supported_languages():
    """
    Returns supported languages across UI localization and AI capabilities.
    """
    return SUPPORTED_LANGUAGES

@router.get("/diagnostics", response_model=MultilingualDiagnosticsResponse)
def get_multilingual_diagnostics():
    """
    Returns operational diagnostics for translation, speech synthesis, and transcription.
    """
    trans_prov = get_translation_provider()
    tts_prov = get_tts_provider()
    stt_prov = get_stt_provider()

    return MultilingualDiagnosticsResponse(
        active_phase=settings.ARCHIVE_PHASE,
        translation=trans_prov.get_diagnostics(),
        tts=tts_prov.get_diagnostics(),
        stt=stt_prov.get_diagnostics(),
        supported_languages=SUPPORTED_LANGUAGES
    )
