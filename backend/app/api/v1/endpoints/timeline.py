"""
Archival Timeline API Endpoints.
Provides chronological milestones querying, strict date precision handling,
candidate event extraction, and curatorial verification workflows.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import TimelineEvent, User
from app.api.v1.endpoints.auth import get_current_user_optional, require_role
from app.schemas.timeline import (
    TimelineEventOut, TimelineEventCreate,
    TimelineCandidateGenerateRequest, TimelineReviewAction
)
from app.services.graph.timeline_service import TimelineService

router = APIRouter()

def _get_access_level(user: Optional[User]) -> str:
    if not user or not user.role:
        return "PUBLIC"
    if user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER", "RESEARCHER"]:
        return "ALL"
    return "PUBLIC"

@router.get("", response_model=List[TimelineEventOut])
def list_timeline_events(
    category: Optional[str] = Query(None, description="Filter by milestone category"),
    from_year: Optional[int] = Query(None),
    to_year: Optional[int] = Query(None),
    entity_id: Optional[int] = Query(None, description="Filter events involving this GraphEntity"),
    status: Optional[str] = Query(None, description="VERIFIED, PENDING_REVIEW, REJECTED"),
    include_unverified: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    is_staff = _get_access_level(current_user) != "PUBLIC"
    # Non-staff can only see VERIFIED events
    ver_status = status if is_staff else "VERIFIED"
    allow_unverified = include_unverified and is_staff

    return TimelineService.list_events(
        db=db,
        category=category,
        from_year=from_year,
        to_year=to_year,
        entity_id=entity_id,
        verification_status=ver_status,
        include_unverified=allow_unverified
    )

@router.get("/{event_id}", response_model=TimelineEventOut)
def get_timeline_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Timeline event #{event_id} not found.")

    if _get_access_level(current_user) == "PUBLIC" and event.verification_status != "VERIFIED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return event

@router.post("", response_model=TimelineEventOut, status_code=status.HTTP_201_CREATED)
def create_timeline_event(
    payload: TimelineEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    event = TimelineService.create_event(
        db=db,
        title=payload.title,
        description=payload.description,
        date_str=payload.date_str,
        category=payload.category,
        location=payload.location,
        document_id=payload.document_id,
        participant_entity_ids=payload.participant_entity_ids,
        provenance_type=payload.provenance_type,
        verification_status=payload.verification_status,
        user_id=current_user.id
    )
    return event

@router.post("/candidates", response_model=List[TimelineEventOut])
def generate_timeline_candidates(
    payload: TimelineCandidateGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """
    Extracts candidate events from document text or metadata.
    Tagged PENDING_REVIEW and MACHINE_EXTRACTED.
    """
    return TimelineService.generate_candidates_from_document(
        db=db,
        document_id=payload.document_id,
        user_id=current_user.id
    )

@router.post("/{event_id}/approve", response_model=TimelineEventOut)
def approve_timeline_event(
    event_id: int,
    payload: Optional[TimelineReviewAction] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]))
):
    try:
        return TimelineService.approve_event(db, event_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{event_id}/reject", response_model=TimelineEventOut)
def reject_timeline_event(
    event_id: int,
    payload: Optional[TimelineReviewAction] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]))
):
    try:
        return TimelineService.reject_event(db, event_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
