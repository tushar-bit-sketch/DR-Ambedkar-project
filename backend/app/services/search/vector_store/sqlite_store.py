import logging
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.services.search.vector_store.base import BaseVectorStore
from app.db.models import SearchChunk

logger = logging.getLogger("archive.search.vector_store.sqlite")

class SqliteVectorStore(BaseVectorStore):
    """
    =============================================================================
    DEVELOPMENT/TEST ONLY FALLBACK — NOT PRODUCTION ARCHITECTURE
    =============================================================================
    This SQLite vector store provides persistent binary vector storage in SQLite
    for local development, debugging, and automated test environments.
    
    Production deployments MUST use PostgreSQL + pgvector (or Qdrant).
    Never present this fallback as production architecture.
    =============================================================================
    """

    def __init__(self, db: Session):
        self.db = db
        logger.warning(
            "ACTIVE VECTOR BACKEND: SqliteVectorStore (DEVELOPMENT/TEST ONLY FALLBACK). "
            "PostgreSQL + pgvector remains the primary production vector architecture."
        )

    @property
    def backend_name(self) -> str:
        return "SQLITE_DEV_FALLBACK"

    @property
    def is_production_grade(self) -> bool:
        return False

    def store_vector(self, chunk_id: int, vector: List[float], dimension: int) -> None:
        """Stores float32 serialized array in the SQLite SearchChunk record."""
        chunk = self.db.query(SearchChunk).filter(SearchChunk.id == chunk_id).first()
        if not chunk:
            raise ValueError(f"SearchChunk #{chunk_id} not found.")

        # Serialize as compact float32 binary buffer
        vec_arr = np.array(vector, dtype=np.float32)
        chunk.embedding_vector = vec_arr.tobytes()
        chunk.embedding_dim = dimension
        chunk.is_normalized = True
        self.db.commit()

    def search_similarity(
        self,
        query_vector: List[float],
        top_k: int = 20,
        candidate_chunk_ids: Optional[List[int]] = None
    ) -> List[Tuple[int, float]]:
        """
        Calculates exact cosine similarity across persisted candidate vectors using numpy.
        Returns List of (chunk_id, similarity_score) sorted descending.
        """
        if not query_vector:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        query = self.db.query(SearchChunk.id, SearchChunk.embedding_vector).filter(
            SearchChunk.status == "INDEXED",
            SearchChunk.embedding_vector.isnot(None)
        )

        if candidate_chunk_ids is not None:
            if len(candidate_chunk_ids) == 0:
                return []
            query = query.filter(SearchChunk.id.in_(candidate_chunk_ids))

        rows = query.all()
        if not rows:
            return []

        results: List[Tuple[int, float]] = []
        for chunk_id, vec_bytes in rows:
            if not vec_bytes:
                continue
            chunk_vec = np.frombuffer(vec_bytes, dtype=np.float32)
            c_norm = np.linalg.norm(chunk_vec)
            if c_norm > 0:
                chunk_vec = chunk_vec / c_norm
            
            # Cosine similarity is dot product of normalized vectors
            sim = float(np.dot(q_vec, chunk_vec))
            results.append((chunk_id, round(sim, 5)))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def delete_vector(self, chunk_id: int) -> None:
        chunk = self.db.query(SearchChunk).filter(SearchChunk.id == chunk_id).first()
        if chunk:
            chunk.embedding_vector = None
            self.db.commit()

    def get_diagnostics(self) -> Dict[str, Any]:
        count = self.db.query(SearchChunk).filter(
            SearchChunk.embedding_vector.isnot(None),
            SearchChunk.status == "INDEXED"
        ).count()
        return {
            "backend": "SQLITE_DEV_FALLBACK",
            "label": "DEVELOPMENT/TEST ONLY FALLBACK (NOT PRODUCTION ARCHITECTURE)",
            "is_production_grade": False,
            "indexed_vector_count": count,
            "similarity_metric": "COSINE",
            "storage_type": "BLOB_FLOAT32"
        }
