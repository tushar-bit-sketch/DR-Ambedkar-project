"""
Factory for TTS Providers.
Selects appropriate speech synthesis engine based on configuration and platform.
"""

import logging
from typing import Optional
from app.core.config import settings
from app.services.tts.base import BaseTTSProvider
from app.services.tts.windows_sapi import WindowsSAPITTSProvider
from app.services.tts.piper_provider import PiperTTSProvider
from app.services.tts.mock_provider import MockTTSProvider

logger = logging.getLogger("archive.tts.factory")

def get_tts_provider(provider_type: Optional[str] = None) -> BaseTTSProvider:
    """
    Returns an instance of BaseTTSProvider.
    """
    target = (provider_type or settings.TTS_PROVIDER or "auto").lower()

    if target == "mock_test":
        return MockTTSProvider(is_available=True)
    elif target in ("windows_sapi", "sapi"):
        return WindowsSAPITTSProvider()
    elif target == "piper":
        return PiperTTSProvider()
    elif target == "auto":
        # On Windows, try Windows SAPI first
        sapi = WindowsSAPITTSProvider()
        if sapi.is_available:
            return sapi
        
        piper = PiperTTSProvider()
        if piper.is_available:
            return piper

        return sapi
    else:
        logger.warning(f"Unknown TTS provider '{target}', defaulting to Windows SAPI.")
        return WindowsSAPITTSProvider()
