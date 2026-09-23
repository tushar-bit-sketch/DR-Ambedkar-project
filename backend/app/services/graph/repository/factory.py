"""
Graph Repository Factory.
Instantiates Neo4j or PostgreSQL graph repository based on configuration and operational health.
"""

from typing import Optional
import logging
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.graph.repository.base import BaseGraphRepository
from app.services.graph.repository.postgres_repo import PostgreSQLGraphRepository
from app.services.graph.repository.neo4j_repo import Neo4jGraphRepository

logger = logging.getLogger("archive.graph.factory")

def get_graph_repository(db: Session, force_backend: Optional[str] = None) -> BaseGraphRepository:
    """
    Returns an operational graph repository.
    Falls back gracefully to PostgreSQLGraphRepository if Neo4j is offline or unconfigured.
    """
    target = (force_backend or settings.GRAPH_BACKEND or "postgres").lower().strip()

    if target == "neo4j":
        neo = Neo4jGraphRepository()
        if neo.is_operational:
            return neo
        logger.warning(
            "GRAPH_BACKEND='neo4j' was configured, but Neo4j is offline or driver is missing. "
            "Transparently reporting GRAPH_BACKEND_DEGRADED and falling back to PostgreSQL relational repository."
        )

    return PostgreSQLGraphRepository(db)
