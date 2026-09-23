import logging
from typing import List, Dict, Any, Tuple, Optional
import httpx

from app.services.rag.llm.base import BaseLLMProvider, LLMUnavailableError
from app.core.config import settings

logger = logging.getLogger("archive.rag.llm.huggingface")

class HuggingFaceLLMProvider(BaseLLMProvider):
    """
    Hugging Face Inference API Provider utilizing the official OpenAI-compatible router:
    Endpoint: https://router.huggingface.co/v1/chat/completions
    
    Security Contract:
    - HF_TOKEN is never logged, exposed in diagnostics, or sent to client/browser.
    - Zero fake answers. Fails fast with LLMUnavailableError if offline or token is missing.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        model_name: Optional[str] = None
    ):
        raw_base = base_url or settings.HF_BASE_URL or "https://router.huggingface.co/v1"
        self._base_url = raw_base.rstrip("/")
        self._token = token or settings.HF_TOKEN
        self._model_name = model_name or settings.HF_MODEL or "meta-llama/Llama-3.1-8B-Instruct"
        self._status = "UNINITIALIZED"
        self._is_available = False
        self._last_error: Optional[str] = None

        self._check_availability()

    def _check_availability(self):
        """
        Probes the Hugging Face router for authentication and connectivity.
        """
        if not self._token:
            self._status = "LLM_UNAVAILABLE"
            self._is_available = False
            self._last_error = "Hugging Face API token (HF_TOKEN) is not configured in environment."
            logger.info("Hugging Face LLM provider initialized without HF_TOKEN (unconfigured).")
            return

        try:
            headers = {"Authorization": f"Bearer {self._token}"}
            resp = httpx.get(f"{self._base_url}/models", headers=headers, timeout=4.0)
            if resp.status_code == 200:
                self._status = "READY"
                self._is_available = True
                self._last_error = None
                logger.info(f"Hugging Face Inference API connected successfully: model={self._model_name}")
            elif resp.status_code == 401:
                self._status = "LLM_UNAVAILABLE"
                self._is_available = False
                self._last_error = "Hugging Face authentication failed: Invalid or expired HF_TOKEN."
                logger.warning(self._last_error)
            elif resp.status_code == 403:
                self._status = "LLM_UNAVAILABLE"
                self._is_available = False
                self._last_error = f"Hugging Face access forbidden: verify token scope and model agreement ({self._model_name})."
                logger.warning(self._last_error)
            else:
                self._status = "LLM_UNAVAILABLE"
                self._is_available = False
                self._last_error = f"Hugging Face router returned HTTP {resp.status_code}"
                logger.warning(self._last_error)
        except Exception as e:
            self._status = "LLM_UNAVAILABLE"
            self._is_available = False
            self._last_error = f"Failed to connect to Hugging Face router: {str(e)}"
            logger.warning(f"Hugging Face endpoint probe failed ({self._base_url}): {e}")

    @property
    def provider_name(self) -> str:
        return "huggingface"

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
        Executes Chat Completion via Hugging Face Inference API /router/v1.
        Strictly raises LLMUnavailableError on failure. Never produces synthetic text.
        """
        if not self._token:
            raise LLMUnavailableError(
                "LLM_UNAVAILABLE: Hugging Face API token (HF_TOKEN) is not configured on the server."
            )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._token}"
        }

        payload = {
            "model": self._model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        url = f"{self._base_url}/chat/completions"

        try:
            resp = httpx.post(url, headers=headers, json=payload, timeout=60.0)
            
            if resp.status_code == 503:
                err_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                est_time = err_data.get("estimated_time", "unknown")
                msg = f"Hugging Face model {self._model_name} is currently loading (estimated wait: {est_time}s). Please retry."
                logger.warning(msg)
                raise LLMUnavailableError(f"LLM_UNAVAILABLE: {msg}")

            resp.raise_for_status()
            data = resp.json()

            choices = data.get("choices", [])
            if not choices:
                raise LLMUnavailableError("Hugging Face API returned empty choices array.")

            content = choices[0].get("message", {}).get("content", "")
            finish_reason = choices[0].get("finish_reason")
            usage = data.get("usage", {})

            meta = {
                "provider": self.provider_name,
                "model": self._model_name,
                "usage": usage,
                "finish_reason": finish_reason
            }

            return content, meta

        except httpx.HTTPStatusError as hse:
            err_text = hse.response.text[:300]
            logger.error(f"Hugging Face HTTP error {hse.response.status_code}: {err_text}")
            raise LLMUnavailableError(f"LLM_UNAVAILABLE (HTTP {hse.response.status_code}): {err_text}")
        except httpx.TimeoutException:
            logger.error("Hugging Face API inference timed out after 60s.")
            raise LLMUnavailableError("LLM_UNAVAILABLE: Hugging Face inference request timed out.")
        except LLMUnavailableError:
            raise
        except Exception as ex:
            logger.error(f"Hugging Face API request failed: {ex}")
            raise LLMUnavailableError(f"LLM_UNAVAILABLE: {str(ex)}")

    def get_diagnostics(self) -> Dict[str, Any]:
        """
        Returns sanitized operational metadata.
        HF_TOKEN is strictly omitted / redacted.
        """
        return {
            "provider": self.provider_name,
            "model": self._model_name,
            "status": self._status,
            "is_available": self._is_available,
            "base_url": self._base_url,
            "has_token": bool(self._token),
            "last_error": self._last_error
        }
