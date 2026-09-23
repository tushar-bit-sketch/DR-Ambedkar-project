"""
Pydantic Schemas for Phase 8 Audio/Video Archive & Media Intelligence.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class MediaVersionOut(BaseModel):
    id: int
    media_id: int
    version_number: int
    derivative_type: str
    file_path: str
    mime_type: str
    codec: Optional[str] = None
    container: Optional[str] = None
    resolution: Optional[str] = None
    frame_rate: Optional[float] = None
    bit_rate: Optional[int] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    duration: Optional[float] = None
    file_size: Optional[int] = None
    checksum_sha256: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MediaMetadataOut(BaseModel):
    id: int
    media_id: int
    metadata_category: str
    raw_json: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TranscriptSegmentBase(BaseModel):
    sequence: int = 0
    start_time: float
    end_time: float
    start_timestamp_str: str
    end_timestamp_str: str
    text: str
    speaker_label: Optional[str] = "UNKNOWN"
    confidence: Optional[float] = 1.0
    verification_status: Optional[str] = "PENDING_REVIEW"
    source_reference: Optional[str] = None


class TranscriptSegmentCreate(TranscriptSegmentBase):
    pass


class TranscriptSegmentOut(TranscriptSegmentBase):
    id: int
    transcript_id: int

    model_config = ConfigDict(from_attributes=True)


class MediaTranscriptCreate(BaseModel):
    language: str = "en"
    source_type: str = "HUMAN_TRANSCRIPT" # HUMAN_TRANSCRIPT, MACHINE_TRANSCRIPT, IMPORTED_TRANSCRIPT, CURATOR_CORRECTED
    status: str = "PENDING_REVIEW"
    model: Optional[str] = None
    model_version: Optional[str] = None
    segments: List[TranscriptSegmentCreate] = []


class MediaTranscriptOut(BaseModel):
    id: int
    media_id: int
    version: int
    language: str
    source_type: str
    status: str
    model: Optional[str] = None
    model_version: Optional[str] = None
    processing_time_ms: Optional[int] = None
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    segments: List[TranscriptSegmentOut] = []

    model_config = ConfigDict(from_attributes=True)


class TranscriptReviewRequest(BaseModel):
    action: str # APPROVE, REJECT, EDIT_AND_APPROVE
    segments: Optional[List[TranscriptSegmentCreate]] = None
    reviewer_notes: Optional[str] = None


class MediaCaptionOut(BaseModel):
    id: int
    media_id: int
    transcript_id: Optional[int] = None
    format: str # WEBVTT, SRT
    language: str
    caption_text: str
    verification_status: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MediaCollectionCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    access_level: Optional[str] = "PUBLIC"
    source: Optional[str] = None


class MediaCollectionOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    cover_image_path: Optional[str] = None
    access_level: str
    source: Optional[str] = None
    verification_status: str
    created_at: Optional[datetime] = None
    asset_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class MediaProcessingJobOut(BaseModel):
    id: int
    media_id: int
    job_type: str
    status: str
    progress: int
    attempt: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    tool_name: Optional[str] = None
    tool_version: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MediaIntegrityRecordOut(BaseModel):
    id: int
    media_id: int
    media_version_id: Optional[int] = None
    expected_sha256: str
    actual_sha256: str
    status: str
    verified_at: Optional[datetime] = None
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MediaAssetBase(BaseModel):
    archive_id: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    media_type: str # AUDIO, VIDEO, IMAGE, PHOTOGRAPH, OTHER
    format: str
    mime_type: str
    duration: Optional[float] = None
    file_size: int
    checksum_sha256: str
    source_name: str = "Dr. Ambedkar National Memorial"
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    creator: Optional[str] = None
    date: Optional[str] = None
    date_precision: str = "EXACT_DAY"
    language: str = "English"
    original_language: Optional[str] = None
    location: Optional[str] = None
    collection_id: Optional[int] = None
    rights: str = "Public Domain / Institutional Heritage Access"
    license: Optional[str] = None
    access_level: str = "PUBLIC" # PUBLIC, RESEARCH_ONLY, RESTRICTED, PRIVATE
    download_policy: str = "STREAM_ONLY" # STREAM_ONLY, DOWNLOAD_ALLOWED, ADMIN_ONLY
    verification_status: str = "UNVERIFIED" # UNVERIFIED, PENDING_REVIEW, VERIFIED, REJECTED
    archival_status: str = "MASTER_PRESERVED" # MASTER_PRESERVED, DERIVATIVES_GENERATED, QUARANTINED, CORRUPTED
    is_demo_data: bool = False
    original_filename: str


class MediaAssetCreate(BaseModel):
    archive_id: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    media_type: str
    format: str
    mime_type: str
    source_name: Optional[str] = "Dr. Ambedkar National Memorial"
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    creator: Optional[str] = None
    date: Optional[str] = None
    date_precision: Optional[str] = "EXACT_DAY"
    language: Optional[str] = "English"
    original_language: Optional[str] = None
    location: Optional[str] = None
    collection_id: Optional[int] = None
    rights: Optional[str] = "Public Domain / Institutional Heritage Access"
    license: Optional[str] = None
    access_level: Optional[str] = "PUBLIC"
    download_policy: Optional[str] = "STREAM_ONLY"
    verification_status: Optional[str] = "UNVERIFIED"
    is_demo_data: Optional[bool] = False


class MediaAssetUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    creator: Optional[str] = None
    date: Optional[str] = None
    date_precision: Optional[str] = None
    language: Optional[str] = None
    location: Optional[str] = None
    collection_id: Optional[int] = None
    rights: Optional[str] = None
    license: Optional[str] = None
    access_level: Optional[str] = None
    download_policy: Optional[str] = None
    verification_status: Optional[str] = None


class MediaAssetOut(MediaAssetBase):
    id: int
    storage_path: str
    thumbnail_path: Optional[str] = None
    poster_path: Optional[str] = None
    waveform_data_path: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    versions: List[MediaVersionOut] = []
    transcripts: List[MediaTranscriptOut] = []
    captions: List[MediaCaptionOut] = []

    model_config = ConfigDict(from_attributes=True)


class MediaAssetListItem(BaseModel):
    id: int
    archive_id: str
    title: str
    subtitle: Optional[str] = None
    media_type: str
    format: str
    mime_type: str
    duration: Optional[float] = None
    file_size: int
    checksum_sha256: str
    source_name: str
    creator: Optional[str] = None
    date: Optional[str] = None
    date_precision: str
    language: str
    access_level: str
    download_policy: str
    verification_status: str
    archival_status: str
    is_demo_data: bool
    thumbnail_path: Optional[str] = None
    poster_path: Optional[str] = None
    has_transcript: bool = False
    has_captions: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MediaProvenanceOut(BaseModel):
    media_id: int
    archive_id: str
    title: str
    original_filename: str
    checksum_sha256: str
    file_size: int
    source_name: str
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    rights: str
    archival_lineage: List[Dict[str, Any]] = []
    verification_status: str


class MediaDiagnosticsOut(BaseModel):
    ffmpeg_available: bool
    ffmpeg_status: str
    ffprobe_available: bool
    ffprobe_status: str
    whisper_available: bool
    whisper_status: str
    native_opencv_available: bool
    native_pillow_available: bool
    native_wave_available: bool
    active_processor: str
    message: str


class TranscriptSearchResult(BaseModel):
    media_id: int
    archive_id: str
    media_title: str
    media_type: str
    segment_id: int
    start_time: float
    end_time: float
    start_timestamp_str: str
    end_timestamp_str: str
    speaker_label: str
    confidence: float
    snippet: str
    matching_text: str
