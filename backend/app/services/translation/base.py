"""
Base Translation Provider Interface for Archival Derivatives.
Enforces strict provider status, language pair checking, and refusal to fake translations.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional

class TranslationUnavailableError(RuntimeError):
    """Raised when a translation provider or required model weights are offline or missing."""
    pass

class UnsupportedLanguagePairError(ValueError):
    """Raised when requested source and target language pair is not supported by provider."""
    pass

class BaseTranslationProvider(ABC):
    """
    Abstract translation provider interface.
    All translations produced are DERIVATIVE archival layers.
    Never alters or overwrites original archival records.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @property
    @abstractmethod
    def status(self) -> str:
        """Returns 'READY', 'MODEL_UNAVAILABLE', or 'DEGRADED'."""
        pass

    @property
    @abstractmethod
    def supported_language_pairs(self) -> List[Tuple[str, str]]:
        """List of supported (source_lang, target_lang) tuples e.g. [('en', 'hi'), ('en', 'mr')]."""
        pass

    @abstractmethod
    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Translates text from source_language to target_language.
        Returns: (translated_text, metadata_dict)
        Must raise TranslationUnavailableError if model weights or service are missing.
        Never produces synthetic or fabricated translations.
        """
        pass

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns provider health, active models, and operational capabilities."""
        pass
