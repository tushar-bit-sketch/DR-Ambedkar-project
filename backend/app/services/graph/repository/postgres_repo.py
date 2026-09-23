"""
PostgreSQL / SQLite Relational Graph Repository Fallback.
Implements complete graph storage, indexed relationship traversal,
BFS neighbor expansion, pathfinding, and RBAC filtering using SQLAlchemy.
"""

from typing import List, Dict, Any, Optional, Set
import json
import logging
from datetime import datetime
from collections import deque
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.db.models import (
    GraphEntity, GraphEntityAlias, GraphRelationship, GraphAuditLog,
    Document, DocumentVersion, OCRPage, OCRTextVersion, SearchChunk, User
)
from app.services.graph.repository.base import BaseGraphRepository
from app.core.config import settings

logger = logging.getLogger("archive.graph.postgres_repo")

class PostgreSQLGraphRepository(BaseGraphRepository):
    """
    Relational Graph Repository implementation.
    Primary development/testing fallback when Neo4j is unavailable.
    Provides identical query semantics, access control, and provenance tracking.
    """

    def __init__(self, db: Session):
        self.db = db

    @property
    def backend_name(self) -> str:
        return "postgres_fallback"

    @property
    def is_operational(self) -> bool:
        return True

    def get_status(self) -> Dict[str, Any]:
        try:
            entity_count = self.db.query(func.count(GraphEntity.id)).scalar() or 0
            rel_count = self.db.query(func.count(GraphRelationship.id)).scalar() or 0
            return {
                "backend": self.backend_name,
                "is_operational": True,
                "status": "OPERATIONAL",
                "entity_count": entity_count,
                "relationship_count": rel_count,
                "details": "PostgreSQL relational graph fallback active with depth-bounded BFS traversal."
            }
        except Exception as e:
            return {
                "backend": self.backend_name,
                "is_operational": False,
                "status": "ERROR",
                "error": str(e)
            }

    def _entity_to_dict(self, entity: GraphEntity) -> Dict[str, Any]:
        aliases = [a.alias_name for a in entity.aliases] if entity.aliases else []
        if entity.alternate_names:
            extra = [n.strip() for n in entity.alternate_names.split(",") if n.strip()]
            for name in extra:
                if name not in aliases:
                    aliases.append(name)

        return {
            "id": entity.id,
            "entity_type": entity.entity_type,
            "canonical_name": entity.canonical_name,
            "alternate_names": aliases,
            "description": entity.description or "",
            "language": entity.language or "English",
            "verification_status": entity.verification_status,
            "source_reference": entity.source_reference or "",
            "birth_date": entity.birth_date,
            "death_date": entity.death_date,
            "start_date": entity.start_date,
            "end_date": entity.end_date,
            "date_precision": entity.date_precision or "YEAR",
            "location": entity.location,
            "external_identifier": entity.external_identifier,
            "access_level": entity.access_level,
            "created_by": entity.created_by,
            "created_at": entity.created_at.isoformat() if entity.created_at else None,
            "updated_at": entity.updated_at.isoformat() if entity.updated_at else None,
        }

    def _relationship_to_dict(self, rel: GraphRelationship) -> Dict[str, Any]:
        return {
            "id": rel.id,
            "source_entity_id": rel.source_entity_id,
            "source_entity_name": rel.source_entity.canonical_name if rel.source_entity else None,
            "source_entity_type": rel.source_entity.entity_type if rel.source_entity else None,
            "relationship_type": rel.relationship_type,
            "target_entity_id": rel.target_entity_id,
            "target_entity_name": rel.target_entity.canonical_name if rel.target_entity else None,
            "target_entity_type": rel.target_entity.entity_type if rel.target_entity else None,
            "verification_status": rel.verification_status,
            "provenance_type": rel.provenance_type,
            "confidence": rel.confidence,
            "confidence_label": f"EXTRACTION CONFIDENCE: {int(rel.confidence * 100)}%",
            "evidence_reference": rel.evidence_reference,
            "evidence_text": rel.evidence_text,
            "source_document_id": rel.source_document_id,
            "document_version_id": rel.document_version_id,
            "ocr_text_version_id": rel.ocr_text_version_id,
            "page_id": rel.page_id,
            "chunk_id": rel.chunk_id,
            "access_level": rel.access_level,
            "created_by": rel.created_by,
            "reviewed_by": rel.reviewed_by,
            "created_at": rel.created_at.isoformat() if rel.created_at else None,
            "reviewed_at": rel.reviewed_at.isoformat() if rel.reviewed_at else None,
        }

    def create_entity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        aliases_list = data.pop("alternate_names", [])
        if isinstance(aliases_list, list):
            alt_names_str = ", ".join(aliases_list)
        else:
            alt_names_str = str(aliases_list or "")

        entity = GraphEntity(
            entity_type=data.get("entity_type", "Concept"),
            canonical_name=data.get("canonical_name", "").strip(),
            alternate_names=alt_names_str,
            description=data.get("description", ""),
            language=data.get("language", "English"),
            verification_status=data.get("verification_status", "VERIFIED"),
            source_reference=data.get("source_reference"),
            birth_date=data.get("birth_date"),
            death_date=data.get("death_date"),
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
            date_precision=data.get("date_precision", "YEAR"),
            location=data.get("location"),
            external_identifier=data.get("external_identifier"),
            access_level=data.get("access_level", "PUBLIC"),
            created_by=data.get("created_by"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)

        if isinstance(aliases_list, list):
            for alias in aliases_list:
                alias_str = alias.strip()
                if alias_str:
                    alias_obj = GraphEntityAlias(
                        entity_id=entity.id,
                        alias_name=alias_str,
                        language=entity.language,
                        confidence=1.0
                    )
                    self.db.add(alias_obj)
            self.db.commit()
            self.db.refresh(entity)

        # Audit log
        audit = GraphAuditLog(
            action="CREATE_ENTITY",
            target_type="ENTITY",
            target_id=entity.id,
            user_id=entity.created_by,
            details_json=json.dumps({"canonical_name": entity.canonical_name, "entity_type": entity.entity_type}),
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()

        return self._entity_to_dict(entity)

    def get_entity(self, entity_id: int) -> Optional[Dict[str, Any]]:
        entity = self.db.query(GraphEntity).filter(GraphEntity.id == entity_id).first()
        if not entity:
            return None
        return self._entity_to_dict(entity)

    def get_entity_by_canonical_name(self, canonical_name: str) -> Optional[Dict[str, Any]]:
        entity = self.db.query(GraphEntity).filter(
            GraphEntity.canonical_name.ilike(canonical_name.strip())
        ).first()
        if not entity:
            return None
        return self._entity_to_dict(entity)

    def add_alias(self, entity_id: int, alias_name: str, notes: Optional[str] = None) -> Dict[str, Any]:
        alias = GraphEntityAlias(
            entity_id=entity_id,
            alias_name=alias_name.strip(),
            confidence=1.0
        )
        self.db.add(alias)
        self.db.commit()
        self.db.refresh(alias)
        return {
            "id": alias.id,
            "entity_id": alias.entity_id,
            "alias_name": alias.alias_name,
            "confidence": alias.confidence
        }

    def get_entity_aliases(self, entity_id: int) -> List[Dict[str, Any]]:
        aliases = self.db.query(GraphEntityAlias).filter(GraphEntityAlias.entity_id == entity_id).all()
        return [
            {
                "id": a.id,
                "entity_id": a.entity_id,
                "alias_name": a.alias_name,
                "confidence": a.confidence
            }
            for a in aliases
        ]

    def update_entity(self, entity_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        entity = self.db.query(GraphEntity).filter(GraphEntity.id == entity_id).first()
        if not entity:
            return None

        for field in [
            "canonical_name", "description", "language", "verification_status",
            "source_reference", "birth_date", "death_date", "start_date", "end_date",
            "date_precision", "location", "external_identifier", "access_level"
        ]:
            if field in updates:
                setattr(entity, field, updates[field])

        if "alternate_names" in updates:
            alt = updates["alternate_names"]
            if isinstance(alt, list):
                entity.alternate_names = ", ".join(alt)
            else:
                entity.alternate_names = str(alt or "")

        entity.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(entity)

        # Audit
        audit = GraphAuditLog(
            action="UPDATE_ENTITY",
            target_type="ENTITY",
            target_id=entity.id,
            user_id=updates.get("user_id"),
            details_json=json.dumps({"updated_fields": list(updates.keys())}),
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()

        return self._entity_to_dict(entity)

    def search_entities(
        self,
        query: str,
        entity_types: Optional[List[str]] = None,
        verification_status: Optional[str] = None,
        access_level: str = "PUBLIC",
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        q = self.db.query(GraphEntity)

        if access_level == "PUBLIC":
            q = q.filter(GraphEntity.access_level == "PUBLIC")

        if verification_status:
            q = q.filter(GraphEntity.verification_status == verification_status)

        if entity_types:
            q = q.filter(GraphEntity.entity_type.in_(entity_types))

        if query and query.strip():
            term = f"%{query.strip()}%"
            q = q.outerjoin(GraphEntityAlias, GraphEntity.id == GraphEntityAlias.entity_id).filter(
                or_(
                    GraphEntity.canonical_name.ilike(term),
                    GraphEntity.alternate_names.ilike(term),
                    GraphEntity.description.ilike(term),
                    GraphEntityAlias.alias_name.ilike(term)
                )
            ).distinct()

        entities = q.order_by(GraphEntity.canonical_name.asc()).offset(offset).limit(limit).all()
        return [self._entity_to_dict(e) for e in entities]

    def create_relationship(self, data: Dict[str, Any]) -> Dict[str, Any]:
        rel = GraphRelationship(
            source_entity_id=data["source_entity_id"],
            relationship_type=data["relationship_type"],
            target_entity_id=data["target_entity_id"],
            verification_status=data.get("verification_status", "APPROVED"),
            provenance_type=data.get("provenance_type", "EXPLICIT_SOURCE_RELATION"),
            confidence=float(data.get("confidence", 1.0)),
            evidence_reference=data.get("evidence_reference"),
            evidence_text=data.get("evidence_text"),
            source_document_id=data.get("source_document_id"),
            document_version_id=data.get("document_version_id"),
            ocr_text_version_id=data.get("ocr_text_version_id"),
            page_id=data.get("page_id"),
            chunk_id=data.get("chunk_id"),
            access_level=data.get("access_level", "PUBLIC"),
            created_by=data.get("created_by"),
            created_at=datetime.utcnow(),
            reviewed_by=data.get("reviewed_by"),
            reviewed_at=datetime.utcnow() if data.get("reviewed_by") else None
        )
        self.db.add(rel)
        self.db.commit()
        self.db.refresh(rel)

        # Audit log
        audit = GraphAuditLog(
            action="CREATE_RELATIONSHIP",
            target_type="RELATIONSHIP",
            target_id=rel.id,
            user_id=rel.created_by,
            details_json=json.dumps({
                "source": rel.source_entity_id,
                "type": rel.relationship_type,
                "target": rel.target_entity_id,
                "provenance": rel.provenance_type
            }),
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()

        return self._relationship_to_dict(rel)

    def get_relationship(self, rel_id: int) -> Optional[Dict[str, Any]]:
        rel = self.db.query(GraphRelationship).filter(GraphRelationship.id == rel_id).first()
        if not rel:
            return None
        return self._relationship_to_dict(rel)

    def update_relationship(self, rel_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        rel = self.db.query(GraphRelationship).filter(GraphRelationship.id == rel_id).first()
        if not rel:
            return None

        for field in [
            "verification_status", "provenance_type", "confidence",
            "evidence_reference", "evidence_text", "access_level", "reviewed_by"
        ]:
            if field in updates:
                setattr(rel, field, updates[field])

        if "reviewed_by" in updates:
            rel.reviewed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(rel)

        # Audit
        audit = GraphAuditLog(
            action="UPDATE_RELATIONSHIP",
            target_type="RELATIONSHIP",
            target_id=rel.id,
            user_id=updates.get("reviewed_by") or updates.get("user_id"),
            details_json=json.dumps({"status": rel.verification_status, "updates": list(updates.keys())}),
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()

        return self._relationship_to_dict(rel)

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
        q = self.db.query(GraphRelationship)

        if access_level == "PUBLIC":
            q = q.filter(GraphRelationship.access_level == "PUBLIC")

        if verification_status:
            q = q.filter(GraphRelationship.verification_status == verification_status)

        if relationship_types:
            q = q.filter(GraphRelationship.relationship_type.in_(relationship_types))

        if entity_id is not None:
            if direction == "OUT":
                q = q.filter(GraphRelationship.source_entity_id == entity_id)
            elif direction == "IN":
                q = q.filter(GraphRelationship.target_entity_id == entity_id)
            else: # BOTH
                q = q.filter(
                    or_(
                        GraphRelationship.source_entity_id == entity_id,
                        GraphRelationship.target_entity_id == entity_id
                    )
                )

        rels = q.order_by(GraphRelationship.created_at.desc()).offset(offset).limit(limit).all()
        return [self._relationship_to_dict(r) for r in rels]

    def get_neighbors(
        self,
        entity_id: int,
        depth: int = 1,
        limit: int = 50,
        access_level: str = "PUBLIC",
        verified_only: bool = True
    ) -> Dict[str, Any]:
        # Bound depth and limit to prevent excessive traversal
        max_depth = min(depth, settings.GRAPH_MAX_TRAVERSAL_DEPTH)
        max_nodes = min(limit, settings.GRAPH_MAX_NEIGHBORS)

        visited_entity_ids: Set[int] = {entity_id}
        collected_relationships: List[GraphRelationship] = []
        collected_entities: Dict[int, GraphEntity] = {}

        # Root entity
        root = self.db.query(GraphEntity).filter(GraphEntity.id == entity_id).first()
        if not root:
            return {"nodes": [], "edges": []}

        if access_level == "PUBLIC" and root.access_level != "PUBLIC":
            return {"nodes": [], "edges": []}

        collected_entities[root.id] = root

        # BFS queue: (current_id, current_depth)
        queue = deque([(entity_id, 0)])

        while queue and len(collected_entities) < max_nodes:
            curr_id, curr_d = queue.popleft()
            if curr_d >= max_depth:
                continue

            # Find all outgoing and incoming relationships
            rq = self.db.query(GraphRelationship).filter(
                or_(
                    GraphRelationship.source_entity_id == curr_id,
                    GraphRelationship.target_entity_id == curr_id
                )
            )

            if access_level == "PUBLIC":
                rq = rq.filter(GraphRelationship.access_level == "PUBLIC")
            if verified_only:
                rq = rq.filter(GraphRelationship.verification_status.in_(["APPROVED", "VERIFIED"]))

            rels = rq.limit(max_nodes).all()

            for rel in rels:
                neighbor_id = rel.target_entity_id if rel.source_entity_id == curr_id else rel.source_entity_id
                
                # Check neighbor access
                neighbor_ent = self.db.query(GraphEntity).filter(GraphEntity.id == neighbor_id).first()
                if not neighbor_ent:
                    continue
                if access_level == "PUBLIC" and neighbor_ent.access_level != "PUBLIC":
                    continue
                if verified_only and neighbor_ent.verification_status not in ["APPROVED", "VERIFIED"]:
                    continue

                if rel not in collected_relationships:
                    collected_relationships.append(rel)

                if neighbor_id not in visited_entity_ids:
                    visited_entity_ids.add(neighbor_id)
                    collected_entities[neighbor_id] = neighbor_ent
                    queue.append((neighbor_id, curr_d + 1))

                if len(collected_entities) >= max_nodes:
                    break

        nodes = [self._entity_to_dict(e) for e in collected_entities.values()]
        edges = [self._relationship_to_dict(r) for r in collected_relationships]

        return {
            "root_id": entity_id,
            "depth": max_depth,
            "nodes": nodes,
            "edges": edges,
            "total_nodes": len(nodes),
            "total_edges": len(edges)
        }

    def find_path(
        self,
        source_id: int,
        target_id: int,
        max_depth: int = 3,
        access_level: str = "PUBLIC"
    ) -> List[Dict[str, Any]]:
        max_depth = min(max_depth, settings.GRAPH_MAX_TRAVERSAL_DEPTH)
        if source_id == target_id:
            src = self.get_entity(source_id)
            return [src] if src else []

        # BFS queue stores path of entity IDs: [id1, id2, ...]
        queue = deque([[source_id]])
        visited = {source_id}

        while queue:
            path = queue.popleft()
            curr = path[-1]

            if len(path) - 1 >= max_depth:
                continue

            rq = self.db.query(GraphRelationship).filter(
                or_(
                    GraphRelationship.source_entity_id == curr,
                    GraphRelationship.target_entity_id == curr
                )
            )
            if access_level == "PUBLIC":
                rq = rq.filter(GraphRelationship.access_level == "PUBLIC")

            rels = rq.all()
            for r in rels:
                neighbor = r.target_entity_id if r.source_entity_id == curr else r.source_entity_id
                if neighbor == target_id:
                    full_path = path + [neighbor]
                    return [self.get_entity(nid) for nid in full_path if self.get_entity(nid)]

                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])

        return []

    def delete_relationship(self, rel_id: int) -> bool:
        rel = self.db.query(GraphRelationship).filter(GraphRelationship.id == rel_id).first()
        if not rel:
            return False
        self.db.delete(rel)
        self.db.commit()
        return True

    def get_overview_stats(self) -> Dict[str, Any]:
        total_entities = self.db.query(func.count(GraphEntity.id)).scalar() or 0
        total_rels = self.db.query(func.count(GraphRelationship.id)).scalar() or 0
        pending_rels = self.db.query(func.count(GraphRelationship.id)).filter(
            GraphRelationship.verification_status == "PENDING_REVIEW"
        ).scalar() or 0
        pending_entities = self.db.query(func.count(GraphEntity.id)).filter(
            GraphEntity.verification_status == "PENDING_REVIEW"
        ).scalar() or 0

        # Type counts
        entity_types = dict(
            self.db.query(GraphEntity.entity_type, func.count(GraphEntity.id))
            .group_by(GraphEntity.entity_type)
            .all()
        )
        rel_types = dict(
            self.db.query(GraphRelationship.relationship_type, func.count(GraphRelationship.id))
            .group_by(GraphRelationship.relationship_type)
            .all()
        )

        return {
            "total_entities": total_entities,
            "total_relationships": total_rels,
            "pending_relationships": pending_rels,
            "pending_entities": pending_entities,
            "entity_types": entity_types,
            "relationship_types": rel_types,
            "backend": self.backend_name
        }
