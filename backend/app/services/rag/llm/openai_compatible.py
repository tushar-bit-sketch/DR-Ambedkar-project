import logging
from typing import List, Dict, Any, Tuple, Optional
import httpx

from app.services.rag.llm.base import BaseLLMProvider, LLMUnavailableError
from app.core.config import settings

logger = logging.getLogger("archive.rag.llm.openai_compatible")

class OpenAICompatibleLLMProvider(BaseLLMProvider):
    """
    Client for any OpenAI-compatible Chat Completions endpoint:
    vLLM, LM Studio, Ollama /v1, LocalAI, Groq, OpenAI, etc.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None
    ):
        self._base_url = (base_url or settings.LLM_BASE_URL or "").rstrip("/")
        self._api_key = api_key or settings.LLM_API_KEY
        self._model_name = model_name or settings.LLM_MODEL or "meta-llama/Llama-3-8B-Instruct"
        self._status = "UNINITIALIZED"
        self._is_available = False
        self._last_error = None

        self._check_availability()

    def _check_availability(self):
        if not self._base_url:
            self._status = "LLM_UNAVAILABLE"
            self._is_available = False
            self._last_error = "LLM_BASE_URL is not configured."
            logger.warning("OpenAI-compatible LLM provider unconfigured (no LLM_BASE_URL).")
            return

        try:
            # Ping endpoint models list or root with short timeout
            headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}
            resp = httpx.get(f"{self._base_url}/models", headers=headers, timeout=2.5)
            if resp.status_code in [200, 401, 403]: # 401/403 means host exists but auth needed
                self._status = "READY"
                self._is_available = True
                self._last_error = None
                logger.info(f"OpenAI-compatible LLM endpoint verified at {self._base_url}")
            else:
                self._status = "LLM_UNAVAILABLE"
                self._is_available = False
                self._last_error = f"Server returned status {resp.status_code}"
        except Exception as e:
            self._status = "LLM_UNAVAILABLE"
            self._is_available = False
            self._last_error = f"Connection failed: {str(e)}"
            logger.warning(f"OpenAI-compatible LLM endpoint unreachable at {self._base_url}: {e}")

    @property
    def provider_name(self) -> str:
        return "openai_compatible"

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
        """
        Calls /chat/completions.
        Fails fast if unavailable. NEVER produces synthetic responses.
        """
        if not self._is_available:
            raise LLMUnavailableError(f"LLM_UNAVAILABLE: {self._last_error or 'Provider not connected'}")

        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        payload = {
            "model": self._model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            resp = httpx.post(
                f"{self._base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=45.0
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            meta = {
                "provider": self.provider_name,
                "model": self._model_name,
                "usage": data.get("usage", {}),
                "finish_reason": data["choices"][0].get("finish_reason")
            }
            return content, meta
        except Exception as e:
            logger.error(f"Inference request failed to {self._base_url}: {e}")
            raise LLMUnavailableError(f"LLM_UNAVAILABLE: {str(e)}")

    def get_diagnostics(self) -> Dict[str, Any]:
        redacted_url = self._base_url
        if "@" in redacted_url:
            redacted_url = redacted_url.split("@")[-1]
        return {
            "provider": self.provider_name,
            "model": self._model_name,
            "status": self._status,
            "is_available": self._is_available,
            "base_url": redacted_url or None,
            "last_error": self._last_error
        }
