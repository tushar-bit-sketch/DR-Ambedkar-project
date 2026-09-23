"""
Base Text-to-Speech (TTS) Provider Interface for Archival Audio Derivatives.
Enforces voice availability checks, language support validation,
and refusal to silently substitute voices.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional

class TTSUnavailableError(RuntimeError):
    """Raised when TTS provider, engine, or requested language voice is unavailable."""
    pass

class UnsupportedVoiceError(ValueError):
    """Raised when requested voice or language is unsupported by provider."""
    pass

class BaseTTSProvider(ABC):
    """
    Abstract interface for TTS synthesis.
    All generated audio is saved as an archival AudioDerivative with SHA-256 integrity.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @property
    @abstractmethod
    def status(self) -> str:
        """Returns 'READY', 'VOICE_UNAVAILABLE', 'TTS_UNAVAILABLE', or 'DEGRADED'."""
        pass

    @abstractmethod
    def supported_languages(self) -> List[str]:
        """List of supported language codes, e.g. ['en']."""
        pass

    @abstractmethod
    def available_voices(self) -> List[Dict[str, Any]]:
        """List of voice dictionaries: [{'name': 'Microsoft David', 'gender': 'Male', 'lang': 'en-US'}]."""
        pass

    @abstractmethod
    def synthesize(
        self,
        text: str,
        language: str,
        output_file_path: str,
        voice: Optional[str] = None
    ) -> Tuple[str, float, int, str]:
        """
        Synthesizes text to audio file.
        Returns: (output_file_path, duration_seconds, file_size_bytes, sha256_checksum)
        Must raise TTSUnavailableError if language voice is missing.
        Never silently substitutes an English voice for Indic text.
        """
        pass

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns provider status, installed voices, and health metrics."""
        pass
