"""
Entity Resolution and Deduplication Service.
Provides canonical name normalization, alias matching, duplicate candidate detection,
and curator review workflows (MATCH_CONFIRMED, MATCH_REVIEW_REQUIRED, MATCH_REJECTED).
Strictly prevents automatic merging of uncertain entities.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.db.models import (
    GraphEntity, GraphEntityAlias, GraphRelationship, GraphEntityMerge, GraphAuditLog, User
)

logger = logging.getLogger("archive.graph.resolution")

HONORIFICS_PATTERN = re.compile(
    r'\b(dr\.?|babasaheb|shri|shree|mr\.?|ms\.?|prof\.?|pandit|barrister|hon\.?|the honorable)\b',
    re.IGNORECASE
)

class EntityResolutionService:
    """
    Manages canonical naming, alias lookup, and safe curatorial merge workflows.
    """

    @staticmethod
    def normalize_name(name: str) -> str:
        """
        Normalizes candidate name by removing common honorifics, extra punctuation,
        and standardizing internal spacing.
        """
        if not name:
            return ""
        # Lowercase and strip
        cleaned = name.strip()
        # Remove honorifics
        cleaned = HONORIFICS_PATTERN.sub('', cleaned)
        # Remove dots and commas
        cleaned = re.sub(r'[\.,\-_]', ' ', cleaned)
        # Collapse whitespace
        cleaned = ' '.join(cleaned.split()).lower()
        return cleaned

    @classmethod
    def find_matching_entity(
        cls,
        db: Session,
        candidate_name: str,
        entity_type: Optional[str] = None
    ) -> Optional[GraphEntity]:
        """
        Finds a verified canonical entity matching candidate_name via:
        1. Exact canonical_name (case-insensitive)
        2. Exact alias match in GraphEntityAlias
        3. Normalized token comparison against canonical names
        """
        if not candidate_name or not candidate_name.strip():
            return None

        raw = candidate_name.strip()
        norm = cls.normalize_name(raw)

        # 1. Exact canonical name match
        q1 = db.query(GraphEntity).filter(GraphEntity.canonical_name.ilike(raw))
        if entity_type:
            q1 = q1.filter(GraphEntity.entity_type == entity_type)
        ent = q1.first()
        if ent:
            return ent

        # 2. Exact alias match
        q2 = db.query(GraphEntity).join(GraphEntityAlias, GraphEntity.id == GraphEntityAlias.entity_id).filter(
            GraphEntityAlias.alias_name.ilike(raw)
        )
        if entity_type:
            q2 = q2.filter(GraphEntity.entity_type == entity_type)
        ent = q2.first()
        if ent:
            return ent

        # 3. Normalized comparison across candidates of the same type
        q3 = db.query(GraphEntity)
        if entity_type:
            q3 = q3.filter(GraphEntity.entity_type == entity_type)
        
        candidates = q3.limit(200).all()
        for cand in candidates:
            if cls.normalize_name(cand.canonical_name) == norm:
                return cand
            if cand.alternate_names:
                for alt in cand.alternate_names.split(","):
                    if cls.normalize_name(alt) == norm:
                        return cand

        return None

    @classmethod
    def suggest_merge(
        cls,
        db: Session,
        primary_entity_id: int,
        merged_entity_id: int,
        merge_reason: str,
        user_id: Optional[int] = None
    ) -> GraphEntityMerge:
        """
        Proposes an entity merge. Marked MATCH_REVIEW_REQUIRED.
        Does NOT automatically merge.
        """
        if primary_entity_id == merged_entity_id:
            raise ValueError("Cannot merge an entity into itself.")

        existing = db.query(GraphEntityMerge).filter(
            GraphEntityMerge.primary_entity_id == primary_entity_id,
            GraphEntityMerge.merged_entity_id == merged_entity_id
        ).first()

        if existing:
            return existing

        merge = GraphEntityMerge(
            primary_entity_id=primary_entity_id,
            merged_entity_id=merged_entity_id,
            status="MATCH_REVIEW_REQUIRED",
            merge_reason=merge_reason,
            created_at=datetime.utcnow()
        )
        db.add(merge)
        db.commit()
        db.refresh(merge)

        # Audit
        audit = GraphAuditLog(
            action="PROPOSE_MERGE",
            target_type="MERGE",
            target_id=merge.id,
            user_id=user_id,
            details_json=json.dumps({
                "primary": primary_entity_id,
                "duplicate": merged_entity_id,
                "reason": merge_reason
            }),
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return merge

    propose_merge = suggest_merge

    @classmethod
    def resolve_name(cls, db: Session, candidate_name: str) -> Optional[int]:
        match = cls.find_matching_entity(db, candidate_name)
        return match.id if match else None

    @classmethod
    def review_merge(
        cls,
        db: Session,
        merge_id: int,
        action: str, # "APPROVE" or "REJECT"
        reviewer_id: Optional[int] = None
    ) -> GraphEntityMerge:
        """
        Executes or rejects an entity merge with full provenance preservation.
        Upon APPROVE:
        - Primary entity inherits aliases of merged entity
        - Relationships pointing to/from merged entity are re-linked to primary entity
        - Merged entity is marked SUPERSEDED
        """
        merge = db.query(GraphEntityMerge).filter(GraphEntityMerge.id == merge_id).first()
        if not merge:
            raise ValueError(f"Merge record #{merge_id} not found.")

        now = datetime.utcnow()
        if action.upper() == "APPROVE":
            merge.status = "MATCH_CONFIRMED"
            merge.reviewed_by = reviewer_id
            merge.reviewed_at = now

            primary = db.query(GraphEntity).filter(GraphEntity.id == merge.primary_entity_id).first()
            duplicate = db.query(GraphEntity).filter(GraphEntity.id == merge.merged_entity_id).first()

            if primary and duplicate:
                # 1. Transfer duplicate canonical name as an alias on primary
                new_alias = GraphEntityAlias(
                    entity_id=primary.id,
                    alias_name=duplicate.canonical_name,
                    language=duplicate.language,
                    source_reference=f"Inherited from merged entity #{duplicate.id}",
                    confidence=1.0
                )
                db.add(new_alias)

                # 2. Transfer existing aliases
                for al in duplicate.aliases:
                    al.entity_id = primary.id

                # 3. Re-link outgoing relationships
                for rel in duplicate.outgoing_relationships:
                    rel.source_entity_id = primary.id

                # 4. Re-link incoming relationships
                for rel in duplicate.incoming_relationships:
                    rel.target_entity_id = primary.id

                # 5. Mark duplicate entity as SUPERSEDED
                duplicate.verification_status = "SUPERSEDED"
                duplicate.description = f"[SUPERSEDED] Merged into #{primary.id} ({primary.canonical_name}). {duplicate.description or ''}"

            db.commit()

        elif action.upper() == "REJECT":
            merge.status = "MATCH_REJECTED"
            merge.reviewed_by = reviewer_id
            merge.reviewed_at = now
            db.commit()
        else:
            raise ValueError(f"Invalid action: {action}. Must be APPROVE or REJECT.")

        db.refresh(merge)

        # Audit
        audit = GraphAuditLog(
            action="REVIEW_MERGE",
            target_type="MERGE",
            target_id=merge.id,
            user_id=reviewer_id,
            details_json=json.dumps({"action": action, "status": merge.status}),
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return merge

    @classmethod
    def find_potential_duplicates(cls, db: Session) -> List[Dict[str, Any]]:
        """
        Finds pairs of entities that share similar normalized names but have not yet been merged.
        """
        entities = db.query(GraphEntity).filter(GraphEntity.verification_status != "SUPERSEDED").all()
        normalized_map: Dict[str, List[GraphEntity]] = {}

        for e in entities:
            norm = cls.normalize_name(e.canonical_name)
            if norm:
                normalized_map.setdefault(norm, []).append(e)

        duplicate_candidates = []
        for norm_name, matched_entities in normalized_map.items():
            if len(matched_entities) > 1:
                # Group found
                primary = matched_entities[0]
                for dup in matched_entities[1:]:
                    duplicate_candidates.append({
                        "normalized_name": norm_name,
                        "primary_entity_id": primary.id,
                        "primary_name": primary.canonical_name,
                        "primary_type": primary.entity_type,
                        "duplicate_entity_id": dup.id,
                        "duplicate_name": dup.canonical_name,
                        "duplicate_type": dup.entity_type,
                        "suggested_action": "MATCH_REVIEW_REQUIRED"
                    })

        return duplicate_candidates
