"""
Factory for Translation Providers.
Selects appropriate translation engine based on configuration and availability.
Honors Condition 2 & 3:
- Never falsely claims IndicTrans2 is operational.
- Transparently labels Gemma 3 1B as fallback.
"""

import logging
from typing import Optional
from app.core.config import settings
from app.services.translation.base import BaseTranslationProvider
from app.services.translation.indictrans2 import IndicTrans2Provider
from app.services.translation.gemma_fallback import GemmaFallbackTranslationProvider
from app.services.translation.mock_provider import MockTranslationProvider

logger = logging.getLogger("archive.translation.factory")

_cached_provider: Optional[BaseTranslationProvider] = None

def get_translation_provider(provider_type: Optional[str] = None) -> BaseTranslationProvider:
    """
    Returns an instance of BaseTranslationProvider.
    If provider_type is not passed, reads settings.TRANSLATION_PROVIDER.
    """
    target = (provider_type or settings.TRANSLATION_PROVIDER or "auto").lower()

    if target == "mock_test":
        return MockTranslationProvider(is_available=True)
    elif target == "indictrans2":
        return IndicTrans2Provider(model_path=settings.INDICTRANS2_MODEL_PATH)
    elif target in ("gemma_fallback", "gemma", "ollama"):
        return GemmaFallbackTranslationProvider()
    elif target == "auto":
        # Check IndicTrans2 first (primary production target)
        indic = IndicTrans2Provider(model_path=settings.INDICTRANS2_MODEL_PATH)
        if indic.is_available:
            logger.info("Using primary IndicTrans2 translation provider.")
            return indic
        
        # Fallback to local Gemma-3 1B if available
        gemma = GemmaFallbackTranslationProvider()
        if gemma.is_available:
            logger.info("IndicTrans2 unavailable. Using Gemma 3 1B fallback translation provider.")
            return gemma

        # Default to IndicTrans2 so it accurately reports MODEL_UNAVAILABLE
        logger.info("No active translation model found. Defaulting to IndicTrans2 (reporting MODEL_UNAVAILABLE).")
        return indic
    else:
        logger.warning(f"Unknown translation provider '{target}', falling back to IndicTrans2.")
        return IndicTrans2Provider(model_path=settings.INDICTRANS2_MODEL_PATH)
