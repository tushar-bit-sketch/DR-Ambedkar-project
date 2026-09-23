import logging
from typing import Optional

from app.core.config import settings
from app.services.rag.llm.base import BaseLLMProvider
from app.services.rag.llm.openai_compatible import OpenAICompatibleLLMProvider
from app.services.rag.llm.ollama import OllamaLLMProvider
from app.services.rag.llm.mock_test import MockTestLLMProvider

logger = logging.getLogger("archive.rag.llm.factory")

def get_llm_provider(provider_override: Optional[str] = None) -> BaseLLMProvider:
    """
    Factory creating the configured LLM provider.
    Never returns fake answers if the configured model is unavailable.
    """
    provider_name = (provider_override or settings.LLM_PROVIDER or "openai_compatible").lower().strip()

    if provider_name in ["openai_compatible", "openai", "vllm", "lm_studio", "groq"]:
        return OpenAICompatibleLLMProvider(
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
            model_name=settings.LLM_MODEL
        )
    elif provider_name in ["ollama", "local_ollama"]:
        return OllamaLLMProvider(
            base_url=settings.LLM_BASE_URL or "http://localhost:11434",
            model_name=settings.LLM_MODEL or "llama3"
        )
    elif provider_name in ["mock_test", "test"]:
        return MockTestLLMProvider(
            model_name=settings.LLM_MODEL or "mock-archival-evaluator-v1"
        )
    else:
        logger.warning(f"Unknown LLM_PROVIDER '{provider_name}'. Defaulting to OpenAICompatibleLLMProvider.")
        return OpenAICompatibleLLMProvider()
