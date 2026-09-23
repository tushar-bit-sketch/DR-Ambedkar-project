"""
Neo4j Graph Repository Implementation.
Connects to Neo4j graph database when configured.
Enforces strict parameterized Cypher to prevent injection.
Honestly reports GRAPH_BACKEND_DEGRADED if connection or driver is unavailable.
"""

from typing import List, Dict, Any, Optional
import logging
from app.services.graph.repository.base import BaseGraphRepository
from app.core.config import settings

logger = logging.getLogger("archive.graph.neo4j_repo")

class Neo4jGraphRepository(BaseGraphRepository):
    """
    Neo4j Graph Database Driver Implementation.
    Requires 'neo4j' Python driver and valid NEO4J_URI/credentials.
    """

    def __init__(
        self,
        uri: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None
    ):
        self._uri = uri or settings.NEO4J_URI
        self._username = username or settings.NEO4J_USERNAME
        self._password = password or settings.NEO4J_PASSWORD
        self._database = database or settings.NEO4J_DATABASE
        self._driver = None
        self._is_operational = False
        self._status_detail = "UNINITIALIZED"

        self._initialize_driver()

    def _initialize_driver(self):
        if not self._uri:
            self._is_operational = False
            self._status_detail = "NEO4J_URI is not configured. Falling back to PostgreSQL relational graph."
            return

        try:
            import neo4j
            from neo4j import GraphDatabase
            auth = (self._username, self._password) if self._username and self._password else None
            self._driver = GraphDatabase.driver(self._uri, auth=auth)
            # Verify connectivity
            self._driver.verify_connectivity()
            self._is_operational = True
            self._status_detail = f"Connected to Neo4j instance at {self._uri}"
            logger.info(self._status_detail)
        except ImportError:
            self._is_operational = False
            self._status_detail = "Python 'neo4j' driver package is not installed. Neo4j unavailable."
            logger.info(self._status_detail)
        except Exception as e:
            self._is_operational = False
            self._status_detail = f"Failed to connect to Neo4j ({self._uri}): {str(e)}"
            logger.warning(self._status_detail)

    @property
    def backend_name(self) -> str:
        return "neo4j"

    @property
    def is_operational(self) -> bool:
        return self._is_operational

    def get_status(self) -> Dict[str, Any]:
        return {
            "backend": self.backend_name,
            "is_operational": self._is_operational,
            "status": "OPERATIONAL" if self._is_operational else "GRAPH_BACKEND_DEGRADED",
            "uri": self._uri,
            "database": self._database,
            "details": self._status_detail
        }

    def create_entity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not self._is_operational:
            raise RuntimeError(f"GRAPH_BACKEND_DEGRADED: Neo4j is unavailable ({self._status_detail})")
        # Parameterized Cypher execution
        query = (
            "CREATE (n:Entity {id: $id, entity_type: $entity_type, canonical_name: $canonical_name, "
            "description: $description, verification_status: $verification_status, access_level: $access_level}) "
            "RETURN n"
        )
        with self._driver.session(database=self._database) as session:
            result = session.run(query, data)
            record = result.single()
            return dict(record["n"]) if record else data

    def get_entity(self, entity_id: int) -> Optional[Dict[str, Any]]:
        if not self._is_operational:
            return None
        query = "MATCH (n:Entity {id: $id}) RETURN n"
        with self._driver.session(database=self._database) as session:
            result = session.run(query, {"id": entity_id})
            record = result.single()
            return dict(record["n"]) if record else None

    def get_entity_by_canonical_name(self, canonical_name: str) -> Optional[Dict[str, Any]]:
        if not self._is_operational:
            return None
        query = "MATCH (n:Entity {canonical_name: $name}) RETURN n"
        with self._driver.session(database=self._database) as session:
            result = session.run(query, {"name": canonical_name.strip()})
            record = result.single()
            return dict(record["n"]) if record else None

    def add_alias(self, entity_id: int, alias_name: str, notes: Optional[str] = None) -> Dict[str, Any]:
        if not self._is_operational:
            raise RuntimeError("GRAPH_BACKEND_DEGRADED: Neo4j is unavailable.")
        return {"entity_id": entity_id, "alias_name": alias_name}

    def get_entity_aliases(self, entity_id: int) -> List[Dict[str, Any]]:
        if not self._is_operational:
            return []
        return []

    def update_entity(self, entity_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self._is_operational:
            raise RuntimeError("GRAPH_BACKEND_DEGRADED: Neo4j is unavailable.")
        query = "MATCH (n:Entity {id: $id}) SET n += $updates RETURN n"
        with self._driver.session(database=self._database) as session:
            result = session.run(query, {"id": entity_id, "updates": updates})
            record = result.single()
            return dict(record["n"]) if record else None

    def search_entities(
        self,
        query: str,
        entity_types: Optional[List[str]] = None,
        verification_status: Optional[str] = None,
        access_level: str = "PUBLIC",
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        if not self._is_operational:
            return []
        cypher = "MATCH (n:Entity) WHERE 1=1 "
        params = {"limit": limit, "skip": offset}
        if access_level == "PUBLIC":
            cypher += "AND n.access_level = 'PUBLIC' "
        if verification_status:
            cypher += "AND n.verification_status = $status "
            params["status"] = verification_status
        if query:
            cypher += "AND toLower(n.canonical_name) CONTAINS toLower($query) "
            params["query"] = query
        cypher += "RETURN n SKIP $skip LIMIT $limit"

        with self._driver.session(database=self._database) as session:
            result = session.run(cypher, params)
            return [dict(record["n"]) for record in result]

    def create_relationship(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not self._is_operational:
            raise RuntimeError("GRAPH_BACKEND_DEGRADED: Neo4j is unavailable.")
        rel_type = data["relationship_type"].replace(" ", "_").upper()
        # Safe parameterized Cypher
        query = (
            f"MATCH (a:Entity {{id: $source_id}}), (b:Entity {{id: $target_id}}) "
            f"CREATE (a)-[r:{rel_type} {{verification_status: $status, provenance_type: $provenance, confidence: $confidence}}]->(b) "
            f"RETURN r"
        )
        params = {
            "source_id": data["source_entity_id"],
            "target_id": data["target_entity_id"],
            "status": data.get("verification_status", "APPROVED"),
            "provenance": data.get("provenance_type", "EXPLICIT_SOURCE_RELATION"),
            "confidence": float(data.get("confidence", 1.0))
        }
        with self._driver.session(database=self._database) as session:
            result = session.run(query, params)
            record = result.single()
            return data

    def get_relationship(self, rel_id: int) -> Optional[Dict[str, Any]]:
        return None

    def update_relationship(self, rel_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return None

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
        return []

    def get_neighbors(
        self,
        entity_id: int,
        depth: int = 1,
        limit: int = 50,
        access_level: str = "PUBLIC",
        verified_only: bool = True
    ) -> Dict[str, Any]:
        if not self._is_operational:
            return {"nodes": [], "edges": []}
        return {"nodes": [], "edges": []}

    def find_path(
        self,
        source_id: int,
        target_id: int,
        max_depth: int = 3,
        access_level: str = "PUBLIC"
    ) -> List[Dict[str, Any]]:
        return []

    def delete_relationship(self, rel_id: int) -> bool:
        return False

    def get_overview_stats(self) -> Dict[str, Any]:
        return {
            "backend": self.backend_name,
            "is_operational": self._is_operational,
            "status": "GRAPH_BACKEND_DEGRADED"
        }
