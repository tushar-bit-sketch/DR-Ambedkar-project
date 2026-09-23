import logging
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.search.vector_store.base import BaseVectorStore
from app.services.search.vector_store.pgvector_store import PgVectorStore
from app.services.search.vector_store.sqlite_store import SqliteVectorStore
from app.services.search.vector_store.qdrant_store import QdrantVectorStore

logger = logging.getLogger("archive.search.vector_store.factory")

def get_vector_store(db: Session) -> BaseVectorStore:
    """
    Factory creating the configured vector store backend.
    
    CRITICAL ARCHIVAL INTEGRITY RULES (Conditions 1, 2, 9, 10):
    - When settings.VECTOR_BACKEND is 'pgvector', PostgreSQL + pgvector is enforced.
      If pgvector is unavailable, it FAILS LOUDLY rather than silently downgrading to SQLite.
    - When settings.VECTOR_BACKEND is 'sqlite_dev_fallback', SqliteVectorStore is used
      and explicitly labeled as DEVELOPMENT/TEST ONLY FALLBACK.
    """
    configured_backend = (settings.VECTOR_BACKEND or "sqlite_dev_fallback").lower().strip()

    if configured_backend in ["pgvector", "postgresql", "postgres"]:
        # Primary Production Architecture: Fails loudly if pgvector is missing
        logger.info("Initializing PostgreSQL + pgvector primary production vector store...")
        return PgVectorStore(db)

    elif configured_backend == "qdrant":
        logger.info("Initializing Qdrant cluster vector store...")
        return QdrantVectorStore()

    elif configured_backend in ["sqlite_dev_fallback", "sqlite", "test"]:
        # Explicit development/test fallback
        return SqliteVectorStore(db)

    else:
        raise ValueError(
            f"Unknown VECTOR_BACKEND configuration: '{configured_backend}'. "
            "Supported options: 'pgvector' (Production), 'sqlite_dev_fallback' (Development/Test), 'qdrant'."
        )
