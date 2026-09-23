"""
Knowledge Graph Core Query and Curation Endpoints.
Supports neighbor expansion, path finding, relationship curation,
extraction pipeline dispatch, and transparent graph status diagnostics.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, Document
from app.api.v1.endpoints.auth import get_current_user_optional, require_role
from app.schemas.graph import (
    GraphNeighborsOut, GraphPathOut, GraphStatsOut, GraphStatusOut,
    GraphRelationshipOut, GraphRelationshipCreate, GraphRelationshipUpdate,
    GraphRelationshipReviewAction, GraphExtractionRequest, GraphExtractionResponse
)
from app.services.graph.repository.factory import get_graph_repository
from app.services.graph.extraction.deterministic_extractor import DeterministicArchivalExtractor
from app.services.graph.extraction.rule_based_extractor import RuleBasedArchivalExtractor
from app.services.graph.extraction.llm_extractor import LLMArchivalExtractor
from app.services.graph.resolution import EntityResolutionService

router = APIRouter()

def _get_access_level(user: Optional[User]) -> str:
    if not user or not user.role:
        return "PUBLIC"
    if user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER", "RESEARCHER"]:
        return "ALL"
    return "PUBLIC"

@router.get("/status", response_model=GraphStatusOut)
def get_graph_backend_status(db: Session = Depends(get_db)):
    repo = get_graph_repository(db)
    st = repo.get_status()
    return GraphStatusOut(
        backend=st.get("backend", "postgres_fallback"),
        is_operational=st.get("is_operational", True),
        status=st.get("status", "OPERATIONAL"),
        entity_count=st.get("entity_count"),
        relationship_count=st.get("relationship_count"),
        details=st.get("details"),
        neo4j_uri=st.get("uri")
    )

@router.get("/stats", response_model=GraphStatsOut)
def get_graph_statistics(db: Session = Depends(get_db)):
    repo = get_graph_repository(db)
    return repo.get_overview_stats()

@router.get("/neighbors/{entity_id}", response_model=GraphNeighborsOut)
def get_entity_neighbors(
    entity_id: int,
    depth: int = Query(1, ge=1, le=3),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    repo = get_graph_repository(db)
    access_level = "PUBLIC" if _get_access_level(current_user) == "PUBLIC" else "RESTRICTED"
    verified_only = _get_access_level(current_user) == "PUBLIC"

    res = repo.get_neighbors(
        entity_id=entity_id,
        depth=depth,
        limit=limit,
        access_level=access_level,
        verified_only=verified_only
    )
    return res

@router.get("/path", response_model=GraphPathOut)
def find_graph_path(
    source_id: int = Query(...),
    target_id: int = Query(...),
    max_depth: int = Query(3, ge=1, le=4),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    repo = get_graph_repository(db)
    access_level = "PUBLIC" if _get_access_level(current_user) == "PUBLIC" else "RESTRICTED"
    path = repo.find_path(source_id=source_id, target_id=target_id, max_depth=max_depth, access_level=access_level)
    return GraphPathOut(
        source_id=source_id,
        target_id=target_id,
        path=path,
        path_length=len(path)
    )

@router.get("/search")
def search_graph(
    q: str = Query(..., min_length=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    repo = get_graph_repository(db)
    access_level = "PUBLIC" if _get_access_level(current_user) == "PUBLIC" else "RESTRICTED"
    entities = repo.search_entities(query=q, access_level=access_level, limit=limit)
    entity_ids = [e["id"] for e in entities]

    relationships = []
    if entity_ids:
        relationships = repo.get_relationships(
            entity_id=entity_ids[0],
            access_level=access_level,
            limit=20
        )

    return {
        "query": q,
        "matched_entities": entities,
        "sample_relationships": relationships
    }

@router.get("/relationships", response_model=List[GraphRelationshipOut])
def list_relationships(
    status: Optional[str] = Query(None, description="APPROVED, PENDING_REVIEW, REJECTED"),
    relationship_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    repo = get_graph_repository(db)
    access_level = "PUBLIC" if _get_access_level(current_user) == "PUBLIC" else "RESTRICTED"
    ver_status = status if _get_access_level(current_user) != "PUBLIC" else "APPROVED"
    types = [relationship_type] if relationship_type else None

    return repo.get_relationships(
        relationship_types=types,
        verification_status=ver_status,
        access_level=access_level,
        limit=limit,
        offset=offset
    )

@router.post("/relationships", response_model=GraphRelationshipOut, status_code=status.HTTP_201_CREATED)
def create_relationship(
    payload: GraphRelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    repo = get_graph_repository(db)
    data = payload.model_dump()
    data["created_by"] = current_user.id
    return repo.create_relationship(data)

@router.patch("/relationships/{rel_id}", response_model=GraphRelationshipOut)
def update_relationship(
    rel_id: int,
    payload: GraphRelationshipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]))
):
    repo = get_graph_repository(db)
    updates = payload.model_dump(exclude_unset=True)
    updates["reviewed_by"] = current_user.id
    updated = repo.update_relationship(rel_id, updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relationship #{rel_id} not found.")
    return updated

@router.post("/relationships/{rel_id}/approve", response_model=GraphRelationshipOut)
def approve_relationship(
    rel_id: int,
    payload: Optional[GraphRelationshipReviewAction] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]))
):
    repo = get_graph_repository(db)
    updated = repo.update_relationship(
        rel_id=rel_id,
        updates={
            "verification_status": "APPROVED",
            "provenance_type": "HUMAN_VERIFIED_RELATION",
            "reviewed_by": current_user.id
        }
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relationship #{rel_id} not found.")
    return updated

@router.post("/relationships/{rel_id}/reject", response_model=GraphRelationshipOut)
def reject_relationship(
    rel_id: int,
    payload: Optional[GraphRelationshipReviewAction] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]))
):
    repo = get_graph_repository(db)
    updated = repo.update_relationship(
        rel_id=rel_id,
        updates={
            "verification_status": "REJECTED",
            "reviewed_by": current_user.id
        }
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relationship #{rel_id} not found.")
    return updated

@router.delete("/relationships/{rel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(
    rel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    repo = get_graph_repository(db)
    ok = repo.delete_relationship(rel_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relationship #{rel_id} not found.")
    return None

@router.post("/extract", response_model=GraphExtractionResponse)
def trigger_graph_extraction(
    payload: GraphExtractionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """
    Triggers entity and relationship extraction on a cataloged archival document.
    """
    doc = db.query(Document).filter(Document.id == payload.document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document #{payload.document_id} not found.")

    repo = get_graph_repository(db)
    extractor_type = (payload.extractor_type or "deterministic").lower()

    if extractor_type == "deterministic":
        extractor = DeterministicArchivalExtractor()
        context = {"document": doc}
        entities = extractor.extract_entities("", context)
        relationships = extractor.extract_relationships("", entities, context)
    elif extractor_type == "rule_based":
        extractor = RuleBasedArchivalExtractor()
        # Aggregate document text
        text_content = f"{doc.title}\n{doc.description or ''}"
        context = {
            "document_id": doc.id,
            "document_title": doc.title
        }
        entities = extractor.extract_entities(text_content, context)
        relationships = extractor.extract_relationships(text_content, entities, context)
    elif extractor_type == "llm":
        extractor = LLMArchivalExtractor()
        if not extractor.is_available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ENTITY_EXTRACTION_UNAVAILABLE: Local LLM extraction service is offline."
            )
        text_content = f"{doc.title}\n{doc.description or ''}"
        context = {"document_id": doc.id}
        entities = extractor.extract_entities(text_content, context)
        relationships = extractor.extract_relationships(text_content, entities, context)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported extractor_type: {extractor_type}")

    # Persist extracted entities via resolution check
    persisted_entities_map = {}
    for ent in entities:
        existing = EntityResolutionService.find_matching_entity(db, ent.canonical_name, ent.entity_type)
        if not existing:
            created = repo.create_entity({
                "entity_type": ent.entity_type,
                "canonical_name": ent.canonical_name,
                "description": ent.description or "",
                "language": ent.language,
                "verification_status": "VERIFIED" if ent.extraction_method == "deterministic_catalog_metadata" else "PENDING_REVIEW",
                "source_reference": ent.source_reference,
                "created_by": current_user.id
            })
            persisted_entities_map[ent.canonical_name] = created["id"]
        else:
            persisted_entities_map[ent.canonical_name] = existing.id

    # Persist relationships
    saved_rels = 0
    for rel in relationships:
        src_id = persisted_entities_map.get(rel.source_entity_name)
        tgt_id = persisted_entities_map.get(rel.target_entity_name)

        if not src_id:
            src_ent = EntityResolutionService.find_matching_entity(db, rel.source_entity_name)
            if src_ent:
                src_id = src_ent.id
            else:
                c = repo.create_entity({"canonical_name": rel.source_entity_name, "entity_type": rel.source_entity_type})
                src_id = c["id"]

        if not tgt_id:
            tgt_ent = EntityResolutionService.find_matching_entity(db, rel.target_entity_name)
            if tgt_ent:
                tgt_id = tgt_ent.id
            else:
                c = repo.create_entity({"canonical_name": rel.target_entity_name, "entity_type": rel.target_entity_type})
                tgt_id = c["id"]

        if src_id and tgt_id and src_id != tgt_id:
            repo.create_relationship({
                "source_entity_id": src_id,
                "relationship_type": rel.relationship_type,
                "target_entity_id": tgt_id,
                "verification_status": "APPROVED" if rel.provenance_type == "EXPLICIT_SOURCE_RELATION" else "PENDING_REVIEW",
                "provenance_type": rel.provenance_type,
                "confidence": rel.confidence,
                "evidence_text": rel.evidence_text,
                "evidence_reference": rel.evidence_reference,
                "source_document_id": doc.id,
                "created_by": current_user.id
            })
            saved_rels += 1

    return GraphExtractionResponse(
        document_id=doc.id,
        extractor_type=extractor_type,
        entities_extracted=len(entities),
        relationships_extracted=saved_rels,
        status="SUCCESS",
        message=f"Extraction completed using {extractor_type} extractor."
    )
