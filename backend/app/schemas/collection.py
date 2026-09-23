from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class CollectionBase(BaseModel):
    name: str
    title: Optional[str] = None # Backwards compatible
    slug: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = "Dr. Ambedkar Foundation"
    language: str = "English"
    date_range: Optional[str] = None
    period: Optional[str] = None
    curator_notes: Optional[str] = None
    cover_image: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: str = "ACTIVE" # ACTIVE, ARCHIVED

class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source: Optional[str] = "Dr. Ambedkar Foundation"
    language: str = "English"
    date_range: Optional[str] = None
    curator_notes: Optional[str] = None
    cover_image: Optional[str] = None
    status: str = "ACTIVE"

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    language: Optional[str] = None
    date_range: Optional[str] = None
    curator_notes: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[str] = None

class CollectionOut(CollectionBase):
    id: int
    is_deleted: bool = False
    created_at: datetime
    document_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
