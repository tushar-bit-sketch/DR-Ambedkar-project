import pytest
from unittest.mock import patch, MagicMock
import httpx

from app.services.rag.llm.huggingface import HuggingFaceLLMProvider
from app.services.rag.llm.base import LLMUnavailableError
from app.services.rag.llm.factory import get_llm_provider

def test_huggingface_unconfigured_availability():
    """Verify provider fails fast and marks unavailable when token is missing."""
    provider = HuggingFaceLLMProvider(token=None, base_url="https://router.huggingface.co/v1")
    assert provider.is_available is False
    assert provider.status == "LLM_UNAVAILABLE"
    assert "HF_TOKEN" in provider.get_diagnostics()["last_error"]

    with pytest.raises(LLMUnavailableError) as exc_info:
        provider.generate_completion(messages=[{"role": "user", "content": "Hello"}])
    assert "HF_TOKEN" in str(exc_info.value)

def test_huggingface_diagnostics_strictly_redacts_token():
    """Verify HF_TOKEN is never exposed in diagnostics or string serialization."""
    secret = "hf_super_secret_token_abc123xyz789"
    with patch("httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        provider = HuggingFaceLLMProvider(
            token=secret,
            base_url="https://router.huggingface.co/v1",
            model_name="meta-llama/Llama-3.1-8B-Instruct"
        )
    
    diag = provider.get_diagnostics()
    assert secret not in str(diag)
    assert diag["has_token"] is True
    assert diag["provider"] == "huggingface"
    assert diag["model"] == "meta-llama/Llama-3.1-8B-Instruct"

def test_huggingface_factory_resolution():
    """Verify get_llm_provider correctly resolves huggingface."""
    provider = get_llm_provider(provider_override="huggingface")
    assert isinstance(provider, HuggingFaceLLMProvider)
    assert provider.provider_name == "huggingface"

def test_huggingface_completion_mocked_success():
    """Verify OpenAI-compatible response parsing from Hugging Face router."""
    with patch("httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        provider = HuggingFaceLLMProvider(
            token="hf_mock_token",
            base_url="https://router.huggingface.co/v1",
            model_name="meta-llama/Llama-3.1-8B-Instruct"
        )

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "chatcmpl-hf-12345",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "On 26th January 1950, we are going to enter into a life of contradictions [AMB-CAD-1949-042]."
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 120,
            "completion_tokens": 35,
            "total_tokens": 155
        }
    }

    with patch("httpx.post", return_value=mock_resp):
        content, meta = provider.generate_completion(
            messages=[{"role": "user", "content": "What did Ambedkar state?"}]
        )

    assert "life of contradictions" in content
    assert meta["provider"] == "huggingface"
    assert meta["model"] == "meta-llama/Llama-3.1-8B-Instruct"
    assert meta["usage"]["total_tokens"] == 155

def test_huggingface_503_model_loading():
    """Verify 503 model-loading returns actionable LLMUnavailableError."""
    with patch("httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        provider = HuggingFaceLLMProvider(
            token="hf_mock_token",
            base_url="https://router.huggingface.co/v1"
        )

    mock_resp = MagicMock()
    mock_resp.status_code = 503
    mock_resp.headers = {"content-type": "application/json"}
    mock_resp.json.return_value = {
        "error": "Model meta-llama/Llama-3.1-8B-Instruct is currently loading",
        "estimated_time": 25.5
    }

    with patch("httpx.post", return_value=mock_resp):
        with pytest.raises(LLMUnavailableError) as exc_info:
            provider.generate_completion(messages=[{"role": "user", "content": "Test"}])
    
    assert "currently loading" in str(exc_info.value)
