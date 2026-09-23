"""
API Endpoints for Archival Audio Derivatives and Voice Queries.
Enforces Condition 1, 6, 7, 8:
- Audio derivatives linked to original documents/translations.
- SHA-256 integrity and real duration.
- Refusal to silently synthesize Indic text with English voices.
- Prompt injection defenses for voice queries.
"""

import os
import shutil
import tempfile
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, AudioDerivative
from app.api.v1.endpoints.auth import get_current_user_optional, get_current_user
from app.schemas.audio import (
    AudioSynthesizeRequest, AudioDerivativeResponse, VoiceQueryResponse
)
from app.services.tts.service import AudioNarrationService
from app.services.tts.base import TTSUnavailableError, UnsupportedVoiceError
from app.services.stt.service import VoiceQueryService
from app.services.stt.base import STTUnavailableError

logger = logging.getLogger("archive.api.audio")
router = APIRouter()

@router.post("/synthesize", response_model=AudioDerivativeResponse)
def synthesize_narration(
    payload: AudioSynthesizeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Synthesizes speech narration for a document, OCR page, or translation derivative.
    Calculates genuine duration and SHA-256 checksum.
    """
    try:
        user_id = current_user.id if current_user else None
        audio = AudioNarrationService.synthesize_narration(
            db=db,
            document_id=payload.document_id,
            translation_id=payload.translation_id,
            page_id=payload.page_id,
            language=payload.language,
            voice=payload.voice,
            provider_name=payload.provider,
            user_id=user_id
        )
        return AudioDerivativeResponse(
            id=audio.id,
            audio_id=audio.audio_id,
            document_id=audio.document_id,
            document_version_id=audio.document_version_id,
            ocr_page_id=audio.ocr_page_id,
            translation_id=audio.translation_id,
            source_text_version_id=audio.source_text_version_id,
            language=audio.language,
            voice=audio.voice,
            provider=audio.provider,
            duration_seconds=audio.duration_seconds,
            file_format=audio.file_format,
            file_size_bytes=audio.file_size_bytes,
            checksum=audio.checksum,
            status=audio.status,
            created_at=audio.created_at.isoformat() if audio.created_at else ""
        )
    except TTSUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/document/{document_id}", response_model=List[AudioDerivativeResponse])
def get_document_audios(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Lists all audio narration derivatives linked to a document.
    """
    audios = AudioNarrationService.list_audios(db, document_id=document_id)
    return [
        AudioDerivativeResponse(
            id=a.id,
            audio_id=a.audio_id,
            document_id=a.document_id,
            document_version_id=a.document_version_id,
            ocr_page_id=a.ocr_page_id,
            translation_id=a.translation_id,
            source_text_version_id=a.source_text_version_id,
            language=a.language,
            voice=a.voice,
            provider=a.provider,
            duration_seconds=a.duration_seconds,
            file_format=a.file_format,
            file_size_bytes=a.file_size_bytes,
            checksum=a.checksum,
            status=a.status,
            created_at=a.created_at.isoformat() if a.created_at else ""
        )
        for a in audios
    ]

@router.get("/{audio_id}", response_model=AudioDerivativeResponse)
def get_audio_metadata(
    audio_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves metadata and checksum for an audio derivative.
    """
    a = AudioNarrationService.get_audio(db, audio_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"Audio derivative '{audio_id}' not found")
    return AudioDerivativeResponse(
        id=a.id,
        audio_id=a.audio_id,
        document_id=a.document_id,
        document_version_id=a.document_version_id,
        ocr_page_id=a.ocr_page_id,
        translation_id=a.translation_id,
        source_text_version_id=a.source_text_version_id,
        language=a.language,
        voice=a.voice,
        provider=a.provider,
        duration_seconds=a.duration_seconds,
        file_format=a.file_format,
        file_size_bytes=a.file_size_bytes,
        checksum=a.checksum,
        status=a.status,
        created_at=a.created_at.isoformat() if a.created_at else ""
    )

@router.get("/{audio_id}/stream")
def stream_audio(
    audio_id: str,
    db: Session = Depends(get_db)
):
    """
    Streams the raw WAV audio file for playback in frontend or kiosk.
    """
    a = AudioNarrationService.get_audio(db, audio_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"Audio derivative '{audio_id}' not found")
    if not os.path.exists(a.file_path):
        raise HTTPException(status_code=404, detail="Audio file missing from storage.")

    media_type = "audio/wav" if a.file_format.upper() == "WAV" else "audio/mpeg"
    return FileResponse(
        path=a.file_path,
        media_type=media_type,
        filename=f"{a.audio_id}.wav",
        headers={"Accept-Ranges": "bytes", "X-Audio-Checksum": a.checksum}
    )

@router.delete("/{audio_id}")
def delete_audio(
    audio_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes an audio narration derivative.
    """
    success = AudioNarrationService.delete_audio(db, audio_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Audio '{audio_id}' not found")
    return {"message": f"Audio derivative '{audio_id}' removed successfully."}

@router.post("/voice-query", response_model=VoiceQueryResponse)
async def process_voice_query(
    file: UploadFile = File(...),
    language: Optional[str] = None
):
    """
    Accepts speech audio upload, transcribes to text, verifies prompt injection defenses,
    and returns sanitized text query ready for research RAG.
    """
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        res = VoiceQueryService.transcribe_audio_file(
            audio_file_path=tmp_path,
            language=language
        )
        return VoiceQueryResponse(
            query=res["query"],
            detected_language=res["detected_language"],
            provider=res["provider"],
            validation_passed=res["validation_passed"]
        )
    except STTUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
