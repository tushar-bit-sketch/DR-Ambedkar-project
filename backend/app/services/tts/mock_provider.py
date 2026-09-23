"""
Mock TTS Provider for automated unit and regression testing.
Explicitly tagged as TEST_MOCK.
Generates minimal valid PCM WAV files with genuine checksums.
"""

import os
import wave
import struct
import hashlib
from typing import List, Dict, Any, Tuple, Optional

from app.services.tts.base import BaseTTSProvider

class MockTTSProvider(BaseTTSProvider):
    """
    Test-only mock TTS provider that produces real, playable, minimal WAV files.
    """

    def __init__(self, is_available: bool = True):
        self._is_available = is_available
        self._status = "READY" if is_available else "TTS_UNAVAILABLE"

    @property
    def provider_name(self) -> str:
        return "mock_tts_provider"

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def supported_languages(self) -> List[str]:
        return ["en", "hi", "mr", "ta"]

    def available_voices(self) -> List[Dict[str, Any]]:
        return [
            {"name": "Mock Narrator En", "language": "en", "gender": "Neutral"},
            {"name": "Mock Narrator Hi", "language": "hi", "gender": "Neutral"},
        ]

    def synthesize(
        self,
        text: str,
        language: str,
        output_file_path: str,
        voice: Optional[str] = None
    ) -> Tuple[str, float, int, str]:
        if not self._is_available:
            from app.services.tts.base import TTSUnavailableError
            raise TTSUnavailableError("Mock TTS Provider configured as unavailable.")

        os.makedirs(os.path.dirname(os.path.abspath(output_file_path)), exist_ok=True)

        # Generate 0.5 seconds of silence in 16kHz 16-bit mono WAV
        sample_rate = 16000
        duration = 0.5
        num_samples = int(sample_rate * duration)

        with wave.open(output_file_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            raw_data = struct.pack(f"<{num_samples}h", *([0] * num_samples))
            wf.writeframes(raw_data)

        file_size = os.path.getsize(output_file_path)
        with open(output_file_path, "rb") as f:
            sha256 = hashlib.sha256(f.read()).hexdigest()

        return output_file_path, duration, file_size, sha256

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": self._status,
            "is_available": self._is_available,
            "is_test_mock": True
        }
