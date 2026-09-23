from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.file import ArchivalFileOut

class LanguageOut(BaseModel):
    id: int
    code: str
    name: str
    script: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class AuthorOut(BaseModel):
    id: int
    name: str
    role_title: Optional[str] = None
    bio: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TopicOut(BaseModel):
    id: int
    name: str
    slug: str
    model_config = ConfigDict(from_attributes=True)

class DocumentMetadataOut(BaseModel):
    id: int
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)

class DocumentVersionOut(BaseModel):
    id: int
    version_number: int
    file_id: Optional[int] = None
    file_path: Optional[str] = None
    file_format: str
    file_size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    change_description: Optional[str] = None
    created_at: datetime
    file: Optional[ArchivalFileOut] = None
    model_config = ConfigDict(from_attributes=True)

class DocumentBase(BaseModel):
    archive_id: str
    title: str
    subtitle: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    document_type: str = "BOOK" # BOOK, ARTICLE, SPEECH, MANUSCRIPT, DEBATE, LETTER, PHOTOGRAPH, GOVERNMENT_DOCUMENT, HISTORICAL_RECORD, OTHER
    
    collection_id: Optional[int] = None
    author_id: Optional[int] = None
    creator: Optional[str] = None

    date: Optional[str] = None
    date_created: Optional[str] = None
    date_precision: str = "EXACT" # EXACT, YEAR_MONTH, YEAR, APPROXIMATE
    year: Optional[int] = None
    date_approximate: bool = False

    language: str = "English"
    original_language: Optional[str] = None
    location: Optional[str] = None
    publisher: Optional[str] = None

    source_name: str = "Dr. Ambedkar Foundation"
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    source_reference: Optional[str] = None
    physical_location: Optional[str] = None
    rights: str = "Public Domain / Institutional Heritage Access"
    access_level: str = "PUBLIC" # PUBLIC, RESTRICTED, INTERNAL
    keywords: Optional[str] = None

    status: str = "DRAFT" # DRAFT, UNDER_REVIEW, VERIFIED, PUBLISHED
    verification_status: str = "UNVERIFIED" # UNVERIFIED, UNDER_REVIEW, VERIFIED, REJECTED
    checksum: Optional[str] = None
    is_demo_data: bool = False

class DocumentCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    document_type: str = "BOOK"
    collection_id: Optional[int] = None
    creator: Optional[str] = "Dr. B. R. Ambedkar"
    date: Optional[str] = None
    date_precision: str = "EXACT"
    year: Optional[int] = None
    language: str = "English"
    original_language: Optional[str] = None
    location: Optional[str] = None
    publisher: Optional[str] = None
    source_name: str = "Dr. Ambedkar Foundation"
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    rights: str = "Public Domain / Institutional Heritage Access"
    access_level: str = "PUBLIC"
    keywords: Optional[str] = None
    status: str = "DRAFT"
    verification_status: str = "UNVERIFIED"
    is_demo_data: bool = False

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[str] = None
    collection_id: Optional[int] = None
    creator: Optional[str] = None
    date: Optional[str] = None
    date_precision: Optional[str] = None
    year: Optional[int] = None
    language: Optional[str] = None
    original_language: Optional[str] = None
    location: Optional[str] = None
    publisher: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    rights: Optional[str] = None
    access_level: Optional[str] = None
    keywords: Optional[str] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None
    is_demo_data: Optional[bool] = None

class DocumentVerificationRequest(BaseModel):
    verification_status: str # UNVERIFIED, UNDER_REVIEW, VERIFIED, REJECTED
    reason: Optional[str] = "Curatorial accession review"

class DocumentOut(DocumentBase):
    id: int
    collection_title: Optional[str] = None
    author_name: Optional[str] = None
    language_name: Optional[str] = None
    transcription_status: Optional[str] = None
    vector_indexed: bool = False
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    primary_file_path: Optional[str] = None
    primary_file_id: Optional[int] = None
    file_mime_type: Optional[str] = None
    integrity_status: Optional[str] = "VALID"

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailOut(DocumentOut):
    language_rel: Optional[LanguageOut] = None
    author: Optional[AuthorOut] = None
    topics: List[TopicOut] = []
    versions: List[DocumentVersionOut] = []
    metadata_entries: List[DocumentMetadataOut] = []
    ocr_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[DocumentOut]
    is_demo_data: bool = False
    disclaimer: Optional[str] = None
