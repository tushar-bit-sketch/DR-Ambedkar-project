from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    description: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    result: str = "SUCCESS"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RecentUploadItem(BaseModel):
    id: int
    archive_id: str
    title: str
    document_type: str
    source_name: str
    verification_status: str
    created_at: datetime

class AdminStatisticsOut(BaseModel):
    total_documents: int
    verified_documents: int
    pending_review: int
    collections_count: int
    media_items: int
    languages_count: int
    recent_activity_count: int
    storage_bytes: int
    storage_mb: float
    recent_uploads: List[RecentUploadItem] = []
    empty_state_message: Optional[str] = None
    disclaimer: Optional[str] = None
