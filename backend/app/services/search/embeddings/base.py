from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseEmbeddingProvider(ABC):
    """
    Abstract interface for multilingual archival embedding models.
    Enables modular swapping of embedding providers without altering retrieval code.
    """

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Returns the canonical model identifier (e.g. 'BAAI/bge-m3')."""
        pass

    @property
    @abstractmethod
    def model_version(self) -> str:
        """Returns the version or revision of the model."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Returns the verified embedding dimension (verified at runtime)."""
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if model weights and neural inference engine are operational."""
        pass

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """
        Embeds a single query or passage string into a normalized dense vector.
        Raises RuntimeError if model is unavailable. NEVER generates fake/random vectors.
        """
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Embeds a batch of passages into normalized dense vectors.
        Raises RuntimeError if model is unavailable.
        """
        pass

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns operational diagnostics, provider status, and hardware/device info."""
        pass
