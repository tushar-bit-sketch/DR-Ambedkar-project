from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ArchivalFileBase(BaseModel):
    filename: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    storage_path: str
    checksum: str
    integrity_status: str = "VALID"

class ArchivalFileOut(ArchivalFileBase):
    id: int
    uploaded_by: Optional[int] = None
    uploaded_at: datetime
    last_integrity_check: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class IntegrityCheckResult(BaseModel):
    file_id: int
    filename: str
    expected_checksum: str
    computed_checksum: Optional[str] = None
    integrity_status: str # VALID or INTEGRITY_CHECK_FAILED
    message: str
    checked_at: datetime
