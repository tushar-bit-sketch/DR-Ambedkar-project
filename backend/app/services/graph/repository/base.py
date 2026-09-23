"""
Base Graph Repository Interface.
Defines the contract for graph data storage, neighbor traversal, pathfinding,
and entity-relationship querying across Neo4j and PostgreSQL backends.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseGraphRepository(ABC):
    """
    Abstract Graph Repository.
    Guarantees consistent CRUD, traversal, and status reporting regardless of
    whether the underlying engine is Neo4j or the PostgreSQL/SQLite fallback.
    """

    @property
    @abstractmethod
    def backend_name(self) -> str:
        """Returns 'neo4j' or 'postgres_fallback'."""
        pass

    @property
    @abstractmethod
    def is_operational(self) -> bool:
        """Returns True if the backend is connected and ready."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Returns structured diagnostic status dict."""
        pass

    @abstractmethod
    def create_entity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_entity(self, entity_id: int) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_entity_by_canonical_name(self, canonical_name: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def add_alias(self, entity_id: int, alias_name: str, notes: Optional[str] = None) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_entity_aliases(self, entity_id: int) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def update_entity(self, entity_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def search_entities(
        self,
        query: str,
        entity_types: Optional[List[str]] = None,
        verification_status: Optional[str] = None,
        access_level: str = "PUBLIC",
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def create_relationship(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_relationship(self, rel_id: int) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def update_relationship(self, rel_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_relationships(
        self,
        entity_id: Optional[int] = None,
        direction: str = "BOTH",
        relationship_types: Optional[List[str]] = None,
        verification_status: Optional[str] = None,
        access_level: str = "PUBLIC",
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_neighbors(
        self,
        entity_id: int,
        depth: int = 1,
        limit: int = 50,
        access_level: str = "PUBLIC",
        verified_only: bool = True
    ) -> Dict[str, Any]:
        """
        Traverses graph neighbors up to depth (bounded by max depth limit).
        Returns {'nodes': [...], 'edges': [...]}
        """
        pass

    @abstractmethod
    def find_path(
        self,
        source_id: int,
        target_id: int,
        max_depth: int = 3,
        access_level: str = "PUBLIC"
    ) -> List[Dict[str, Any]]:
        """Finds shortest path between two entities."""
        pass

    @abstractmethod
    def delete_relationship(self, rel_id: int) -> bool:
        pass

    @abstractmethod
    def get_overview_stats(self) -> Dict[str, Any]:
        """Returns node count, edge count, types breakdown, and verification stats."""
        pass
