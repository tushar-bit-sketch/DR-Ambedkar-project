"""
Audio Narration Service.
Coordinates audio derivative generation, persistent storage, SHA-256 checksumming,
and unbroken provenance linking back to documents, pages, or translations.
Strictly adheres to Condition 1, 6, and 7:
- Audio is a derivative layer only. Original archival master is immutable.
- Real duration and real SHA-256 checksums.
- Never fabricates word/paragraph timestamps.
- Never silently substitutes an English voice for Indic text.
"""

import os
import uuid
import datetime
import logging
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import Document, DocumentVersion, OCRPage, OCRTextVersion, Translation, AudioDerivative
from app.services.tts.factory import get_tts_provider
from app.services.tts.base import TTSUnavailableError, UnsupportedVoiceError
from app.core.config import settings

logger = logging.getLogger("archive.tts.service")

class AudioNarrationService:
    """
    Manages archival audio narration derivatives.
    """

    @staticmethod
    def get_audio(db: Session, audio_id: str) -> Optional[AudioDerivative]:
        return db.query(AudioDerivative).filter(AudioDerivative.audio_id == audio_id).first()

    @staticmethod
    def list_audios(
        db: Session,
        document_id: Optional[int] = None,
        translation_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AudioDerivative]:
        query = db.query(AudioDerivative)
        if document_id:
            query = query.filter(AudioDerivative.document_id == document_id)
        if translation_id:
            query = query.filter(AudioDerivative.translation_id == translation_id)
        return query.order_by(AudioDerivative.created_at.desc()).offset(skip).limit(limit).all()

    @classmethod
    def synthesize_narration(
        cls,
        db: Session,
        document_id: int,
        translation_id: Optional[int] = None,
        page_id: Optional[int] = None,
        language: Optional[str] = None,
        voice: Optional[str] = None,
        provider_name: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> AudioDerivative:
        """
        Synthesizes narration for a document, page, or translation.
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")

        doc_version_id = None
        ocr_page_id = None
        source_text_version_id = None
        target_text = ""
        target_lang = "English"

        if translation_id:
            # Narration of a translation derivative
            trans = db.query(Translation).filter(Translation.id == translation_id).first()
            if not trans:
                raise HTTPException(status_code=404, detail=f"Translation {translation_id} not found")
            if trans.document_id != document_id:
                raise HTTPException(status_code=400, detail="Translation does not belong to specified document")
            
            target_text = trans.translated_text
            target_lang = trans.target_language
            doc_version_id = trans.document_version_id
            ocr_page_id = trans.ocr_page_id
            source_text_version_id = trans.ocr_text_version_id
        elif page_id:
            # Narration of a specific OCR page
            ocr_page = db.query(OCRPage).filter(OCRPage.id == page_id).first()
            if not ocr_page:
                raise HTTPException(status_code=404, detail=f"OCR Page {page_id} not found")
            ocr_page_id = ocr_page.id
            doc_version_id = ocr_page.job.document_version_id if ocr_page.job else None
            
            text_ver = (
                db.query(OCRTextVersion)
                .filter(OCRTextVersion.ocr_page_id == page_id)
                .order_by(OCRTextVersion.version_number.desc())
                .first()
            )
            if text_ver:
                source_text_version_id = text_ver.id
                target_text = text_ver.extracted_text
            else:
                target_text = ocr_page.raw_text or ""
            target_lang = doc.language or "English"
        else:
            # Narration of document
            doc_ver = (
                db.query(DocumentVersion)
                .filter(DocumentVersion.document_id == document_id)
                .order_by(DocumentVersion.version_number.desc())
                .first()
            )
            if doc_ver:
                doc_version_id = doc_ver.id
            
            target_text = doc.description or doc.title or ""
            target_lang = doc.language or "English"

        if language:
            target_lang = language

        if not target_text or not target_text.strip():
            raise HTTPException(
                status_code=400,
                detail=f"No source text available for narration on document {document_id}."
            )

        provider = get_tts_provider(provider_name)
        if not provider.is_available:
            raise TTSUnavailableError(
                f"TTS_UNAVAILABLE: Audio synthesis provider '{provider.provider_name}' is not available."
            )

        # Unique audio ID and storage path
        unique_suffix = uuid.uuid4().hex[:10]
        audio_id = f"audio_{document_id}_{unique_suffix}"
        storage_dir = os.path.abspath(settings.AUDIO_STORAGE_DIR)
        os.makedirs(storage_dir, exist_ok=True)
        out_filename = f"{audio_id}.wav"
        out_path = os.path.join(storage_dir, out_filename)

        # Synthesize audio
        file_path, duration, file_size, checksum = provider.synthesize(
            text=target_text,
            language=target_lang,
            output_file_path=out_path,
            voice=voice
        )

        audio_derivative = AudioDerivative(
            audio_id=audio_id,
            document_id=document_id,
            document_version_id=doc_version_id,
            ocr_page_id=ocr_page_id,
            translation_id=translation_id,
            source_text_version_id=source_text_version_id,
            language=target_lang,
            voice=voice or "default",
            provider=provider.provider_name,
            model=None,
            duration_seconds=duration,
            file_format="WAV",
            file_path=out_path,
            file_size_bytes=file_size,
            checksum=checksum,
            timing_data_json=None, # Condition 7: Never fabricate timestamps
            status="COMPLETED",
            created_by=user_id,
            created_at=datetime.datetime.utcnow()
        )

        db.add(audio_derivative)
        db.commit()
        db.refresh(audio_derivative)
        logger.info(
            f"Created AudioDerivative #{audio_derivative.id} (id={audio_id}, "
            f"duration={duration}s, size={file_size}b, sha256={checksum[:12]}...)"
        )
        return audio_derivative

    @classmethod
    def delete_audio(cls, db: Session, audio_id: str) -> bool:
        audio = cls.get_audio(db, audio_id)
        if not audio:
            return False
        if os.path.exists(audio.file_path):
            try:
                os.remove(audio.file_path)
            except Exception as e:
                logger.warning(f"Failed to remove audio file {audio.file_path}: {e}")
        db.delete(audio)
        db.commit()
        return True
