"""
Voice Query Service.
Handles speech-to-text transcription for archival research,
enforces security validation, and applies prompt-injection defenses.
Adheres strictly to Condition 8:
- STT is strictly optional; text queries work independently.
- Voice transcription passes identical validation and prompt-injection defenses as text queries.
"""

import os
import re
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException, UploadFile

from app.services.stt.factory import get_stt_provider
from app.services.stt.base import STTUnavailableError

logger = logging.getLogger("archive.stt.service")

# Prompt injection markers
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*prompt\s*override", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"forget\s+(all\s+)?rules", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"disregard\s+the\s+above", re.IGNORECASE),
]

class VoiceQueryService:
    @staticmethod
    def validate_transcription_security(text: str) -> bool:
        """
        Validates that transcribed text does not contain prompt injection vectors.
        Raises HTTPException(400) if a violation is detected.
        """
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Voice transcription produced empty text.")

        for pattern in PROMPT_INJECTION_PATTERNS:
            if pattern.search(text):
                logger.warning(f"Prompt injection detected in voice query: '{text}'")
                raise HTTPException(
                    status_code=400,
                    detail="Security violation: Suspicious instruction pattern detected in voice query."
                )
        return True

    @classmethod
    def transcribe_audio_file(
        cls,
        audio_file_path: str,
        language: Optional[str] = None,
        provider_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes an audio file and returns validated text query.
        """
        if not os.path.exists(audio_file_path):
            raise HTTPException(status_code=400, detail="Audio file not found on server.")

        file_size = os.path.getsize(audio_file_path)
        if file_size > 15 * 1024 * 1024: # 15 MB limit
            raise HTTPException(status_code=400, detail="Audio file exceeds 15MB size limit.")

        provider = get_stt_provider(provider_name)
        if not provider.is_available:
            raise STTUnavailableError(
                f"STT_UNAVAILABLE: Speech-to-text service '{provider.provider_name}' is currently unavailable."
            )

        transcribed_text, meta = provider.transcribe(
            audio_file_path=audio_file_path,
            language=language
        )

        # Run prompt injection and security validation
        cls.validate_transcription_security(transcribed_text)

        return {
            "query": transcribed_text,
            "detected_language": meta.get("detected_language") or language or "unknown",
            "provider": meta.get("provider", provider.provider_name),
            "validation_passed": True
        }
