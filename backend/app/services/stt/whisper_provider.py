"""
OpenAI Whisper / faster-whisper STT Provider.
Adheres to Condition 8:
- Does NOT claim Whisper is operational unless real weights are installed and execute.
- Transparently reports STT_UNAVAILABLE when weights are absent.
"""

import os
import logging
from typing import List, Dict, Any, Tuple, Optional

from app.services.stt.base import BaseSTTProvider, STTUnavailableError

logger = logging.getLogger("archive.stt.whisper")

class WhisperSTTProvider(BaseSTTProvider):
    """
    Local speech transcription using Whisper.
    """

    def __init__(self, model_size: str = "base", model_path: Optional[str] = None):
        self._model_size = model_size
        self._model_path = model_path or os.getenv("WHISPER_MODEL_PATH", "")
        self._model = None
        self._is_available = False
        self._status = "UNINITIALIZED"
        self._error_detail = None
        self._check_availability()

    def _check_availability(self):
        try:
            # Check if whisper is importable and model exists
            import whisper
            if self._model_path and os.path.exists(self._model_path):
                self._model = whisper.load_model(self._model_path)
                self._is_available = True
                self._status = "READY"
            else:
                self._is_available = False
                self._status = "MODEL_UNAVAILABLE"
                self._error_detail = "Whisper model weights not found locally."
        except ImportError:
            self._is_available = False
            self._status = "STT_UNAVAILABLE"
            self._error_detail = "openai-whisper package is not installed."
        except Exception as e:
            self._is_available = False
            self._status = "STT_UNAVAILABLE"
            self._error_detail = str(e)

    @property
    def provider_name(self) -> str:
        return "whisper"

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def supported_languages(self) -> List[str]:
        return ["en", "hi", "mr", "ta"] if self._is_available else []

    def transcribe(
        self,
        audio_file_path: str,
        language: Optional[str] = None
    ) -> Tuple[str, Dict[str, Any]]:
        if not self._is_available or not self._model:
            raise STTUnavailableError(
                f"STT_UNAVAILABLE: {self._error_detail or 'Whisper STT model unavailable.'}"
            )

        try:
            options = {}
            if language:
                options["language"] = language
            result = self._model.transcribe(audio_file_path, **options)
            text = result.get("text", "").strip()
            meta = {
                "provider": self.provider_name,
                "detected_language": result.get("language"),
                "segments_count": len(result.get("segments", []))
            }
            return text, meta
        except Exception as e:
            raise STTUnavailableError(f"Whisper transcription failed: {e}")

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": self._status,
            "is_available": self._is_available,
            "error_detail": self._error_detail
        }
