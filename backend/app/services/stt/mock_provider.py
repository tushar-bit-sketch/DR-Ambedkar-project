"""
Mock STT Provider for unit and regression testing.
Explicitly tagged as TEST_MOCK.
"""

from typing import List, Dict, Any, Tuple, Optional
from app.services.stt.base import BaseSTTProvider

class MockSTTProvider(BaseSTTProvider):
    """
    Test-only mock STT provider.
    """

    def __init__(self, is_available: bool = True, mock_text: str = "What were Dr. Ambedkar's views on the Poona Pact?"):
        self._is_available = is_available
        self._status = "READY" if is_available else "STT_UNAVAILABLE"
        self._mock_text = mock_text

    @property
    def provider_name(self) -> str:
        return "mock_stt_provider"

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def supported_languages(self) -> List[str]:
        return ["en", "hi", "mr", "ta"]

    def transcribe(
        self,
        audio_file_path: str,
        language: Optional[str] = None
    ) -> Tuple[str, Dict[str, Any]]:
        if not self._is_available:
            from app.services.stt.base import STTUnavailableError
            raise STTUnavailableError("Mock STT Provider is configured as unavailable.")

        meta = {
            "provider": self.provider_name,
            "detected_language": language or "en",
            "is_test_mock": True
        }
        return self._mock_text, meta

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": self._status,
            "is_available": self._is_available,
            "is_test_mock": True
        }
