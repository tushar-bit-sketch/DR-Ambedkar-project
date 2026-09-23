"""
Gemma 3 1B Fallback Translation Provider.
Strictly adheres to Condition 3:
Uses the local instruction model (gemma-3:1b) only as an explicitly identified fallback.
Labels all output as MACHINE-GENERATED TRANSLATION.
Never represents output as IndicTrans2.
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
import httpx

from app.services.translation.base import (
    BaseTranslationProvider, TranslationUnavailableError, UnsupportedLanguagePairError
)
from app.core.config import settings

logger = logging.getLogger("archive.translation.gemma_fallback")

class GemmaFallbackTranslationProvider(BaseTranslationProvider):
    """
    Fallback translation engine using the active local LLM (Ollama gemma-3:1b).
    Strictly preserves historical terminology, proper names, and legal concepts.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None
    ):
        self._base_url = (base_url or settings.LLM_BASE_URL or "http://localhost:11434").rstrip("/")
        self._model_name = model_name or "gemma-3:1b"
        self._status = "UNINITIALIZED"
        self._is_available = False
        self._last_error = None

        self._check_availability()

    def _check_availability(self):
        try:
            resp = httpx.get(f"{self._base_url}/api/tags", timeout=2.0)
            if resp.status_code == 200:
                self._status = "READY"
                self._is_available = True
                self._last_error = None
            else:
                self._status = "MODEL_UNAVAILABLE"
                self._is_available = False
                self._last_error = f"Service returned status {resp.status_code}"
        except Exception as e:
            self._status = "MODEL_UNAVAILABLE"
            self._is_available = False
            self._last_error = str(e)

    @property
    def provider_name(self) -> str:
        return "gemma_fallback_llm"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    @property
    def supported_language_pairs(self) -> List[Tuple[str, str]]:
        # Supports translation between English, Hindi, Marathi, Tamil
        langs = ["en", "hi", "mr", "ta"]
        pairs = []
        for s in langs:
            for t in langs:
                if s != t:
                    pairs.append((s, t))
        return pairs

    def _normalize_lang_name(self, code_or_name: str) -> str:
        code = code_or_name.lower().strip()
        names = {
            "en": "English", "english": "English",
            "hi": "Hindi", "hindi": "Hindi",
            "mr": "Marathi", "marathi": "Marathi",
            "ta": "Tamil", "tamil": "Tamil"
        }
        return names.get(code, code_or_name)

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str
    ) -> Tuple[str, Dict[str, Any]]:
        if not self._is_available:
            raise TranslationUnavailableError(
                f"TRANSLATION_UNAVAILABLE: Local translation service ({self._base_url}) unreachable: {self._last_error}"
            )

        src_norm = self._normalize_lang_name(source_language)
        tgt_norm = self._normalize_lang_name(target_language)

        system_instruction = (
            "You are a scholarly archival translation engine for the Dr. B.R. Ambedkar Digital Heritage Archive.\n"
            f"Translate the following approved archival historical text from {src_norm} to {tgt_norm}.\n"
            "CRITICAL ARCHIVAL RULES:\n"
            "1. Faithfully preserve historical terminology, proper names, legal citations, and constitutional concepts.\n"
            "2. Do NOT summarize, explain, or editorialize. Provide ONLY the direct translation.\n"
            "3. Maintain original paragraph boundaries.\n"
            "4. Clearly adhere to the target language script (e.g. Devanagari for Hindi/Marathi, Tamil script for Tamil).\n"
        )

        user_content = f"Historical Archival Text to Translate:\n\"\"\"\n{text.strip()}\n\"\"\""

        payload = {
            "model": self._model_name,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content}
            ],
            "stream": False,
            "options": {
                "temperature": 0.0, # Deterministic translation
                "num_predict": 1024
            }
        }

        try:
            resp = httpx.post(f"{self._base_url}/api/chat", json=payload, timeout=60.0)
            resp.raise_for_status()
            data = resp.json()
            translated = data["message"]["content"].strip()
            
            # Remove wrapper quotes if the model wrapped the translation
            if translated.startswith('"""') and translated.endswith('"""'):
                translated = translated[3:-3].strip()

            meta = {
                "provider": self.provider_name,
                "model": self._model_name,
                "model_version": "1.0",
                "source_language": src_norm,
                "target_language": tgt_norm,
                "is_fallback": True,
                "layer": "MACHINE_GENERATED",
                "label": "MACHINE-GENERATED TRANSLATION",
                "total_duration": data.get("total_duration")
            }
            return translated, meta
        except Exception as e:
            logger.error(f"Gemma translation error: {e}")
            raise TranslationUnavailableError(f"TRANSLATION_UNAVAILABLE: Translation generation failed: {e}")

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "model_name": self._model_name,
            "status": self._status,
            "is_available": self._is_available,
            "base_url": self._base_url,
            "is_fallback": True,
            "last_error": self._last_error
        }
