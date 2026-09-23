from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class MediaItemBase(BaseModel):
    title: str
    media_type: str # AUDIO, VIDEO, PHOTOGRAPH
    format: str # MP3, WAV, MP4, JPEG, PNG
    duration_seconds: Optional[int] = None
    file_path: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    date_recorded: Optional[str] = None
    location: Optional[str] = None
    verification_status: str = "VERIFIED"
    document_id: Optional[int] = None

class MediaItemOut(MediaItemBase):
    id: int
    created_at: datetime
    is_demo_data: bool = True

    model_config = ConfigDict(from_attributes=True)
