from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TimelineEventEntityOut(BaseModel):
    entity_id: int
    role: str

    model_config = ConfigDict(from_attributes=True)

class TimelineEventBase(BaseModel):
    year: int
    exact_date: Optional[str] = None
    date_precision: str = "YEAR"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    title: str
    description: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    related_locations: Optional[str] = None
    related_people: Optional[str] = None
    document_id: Optional[int] = None
    sort_order: int = 0
    verification_status: str = "VERIFIED"
    provenance_type: str = "EXPLICIT_SOURCE_RELATION"
    confidence: float = 1.0
    evidence_text: Optional[str] = None

class TimelineEventCreate(BaseModel):
    title: str
    description: str
    date_str: str
    category: Optional[str] = "Historical Milestone"
    location: Optional[str] = None
    document_id: Optional[int] = None
    participant_entity_ids: Optional[List[int]] = None
    provenance_type: str = "EXPLICIT_SOURCE_RELATION"
    verification_status: str = "VERIFIED"

class TimelineEventOut(TimelineEventBase):
    id: int
    is_demo_data: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TimelineCandidateGenerateRequest(BaseModel):
    document_id: int

class TimelineReviewAction(BaseModel):
    action: str # "APPROVE" or "REJECT"
    notes: Optional[str] = None
