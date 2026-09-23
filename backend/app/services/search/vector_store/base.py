from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any, Optional

class BaseVectorStore(ABC):
    """
    Abstract Vector Database Abstraction.
    Allows swappable vector persistence backends:
    - PostgreSQL + pgvector (Primary Production Backend)
    - SQLite binary storage (Development / Test Fallback Only)
    - Qdrant cluster integration
    """

    @property
    @abstractmethod
    def backend_name(self) -> str:
        """Identifier for the vector store."""
        pass

    @property
    @abstractmethod
    def is_production_grade(self) -> bool:
        """Returns True only for production vector engines (e.g. pgvector, Qdrant)."""
        pass

    @abstractmethod
    def store_vector(self, chunk_id: int, vector: List[float], dimension: int) -> None:
        """Persists dense vector for an archival chunk."""
        pass

    @abstractmethod
    def search_similarity(
        self,
        query_vector: List[float],
        top_k: int = 20,
        candidate_chunk_ids: Optional[List[int]] = None
    ) -> List[Tuple[int, float]]:
        """
        Executes vector similarity search using cosine distance.
        Returns List of (chunk_id, similarity_score) sorted descending by similarity.
        """
        pass

    @abstractmethod
    def delete_vector(self, chunk_id: int) -> None:
        """Deletes or purges vector for a chunk."""
        pass

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns storage diagnostics, vector count, index type, and production status."""
        pass
