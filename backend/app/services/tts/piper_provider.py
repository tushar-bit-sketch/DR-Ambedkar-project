"""
Piper TTS Provider (Neural Onnx TTS).
Secondary production architecture for fast local multilingual synthesis.
Reports TTS_UNAVAILABLE if piper binary or models are not installed.
"""

import os
import shutil
import logging
from typing import List, Dict, Any, Tuple, Optional

from app.services.tts.base import BaseTTSProvider, TTSUnavailableError

logger = logging.getLogger("archive.tts.piper")

class PiperTTSProvider(BaseTTSProvider):
    """
    Local neural TTS using Piper.
    Checks for binary and model assets locally.
    """

    def __init__(self, piper_bin: Optional[str] = None, models_dir: Optional[str] = None):
        self._piper_bin = piper_bin or os.getenv("PIPER_BINARY_PATH", shutil.which("piper"))
        self._models_dir = models_dir or os.getenv("PIPER_MODELS_DIR", "models/piper")
        self._is_available = False
        self._status = "UNINITIALIZED"
        self._check_availability()

    def _check_availability(self):
        if not self._piper_bin or not os.path.exists(self._piper_bin):
            self._status = "TTS_UNAVAILABLE"
            self._is_available = False
            return
        
        if not os.path.exists(self._models_dir):
            self._status = "MODEL_UNAVAILABLE"
            self._is_available = False
            return

        self._status = "READY"
        self._is_available = True

    @property
    def provider_name(self) -> str:
        return "piper_tts"

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def supported_languages(self) -> List[str]:
        return ["en", "hi"] if self._is_available else []

    def available_voices(self) -> List[Dict[str, Any]]:
        return []

    def synthesize(
        self,
        text: str,
        language: str,
        output_file_path: str,
        voice: Optional[str] = None
    ) -> Tuple[str, float, int, str]:
        if not self._is_available:
            raise TTSUnavailableError(
                f"TTS_UNAVAILABLE: Piper TTS binary or models not found in environment ({self._status})."
            )
        # If available, execute piper CLI
        raise NotImplementedError("Piper synthesis execution")

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": self._status,
            "is_available": self._is_available,
            "piper_bin": self._piper_bin,
            "models_dir": self._models_dir
        }
