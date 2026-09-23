from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional

class LLMUnavailableError(RuntimeError):
    """Raised when the configured LLM provider service is offline or unreachable."""
    pass

class BaseLLMProvider(ABC):
    """
    Abstract LLM Provider interface for Archival RAG.
    Enforces strict availability checking and forbids fake answers.
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
        """Returns 'READY' or 'LLM_UNAVAILABLE'."""
        pass

    @abstractmethod
    def generate_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        max_tokens: int = 1024
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Generates completion from messages list:
        [{'role': 'system', 'content': '...'}, {'role': 'user', 'content': '...'}]
        Returns (generated_text, diagnostic_metadata).
        Must raise LLMUnavailableError if provider cannot fulfill request.
        """
        pass

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 1024
    ) -> Dict[str, Any]:
        """Convenience method accepting system and user prompt strings."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        text, meta = self.generate_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return {
            "content": text,
            "tokens_used": meta.get("usage", meta.get("tokens_used", {})),
            "metadata": meta
        }

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns provider health, base URL (redacted), and model configuration."""
        pass
