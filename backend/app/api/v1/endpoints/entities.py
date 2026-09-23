"""
Entity Management and Resolution API Endpoints.
Provides entity search, detail retrieval, relationship querying, timeline association,
and curatorial duplicate resolution with strict RBAC enforcement.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.api.v1.endpoints.auth import get_current_user_optional, require_role
from app.schemas.graph import (
    GraphEntityOut, GraphEntityCreate, GraphEntityUpdate,
    GraphRelationshipOut, EntityMergeCreate, EntityMergeOut, EntityMergeReviewAction
)
from app.schemas.timeline import TimelineEventOut
from app.services.graph.repository.factory import get_graph_repository
from app.services.graph.resolution import EntityResolutionService
from app.services.graph.timeline_service import TimelineService

router = APIRouter()

def _get_access_level(user: Optional[User]) -> str:
    if not user or not user.role:
        return "PUBLIC"
    if user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER", "RESEARCHER"]:
        return "ALL"
    return "PUBLIC"

@router.get("", response_model=List[GraphEntityOut])
def list_entities(
    q: Optional[str] = Query(None, description="Search term for canonical name or alias"),
    entity_type: Optional[str] = Query(None, description="Filter by EntityType"),
    status: Optional[str] = Query(None, description="VERIFIED, PENDING_REVIEW, REJECTED"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    repo = get_graph_repository(db)
    access_level = "PUBLIC" if _get_access_level(current_user) == "PUBLIC" else "RESTRICTED"
    
    # Public visitors can only view verified entities
    ver_status = status
    if _get_access_level(current_user) == "PUBLIC":
        ver_status = "VERIFIED"

    types = [entity_type] if entity_type else None
    return repo.search_entities(
        query=q or "",
        entity_types=types,
        verification_status=ver_status,
        access_level=access_level,
        limit=limit,
        offset=offset
    )

@router.get("/duplicates/candidates")
def list_duplicate_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]))
):
    """Finds suspected duplicates with matching normalized names."""
    return EntityResolutionService.find_potential_duplicates(db)

@router.post("/merges", response_model=EntityMergeOut)
def propose_entity_merge(
    payload: EntityMergeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    try:
        merge = EntityResolutionService.suggest_merge(
            db=db,
            primary_entity_id=payload.primary_entity_id,
            merged_entity_id=payload.merged_entity_id,
            merge_reason=payload.merge_reason,
            user_id=current_user.id
        )
        return merge
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/merges/{merge_id}/review", response_model=EntityMergeOut)
def review_entity_merge(
    merge_id: int,
    payload: EntityMergeReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    try:
        return EntityResolutionService.review_merge(
            db=db,
            merge_id=merge_id,
            action=payload.action,
            reviewer_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{entity_id}", response_model=GraphEntityOut)
def get_entity_by_id(
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    repo = get_graph_repository(db)
    entity = repo.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Entity #{entity_id} not found.")

    if _get_access_level(current_user) == "PUBLIC" and entity["access_level"] != "PUBLIC":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return entity

@router.post("", response_model=GraphEntityOut, status_code=status.HTTP_201_CREATED)
def create_entity(
    payload: GraphEntityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    repo = get_graph_repository(db)
    data = payload.model_dump()
    data["created_by"] = current_user.id
    return repo.create_entity(data)

@router.patch("/{entity_id}", response_model=GraphEntityOut)
def update_entity(
    entity_id: int,
    payload: GraphEntityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    repo = get_graph_repository(db)
    updates = payload.model_dump(exclude_unset=True)
    updates["user_id"] = current_user.id
    updated = repo.update_entity(entity_id, updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Entity #{entity_id} not found.")
    return updated

@router.get("/{entity_id}/relationships", response_model=List[GraphRelationshipOut])
def get_entity_relationships(
    entity_id: int,
    direction: str = Query("BOTH", regex="^(IN|OUT|BOTH)$"),
    relationship_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    repo = get_graph_repository(db)
    access_level = "PUBLIC" if _get_access_level(current_user) == "PUBLIC" else "RESTRICTED"
    types = [relationship_type] if relationship_type else None
    ver_status = "APPROVED" if _get_access_level(current_user) == "PUBLIC" else None

    return repo.get_relationships(
        entity_id=entity_id,
        direction=direction,
        relationship_types=types,
        verification_status=ver_status,
        access_level=access_level,
        limit=limit
    )

@router.get("/{entity_id}/timeline", response_model=List[TimelineEventOut])
def get_entity_timeline(
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    ver_status = "VERIFIED" if _get_access_level(current_user) == "PUBLIC" else None
    return TimelineService.list_events(
        db=db,
        entity_id=entity_id,
        verification_status=ver_status
    )
