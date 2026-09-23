"""
Factory for STT Providers.
"""

import logging
from typing import Optional
from app.core.config import settings
from app.services.stt.base import BaseSTTProvider
from app.services.stt.whisper_provider import WhisperSTTProvider
from app.services.stt.mock_provider import MockSTTProvider

logger = logging.getLogger("archive.stt.factory")

def get_stt_provider(provider_type: Optional[str] = None) -> BaseSTTProvider:
    target = (provider_type or settings.STT_PROVIDER or "auto").lower()

    if target == "mock_test":
        return MockSTTProvider(is_available=True)
    elif target == "whisper":
        return WhisperSTTProvider()
    elif target == "auto":
        whisper = WhisperSTTProvider()
        return whisper
    else:
        logger.warning(f"Unknown STT provider '{target}', defaulting to Whisper.")
        return WhisperSTTProvider()
