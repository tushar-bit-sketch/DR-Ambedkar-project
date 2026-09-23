import logging
from typing import List, Tuple, Dict, Any, Optional

from app.services.search.vector_store.base import BaseVectorStore

logger = logging.getLogger("archive.search.vector_store.qdrant")

class QdrantVectorStore(BaseVectorStore):
    """
    Qdrant Vector Database Integration Interface.
    Allows swappable vector persistence to dedicated Qdrant clusters.
    """

    def __init__(self, host: str = "localhost", port: int = 6333, collection_name: str = "ambedkar_archive"):
        self.host = host
        self.port = port
        self.collection_name = collection_name
        self._client = None
        self._initialize_client()

    def _initialize_client(self):
        try:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(host=self.host, port=self.port, timeout=5)
            logger.info(f"Qdrant client initialized for collection '{self.collection_name}'.")
        except Exception as e:
            logger.warning(f"Qdrant client unavailable ({e}). Running in placeholder configuration.")
            self._client = None

    @property
    def backend_name(self) -> str:
        return "QDRANT_CLUSTER"

    @property
    def is_production_grade(self) -> bool:
        return True

    def store_vector(self, chunk_id: int, vector: List[float], dimension: int) -> None:
        if not self._client:
            raise RuntimeError("Qdrant client is not connected.")
        # PointStruct upsert
        from qdrant_client.models import PointStruct
        self._client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(id=chunk_id, vector=vector, payload={"chunk_id": chunk_id})]
        )

    def search_similarity(
        self,
        query_vector: List[float],
        top_k: int = 20,
        candidate_chunk_ids: Optional[List[int]] = None
    ) -> List[Tuple[int, float]]:
        if not self._client:
            raise RuntimeError("Qdrant client is not connected.")
        
        search_result = self._client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=top_k
        )
        return [(hit.id, float(hit.score)) for hit in search_result]

    def delete_vector(self, chunk_id: int) -> None:
        if self._client:
            self._client.delete(collection_name=self.collection_name, points_selector=[chunk_id])

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "backend": "QDRANT_CLUSTER",
            "label": "DEDICATED VECTOR CLUSTER (QDRANT)",
            "is_production_grade": True,
            "connected": self._client is not None,
            "host": self.host,
            "port": self.port,
            "collection": self.collection_name
        }
