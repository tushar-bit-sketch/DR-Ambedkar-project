"""
Mock Translation Provider.
Intended exclusively for unit/integration testing environments.
Explicitly tagged as TEST_MOCK in metadata.
"""

from typing import List, Dict, Any, Tuple
from app.services.translation.base import BaseTranslationProvider, UnsupportedLanguagePairError

class MockTranslationProvider(BaseTranslationProvider):
    """
    Test-only mock translation provider.
    Always adds clear test markers to ensure it is never confused with real translations.
    """

    def __init__(self, is_available: bool = True):
        self._is_available = is_available
        self._status = "READY" if is_available else "MODEL_UNAVAILABLE"

    @property
    def provider_name(self) -> str:
        return "test_mock_provider"

    @property
    def model_name(self) -> str:
        return "mock-translation-v1"

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    @property
    def supported_language_pairs(self) -> List[Tuple[str, str]]:
        langs = ["en", "hi", "mr", "ta"]
        pairs = []
        for s in langs:
            for t in langs:
                if s != t:
                    pairs.append((s, t))
        return pairs

    def _normalize_code(self, lang: str) -> str:
        l = lang.lower().strip()
        mapping = {
            "en": "en", "english": "en",
            "hi": "hi", "hindi": "hi",
            "mr": "mr", "marathi": "mr",
            "ta": "ta", "tamil": "ta",
        }
        return mapping.get(l, l[:2])

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str
    ) -> Tuple[str, Dict[str, Any]]:
        if not self._is_available:
            from app.services.translation.base import TranslationUnavailableError
            raise TranslationUnavailableError("Mock translation provider is configured as unavailable.")

        src = self._normalize_code(source_language)
        tgt = self._normalize_code(target_language)
        if (src, tgt) not in self.supported_language_pairs:
            raise UnsupportedLanguagePairError(f"Unsupported language pair: {source_language} -> {target_language}")

        translated_text = f"[{tgt.upper()} TEST TRANSLATION of: {text}]"
        meta = {
            "provider": self.provider_name,
            "model": self.model_name,
            "model_version": "0.1-mock",
            "source_language": source_language,
            "target_language": target_language,
            "is_fallback": True,
            "is_test_mock": True,
            "layer": "MACHINE_GENERATED",
            "label": "MACHINE-GENERATED TRANSLATION (TEST MOCK)"
        }
        return translated_text, meta

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "model_name": self.model_name,
            "status": self._status,
            "is_available": self._is_available,
            "is_test_mock": True
        }
