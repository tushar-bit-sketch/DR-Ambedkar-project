import time
import logging
from typing import List, Dict, Any, Tuple, Optional
import httpx

from app.services.rag.llm.base import BaseLLMProvider, LLMUnavailableError
from app.core.config import settings

logger = logging.getLogger("archive.rag.llm.ollama")

_OLLAMA_PROBE_CACHE = {
    "checked_at": 0.0,
    "is_available": False,
    "status": "UNINITIALIZED",
    "last_error": None
}
_PROBE_CACHE_TTL = 10.0  # seconds

class OllamaLLMProvider(BaseLLMProvider):
    """
    Client for local Ollama API (http://localhost:11434/api/chat).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None
    ):
        self._base_url = (base_url or settings.LLM_BASE_URL or "http://localhost:11434").rstrip("/")
        self._model_name = model_name or settings.LLM_MODEL or "llama3"
        self._status = "UNINITIALIZED"
        self._is_available = False
        self._last_error = None

        self._check_availability()

    def _check_availability(self):
        now = time.time()
        if (now - _OLLAMA_PROBE_CACHE["checked_at"]) < _PROBE_CACHE_TTL:
            self._status = _OLLAMA_PROBE_CACHE["status"]
            self._is_available = _OLLAMA_PROBE_CACHE["is_available"]
            self._last_error = _OLLAMA_PROBE_CACHE["last_error"]
            return

        try:
            resp = httpx.get(f"{self._base_url}/api/tags", timeout=0.5)
            if resp.status_code == 200:
                self._status = "READY"
                self._is_available = True
                self._last_error = None
                logger.info(f"Ollama server connected at {self._base_url}")
            else:
                self._status = "LLM_UNAVAILABLE"
                self._is_available = False
                self._last_error = f"Ollama returned status {resp.status_code}"
        except Exception as e:
            self._status = "LLM_UNAVAILABLE"
            self._is_available = False
            self._last_error = f"Ollama unreachable: {str(e)}"
            logger.warning(f"Ollama endpoint unreachable at {self._base_url}: {e}")

        _OLLAMA_PROBE_CACHE["checked_at"] = now
        _OLLAMA_PROBE_CACHE["is_available"] = self._is_available
        _OLLAMA_PROBE_CACHE["status"] = self._status
        _OLLAMA_PROBE_CACHE["last_error"] = self._last_error

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def generate_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        max_tokens: int = 1024
    ) -> Tuple[str, Dict[str, Any]]:
        if not self._is_available:
            raise LLMUnavailableError(f"LLM_UNAVAILABLE: {self._last_error or 'Ollama not running'}")

        payload = {
            "model": self._model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }

        try:
            resp = httpx.post(f"{self._base_url}/api/chat", json=payload, timeout=45.0)
            resp.raise_for_status()
            data = resp.json()
            content = data["message"]["content"]
            meta = {
                "provider": self.provider_name,
                "model": self._model_name,
                "total_duration": data.get("total_duration")
            }
            return content, meta
        except Exception as e:
            logger.error(f"Ollama inference error: {e}")
            raise LLMUnavailableError(f"LLM_UNAVAILABLE: {str(e)}")

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "model": self._model_name,
            "status": self._status,
            "is_available": self._is_available,
            "base_url": self._base_url,
            "last_error": self._last_error
        }
