from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ImportItem(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    creator: Optional[str] = "Dr. B. R. Ambedkar"
    author: Optional[str] = None
    date: Optional[str] = None
    year: Optional[int] = None
    language: Optional[str] = "English"
    document_type: str = "BOOK"
    collection_name: Optional[str] = None
    source_name: str = "Dr. Ambedkar Foundation"
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    file_path: Optional[str] = None
    rights: Optional[str] = "Public Domain / Institutional Heritage Access"
    access_level: Optional[str] = "PUBLIC"
    keywords: Optional[str] = None
    is_demo_data: bool = False

class ImportReportOut(BaseModel):
    total_processed: int
    imported_count: int
    skipped_count: int
    failed_count: int
    duplicates_count: int
    duplicate_identifiers: List[str] = []
    duplicate_checksums: List[str] = []
    errors: List[str] = []
    imported_documents: List[Dict[str, Any]] = []
    status: str = "COMPLETED"
