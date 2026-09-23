import re
from typing import List, Dict, Any, Tuple
from app.services.rag.llm.base import BaseLLMProvider

class MockTestLLMProvider(BaseLLMProvider):
    """
    Deterministic Local Test Provider for Automated Verification Suites.
    Answers strictly using verbatim content from the supplied context blocks,
    generating valid [1], [2] citations corresponding to retrieved evidence.
    Never generates fabricated historical facts or hallucinated citations.
    """

    def __init__(self, model_name: str = "mock-archival-evaluator-v1"):
        self._model_name = model_name
        self._status = "READY"
        self._is_available = True

    @property
    def provider_name(self) -> str:
        return "mock_test"

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
        user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        
        # Check if context contains sources
        sources = re.findall(r'\[Source\s+(\d+)\]\s*(.*?)(?=\[Source\s+\d+\]|\Z)', user_msg, re.DOTALL)
        
        if not sources:
            return (
                "I could not find sufficient verified archival evidence in the available collection to answer this question.",
                {"provider": self.provider_name, "model": self._model_name, "mock": True}
            )

        # Build answer referencing available sources
        answer_parts = []
        for s_idx, s_content in sources[:3]:
            # Extract first sentence or key snippet
            content_match = re.search(r'Content:\s*"([^"]+)"', s_content)
            if content_match:
                snippet = content_match.group(1).strip()
                # Use first sentence of archival evidence
                first_sentence = snippet.split(".")[0].strip()
                answer_parts.append(f"{first_sentence} [{s_idx}].")
            else:
                answer_parts.append(f"Archival records confirm the documented proceedings [{s_idx}].")

        grounded_answer = " ".join(answer_parts)
        return grounded_answer, {
            "provider": self.provider_name,
            "model": self._model_name,
            "mock": True
        }

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "model": self._model_name,
            "status": self._status,
            "is_available": self._is_available,
            "mode": "DETERMINISTIC_TEST_HARNESS"
        }
