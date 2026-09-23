"""
Base Speech-to-Text (STT) Provider Interface.
Enforces genuine model verification and refusal to fake transcriptions.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional

class STTUnavailableError(RuntimeError):
    """Raised when STT provider or model weights are unavailable."""
    pass

class BaseSTTProvider(ABC):
    """
    Abstract interface for speech transcription.
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
        """Returns 'READY', 'MODEL_UNAVAILABLE', or 'STT_UNAVAILABLE'."""
        pass

    @abstractmethod
    def supported_languages(self) -> List[str]:
        pass

    @abstractmethod
    def transcribe(
        self,
        audio_file_path: str,
        language: Optional[str] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Transcribes audio file to text.
        Returns: (transcribed_text, metadata_dict)
        Must raise STTUnavailableError if model weights are missing.
        """
        pass

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        pass
