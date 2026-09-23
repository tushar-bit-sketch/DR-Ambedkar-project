import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Table, Float, LargeBinary, BigInteger
)
from sqlalchemy.orm import relationship
from app.db.base import Base

# Association table for Document <-> Topic
document_topics = Table(
    "document_topics",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", Integer, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
)

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True) # SUPER_ADMIN, ARCHIVIST, RESEARCHER, REVIEWER, VISITOR
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    role = relationship("Role", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    uploaded_files = relationship("ArchivalFile", back_populates="uploader")

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=True) # Backwards compatible alias
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    source = Column(String(255), nullable=True) # e.g. Dr. Ambedkar Foundation
    language = Column(String(50), default="English")
    date_range = Column(String(100), nullable=True)
    period = Column(String(100), nullable=True) # Backwards compatible alias
    curator_notes = Column(Text, nullable=True)
    cover_image = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True) # Backwards compatible alias
    status = Column(String(20), default="ACTIVE") # ACTIVE, ARCHIVED
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    documents = relationship("Document", back_populates="collection")

class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False) # en, mr, hi, sa, etc.
    name = Column(String(100), nullable=False)
    script = Column(String(100), nullable=True)

    documents = relationship("Document", back_populates="language_rel")

class Author(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    role_title = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)

    documents = relationship("Document", back_populates="author")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)

    documents = relationship("Document", secondary=document_topics, back_populates="topics")

class ArchivalFile(Base):
    __tablename__ = "archival_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False) # Sanitized storage filename
    original_filename = Column(String(255), nullable=False) # Client uploaded name
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False) # Relative path in storage
    checksum = Column(String(128), unique=True, nullable=False, index=True) # SHA-256 hash
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    integrity_status = Column(String(30), default="VALID") # VALID, INTEGRITY_CHECK_FAILED, UNCHECKED
    last_integrity_check = Column(DateTime, nullable=True)

    uploader = relationship("User", back_populates="uploaded_files")
    versions = relationship("DocumentVersion", back_populates="file")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    archive_id = Column(String(100), unique=True, nullable=False, index=True) # e.g. AMB-CAD-1949-042
    title = Column(String(500), nullable=False, index=True)
    subtitle = Column(String(500), nullable=True)
    slug = Column(String(500), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    document_type = Column(String(50), nullable=False, index=True) # BOOK, ARTICLE, SPEECH, MANUSCRIPT, DEBATE, LETTER, PHOTOGRAPH, GOVERNMENT_DOCUMENT, HISTORICAL_RECORD, OTHER
    
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=True)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    creator = Column(String(255), nullable=True) # Primary creator/author text

    date = Column(String(50), nullable=True) # Canonical date representation
    date_created = Column(String(50), nullable=True) # Backwards compatible
    date_precision = Column(String(20), default="EXACT") # EXACT, YEAR_MONTH, YEAR, APPROXIMATE
    year = Column(Integer, nullable=True, index=True)
    date_approximate = Column(Boolean, default=False)

    language = Column(String(50), default="English")
    original_language = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True) # Origin or physical location
    publisher = Column(String(255), nullable=True) # Publishing body

    # Provenance and Sourcing
    source_name = Column(String(255), nullable=False, default="Dr. Ambedkar Foundation") # Sourced institutional repository
    source_url = Column(String(500), nullable=True) # Source link
    source_identifier = Column(String(100), nullable=True, index=True) # Source repository accession ID (for duplicate detection)
    source_reference = Column(String(500), nullable=True) # Citation or physical reference
    physical_location = Column(String(500), nullable=True)
    rights = Column(String(255), default="Public Domain / Institutional Heritage Access")
    access_level = Column(String(20), default="PUBLIC", index=True) # PUBLIC, RESTRICTED, INTERNAL
    keywords = Column(Text, nullable=True) # Comma-separated or search tags

    # Archival Status & Verification
    status = Column(String(20), default="DRAFT", index=True) # DRAFT, UNDER_REVIEW, VERIFIED, PUBLISHED
    verification_status = Column(String(30), default="UNVERIFIED", index=True) # UNVERIFIED, UNDER_REVIEW, VERIFIED, REJECTED
    checksum = Column(String(128), nullable=True) # Primary master SHA-256

    # Integrity & Demo flags
    is_demo_data = Column(Boolean, default=False, index=True) # Critical: flag synthetic/demo items

    # Soft Delete
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Placeholders for future phases
    ocr_text = Column(Text, nullable=True)
    transcription_status = Column(String(50), default="PENDING_PHASE2")
    vector_indexed = Column(Boolean, default=False)
    thumbnail_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    collection = relationship("Collection", back_populates="documents")
    author = relationship("Author", back_populates="documents")
    language_rel = relationship("Language", back_populates="documents")
    topics = relationship("Topic", secondary=document_topics, back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.version_number")
    metadata_entries = relationship("DocumentMetadata", back_populates="document", cascade="all, delete-orphan")
    media_items = relationship("MediaItem", back_populates="document")
    timeline_events = relationship("TimelineEvent", back_populates="document")
    ocr_jobs = relationship("OCRJob", back_populates="document", cascade="all, delete-orphan", order_by="OCRJob.created_at.desc()")
    search_chunks = relationship("SearchChunk", back_populates="document", cascade="all, delete-orphan")
    search_jobs = relationship("SearchIndexJob", back_populates="document", cascade="all, delete-orphan")
    translations = relationship("Translation", back_populates="document", cascade="all, delete-orphan", order_by="Translation.created_at.desc()")
    audio_derivatives = relationship("AudioDerivative", back_populates="document", cascade="all, delete-orphan", order_by="AudioDerivative.created_at.desc()")

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, default=1, nullable=False)
    file_id = Column(Integer, ForeignKey("archival_files.id"), nullable=True)
    file_path = Column(String(500), nullable=True) # Storage path
    file_format = Column(String(50), nullable=False) # PDF, TIFF, TXT, EPUB, MP3, MP4
    file_size_bytes = Column(Integer, nullable=True)
    checksum = Column(String(128), nullable=True) # SHA-256 checksum
    change_description = Column(Text, nullable=True) # Reason for revision
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="versions")
    file = relationship("ArchivalFile", back_populates="versions")

class DocumentMetadata(Base):
    __tablename__ = "document_metadata"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(100), nullable=False, index=True) # Dublin Core term (dc.title, dc.creator, etc.)
    value = Column(Text, nullable=False)

    document = relationship("Document", back_populates="metadata_entries")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False, index=True)
    exact_date = Column(String(50), nullable=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=True)
    related_locations = Column(String(255), nullable=True)
    related_people = Column(String(255), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    date_precision = Column(String(30), default="YEAR") # EXACT_DAY, MONTH, YEAR, DECADE, APPROXIMATE, UNKNOWN
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    verification_status = Column(String(50), default="VERIFIED", index=True) # VERIFIED, PENDING_REVIEW, REJECTED
    provenance_type = Column(String(50), default="EXPLICIT_SOURCE_RELATION") # EXPLICIT_SOURCE_RELATION, MACHINE_EXTRACTED
    confidence = Column(Float, default=1.0)
    evidence_text = Column(Text, nullable=True)
    document_version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="SET NULL"), nullable=True)
    page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="SET NULL"), nullable=True)
    chunk_id = Column(Integer, ForeignKey("search_chunks.id", ondelete="SET NULL"), nullable=True)
    media_asset_id = Column(Integer, ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True, index=True)
    media_timestamp = Column(String(50), nullable=True)
    is_demo_data = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="timeline_events")
    entities = relationship("TimelineEventEntity", back_populates="timeline_event", cascade="all, delete-orphan")
    media_asset = relationship("MediaAsset")

class MediaItem(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False, index=True)
    media_type = Column(String(50), nullable=False, index=True) # AUDIO, VIDEO, PHOTOGRAPH
    format = Column(String(20), nullable=False) # MP3, WAV, MP4, JPEG, PNG
    duration_seconds = Column(Integer, nullable=True)
    file_id = Column(Integer, ForeignKey("archival_files.id"), nullable=True)
    file_path = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    date_recorded = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    verification_status = Column(String(50), default="VERIFIED")
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="media_items")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True) # DOCUMENT_CREATED, DOCUMENT_UPDATED, DOCUMENT_VERIFIED, DOCUMENT_REJECTED, DOCUMENT_DELETED, FILE_UPLOADED, etc.
    entity = Column(String(100), nullable=False) # DOCUMENT, FILE, COLLECTION, USER, IMPORT
    entity_id = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    details = Column(Text, nullable=True) # Backwards compatible
    ip_address = Column(String(45), nullable=True)
    result = Column(String(50), default="SUCCESS") # SUCCESS, FAILED
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")

# ==========================================
# PHASE 3: OCR & MANUSCRIPT DIGITIZATION
# ==========================================

class OCRJob(Base):
    __tablename__ = "ocr_jobs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="QUEUED", index=True) # QUEUED, PROCESSING, COMPLETED, FAILED, REVIEW_REQUIRED, APPROVED
    engine = Column(String(50), default="PADDLEOCR", nullable=False) # PADDLEOCR, TESSERACT, PDF_DIRECT
    engine_version = Column(String(50), default="2.8.0")
    model_name = Column(String(100), default="PP-OCRv4")
    model_config = Column(Text, nullable=True) # JSON config for reproducibility
    preprocessing_config = Column(Text, nullable=True) # JSON: {dpi, grayscale, deskew, denoise, contrast_clahe, thresholding}
    language = Column(String(50), default="English", nullable=False)
    total_pages = Column(Integer, default=0)
    processed_pages = Column(Integer, default=0)
    failed_pages = Column(Integer, default=0)
    avg_confidence = Column(Float, nullable=True) # Numerical OCR MODEL CONFIDENCE (0.0 - 1.0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="ocr_jobs")
    creator = relationship("User", foreign_keys=[created_by])
    pages = relationship("OCRPage", back_populates="job", cascade="all, delete-orphan", order_by="OCRPage.page_number")

class OCRPage(Base):
    __tablename__ = "ocr_pages"

    id = Column(Integer, primary_key=True, index=True)
    ocr_job_id = Column(Integer, ForeignKey("ocr_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    dpi = Column(Integer, default=300)
    raw_text = Column(Text, nullable=True)
    cleaned_text = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0) # Numerical OCR MODEL CONFIDENCE (0.0 - 1.0)
    confidence_category = Column(String(20), default="LOW") # HIGH, MEDIUM, LOW
    is_low_confidence = Column(Boolean, default=False)
    processing_time_ms = Column(Integer, default=0)
    status = Column(String(50), default="PENDING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED, REVIEW_REQUIRED, APPROVED, REJECTED
    image_derivative_path = Column(String(500), nullable=True) # Preprocessed derivative folio
    original_page_image_path = Column(String(500), nullable=True) # Unprocessed raster folio
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    job = relationship("OCRJob", back_populates="pages")
    blocks = relationship("OCRBlock", back_populates="page", cascade="all, delete-orphan")
    reviews = relationship("OCRReview", back_populates="page", cascade="all, delete-orphan", order_by="OCRReview.reviewed_at.desc()")
    versions = relationship("OCRTextVersion", back_populates="page", cascade="all, delete-orphan", order_by="OCRTextVersion.version_number")

class OCRBlock(Base):
    __tablename__ = "ocr_blocks"

    id = Column(Integer, primary_key=True, index=True)
    ocr_page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0) # OCR MODEL CONFIDENCE
    x = Column(Integer, default=0)
    y = Column(Integer, default=0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    block_type = Column(String(50), default="PARAGRAPH") # PARAGRAPH, LINE, HEADING, WORD

    page = relationship("OCRPage", back_populates="blocks")

class OCRReview(Base):
    __tablename__ = "ocr_reviews"

    id = Column(Integer, primary_key=True, index=True)
    ocr_page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_email = Column(String(255), nullable=True)
    status = Column(String(50), default="PENDING") # PENDING, APPROVED, REJECTED, CORRECTED
    corrected_text = Column(Text, nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.datetime.utcnow)

    page = relationship("OCRPage", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])

class OCRTextVersion(Base):
    __tablename__ = "ocr_text_versions"

    id = Column(Integer, primary_key=True, index=True)
    ocr_page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    text = Column(Text, nullable=False)
    engine = Column(String(50), nullable=False) # PADDLEOCR, TESSERACT, HUMAN_CORRECTION, etc.
    language = Column(String(50), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    change_summary = Column(Text, nullable=True) # e.g. "Initial machine OCR output", "Curatorial correction"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    page = relationship("OCRPage", back_populates="versions")
    author = relationship("User", foreign_keys=[created_by])

class SearchChunk(Base):
    """
    SearchChunk represents a discrete, searchable passage extracted from
    an archival document and its OCR transcription layers.
    Preserves unbroken provenance back to Document -> DocumentVersion -> OCRTextVersion -> OCRPage.
    """
    __tablename__ = "search_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    document_version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="SET NULL"), nullable=True)
    ocr_text_version_id = Column(Integer, ForeignKey("ocr_text_versions.id", ondelete="SET NULL"), nullable=True)
    ocr_page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="SET NULL"), nullable=True)
    ocr_block_id = Column(Integer, ForeignKey("ocr_blocks.id", ondelete="SET NULL"), nullable=True)

    chunk_sequence = Column(Integer, default=0, nullable=False)
    page_number = Column(Integer, default=1, nullable=False)
    folio_number = Column(String(50), nullable=True)
    
    chunk_text = Column(Text, nullable=False)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)
    token_count = Column(Integer, nullable=True)
    content_hash = Column(String(64), nullable=False, index=True) # SHA-256 for deterministic deduplication

    # Vector representation: LargeBinary for float32 array in SQLite fallback / Vector(1024) in Postgres
    embedding_vector = Column(LargeBinary, nullable=True)
    embedding_model = Column(String(100), default="BAAI/bge-m3")
    embedding_version = Column(String(50), default="1.0")
    embedding_dim = Column(Integer, default=1024)
    is_normalized = Column(Boolean, default=True)

    # Lifecycle & Verification
    is_verified = Column(Boolean, default=False, index=True)
    transcription_layer = Column(String(50), default="HUMAN_REVIEWED") # HUMAN_REVIEWED, MACHINE_UNVERIFIED
    status = Column(String(30), default="INDEXED", index=True) # INDEXED, STALE, FAILED, DELETED
    error_message = Column(Text, nullable=True)

    indexed_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="search_chunks")
    ocr_page = relationship("OCRPage")
    ocr_text_version = relationship("OCRTextVersion")

class SearchIndexJob(Base):
    """
    SearchIndexJob tracks asynchronous indexing and re-indexing runs.
    """
    __tablename__ = "search_index_jobs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    job_type = Column(String(50), default="DOCUMENT_INDEX") # DOCUMENT_INDEX, REINDEX_DOCUMENT, FULL_REBUILD
    status = Column(String(30), default="QUEUED", index=True) # QUEUED, PROCESSING, COMPLETED, FAILED
    
    total_chunks = Column(Integer, default=0)
    indexed_chunks = Column(Integer, default=0)
    failed_chunks = Column(Integer, default=0)
    
    embedding_model = Column(String(100), default="BAAI/bge-m3")
    embedding_dim = Column(Integer, default=1024)
    error = Column(Text, nullable=True)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="search_jobs")
    creator = relationship("User", foreign_keys=[created_by])

class ResearchConversation(Base):
    """
    ResearchConversation tracks multi-turn research inquiry threads
    while preserving strict source provenance across conversational turns.
    """
    __tablename__ = "research_conversations"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=False, default="Archival Research Inquiry")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    messages = relationship("ResearchMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ResearchMessage.created_at")

class ResearchMessage(Base):
    """
    ResearchMessage records each question and grounded assistant response,
    including exact citation mappings and retrieved chunk IDs for reproducibility.
    """
    __tablename__ = "research_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(100), ForeignKey("research_conversations.conversation_id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False) # "user" or "assistant"
    content = Column(Text, nullable=False)
    status = Column(String(50), default="SUCCESS", index=True) # SUCCESS, NO_EVIDENCE, INSUFFICIENT_EVIDENCE, LLM_UNAVAILABLE, CITATION_VALIDATION_FAILED, UNAUTHORIZED
    grounded = Column(Boolean, default=False)
    evidence_count = Column(Integer, default=0)
    
    # Provenance tracking for reproducibility
    citations_json = Column(Text, nullable=True) # JSON list of Citation objects
    retrieved_chunk_ids = Column(Text, nullable=True) # JSON array of int IDs
    retrieved_document_ids = Column(Text, nullable=True) # JSON array of int IDs
    retrieved_page_ids = Column(Text, nullable=True) # JSON array of int page numbers
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("ResearchConversation", back_populates="messages")

class ResearchAuditLog(Base):
    """
    ResearchAuditLog records every research query, retrieved evidence IDs,
    generation status, citation validation status, and provider metadata for compliance.
    """
    __tablename__ = "research_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    conversation_id = Column(String(100), nullable=True, index=True)
    query = Column(Text, nullable=False)
    retrieved_document_ids = Column(Text, nullable=True)
    retrieved_page_ids = Column(Text, nullable=True)
    retrieved_chunk_ids = Column(Text, nullable=True)
    generation_status = Column(String(50), nullable=False)
    citation_validation_status = Column(String(50), nullable=False)
    llm_provider = Column(String(50), nullable=True)
    llm_model = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

# ==========================================
# PHASE 6: MULTILINGUAL, VOICE & ACCESSIBILITY
# ==========================================

class Translation(Base):
    """
    Translation entity represents a derivative translation of approved original archival text.
    Maintains strict unbroken provenance back to Document -> Version -> OCRPage -> OCRTextVersion.
    Preserves immutability of original archival master.
    """
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    document_version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="SET NULL"), nullable=True)
    ocr_text_version_id = Column(Integer, ForeignKey("ocr_text_versions.id", ondelete="SET NULL"), nullable=True)
    ocr_page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="SET NULL"), nullable=True)
    
    source_language = Column(String(50), nullable=False, default="English")
    target_language = Column(String(50), nullable=False, index=True) # Hindi, Marathi, Tamil, etc.
    translated_title = Column(String(500), nullable=True)
    translated_text = Column(Text, nullable=False)
    
    translation_provider = Column(String(100), nullable=False) # "LOCAL_LLM", "INDICTRANS2", "HUMAN"
    translation_model = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    translation_version = Column(Integer, default=1, nullable=False)
    
    # Statuses: MACHINE_GENERATED, UNDER_REVIEW, HUMAN_REVIEWED, APPROVED, REJECTED
    status = Column(String(50), default="MACHINE_GENERATED", nullable=False, index=True)
    reviewer_notes = Column(Text, nullable=True)
    
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="translations")
    document_version = relationship("DocumentVersion")
    ocr_page = relationship("OCRPage")
    ocr_text_version = relationship("OCRTextVersion")
    creator = relationship("User", foreign_keys=[created_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    audio_derivatives = relationship("AudioDerivative", back_populates="translation", cascade="all, delete-orphan")

class AudioDerivative(Base):
    """
    AudioDerivative represents generated or archival audio narration.
    Stored separately in storage/audio/ with SHA-256 integrity verification.
    """
    __tablename__ = "audio_derivatives"

    id = Column(Integer, primary_key=True, index=True)
    audio_id = Column(String(100), unique=True, nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    document_version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="SET NULL"), nullable=True)
    ocr_page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="SET NULL"), nullable=True)
    translation_id = Column(Integer, ForeignKey("translations.id", ondelete="SET NULL"), nullable=True)
    source_text_version_id = Column(Integer, ForeignKey("ocr_text_versions.id", ondelete="SET NULL"), nullable=True)
    
    language = Column(String(50), default="English", nullable=False)
    voice = Column(String(100), nullable=True)
    provider = Column(String(100), default="WINDOWS_SAPI", nullable=False)
    model = Column(String(100), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    file_format = Column(String(20), default="WAV")
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    checksum = Column(String(128), nullable=False, index=True)
    timing_data_json = Column(Text, nullable=True) # Provider-generated timestamps only
    
    # Statuses: QUEUED, PROCESSING, COMPLETED, FAILED
    status = Column(String(50), default="COMPLETED", index=True)
    error_message = Column(Text, nullable=True)
    
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="audio_derivatives")
    document_version = relationship("DocumentVersion")
    ocr_page = relationship("OCRPage")
    translation = relationship("Translation", back_populates="audio_derivatives")
    creator = relationship("User", foreign_keys=[created_by])


# ---------------------------------------------------------------------------
# PHASE 7: KNOWLEDGE GRAPH, INTELLIGENT TIMELINE & ENTITY RELATIONSHIPS
# ---------------------------------------------------------------------------

class GraphEntity(Base):
    """
    Normalized GraphEntity representing a historical person, place, event, document,
    organization, concept, or other historical node in the institutional Knowledge Graph.
    Strictly forbids fabricated entities.
    """
    __tablename__ = "graph_entities"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    canonical_name = Column(String(255), nullable=False, index=True)
    alternate_names = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    language = Column(String(50), default="English")
    verification_status = Column(String(50), default="VERIFIED", index=True)
    source_reference = Column(String(500), nullable=True)
    birth_date = Column(String(50), nullable=True)
    death_date = Column(String(50), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    date_precision = Column(String(30), default="YEAR")
    location = Column(String(255), nullable=True)
    external_identifier = Column(String(255), nullable=True)
    access_level = Column(String(50), default="PUBLIC", index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])
    aliases = relationship("GraphEntityAlias", back_populates="entity", cascade="all, delete-orphan")
    outgoing_relationships = relationship(
        "GraphRelationship",
        foreign_keys="GraphRelationship.source_entity_id",
        back_populates="source_entity",
        cascade="all, delete-orphan"
    )
    incoming_relationships = relationship(
        "GraphRelationship",
        foreign_keys="GraphRelationship.target_entity_id",
        back_populates="target_entity",
        cascade="all, delete-orphan"
    )
    timeline_event_associations = relationship(
        "TimelineEventEntity",
        back_populates="entity",
        cascade="all, delete-orphan"
    )


class GraphEntityAlias(Base):
    """
    Known aliases, alternative spellings, honorific variants, and multilingual labels
    for a canonical GraphEntity.
    """
    __tablename__ = "graph_entity_aliases"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    alias_name = Column(String(255), nullable=False, index=True)
    language = Column(String(50), default="English")
    source_reference = Column(String(500), nullable=True)
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    entity = relationship("GraphEntity", back_populates="aliases")


class GraphRelationship(Base):
    """
    Provenance-grounded, directed relationship between two GraphEntity nodes.
    Preserves unbroken archival chain back to Document -> Version -> OCR -> Page -> Chunk -> Source.
    """
    __tablename__ = "graph_relationships"

    id = Column(Integer, primary_key=True, index=True)
    source_entity_id = Column(Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(50), nullable=False, index=True)
    target_entity_id = Column(Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Status: APPROVED, PENDING_REVIEW, REJECTED, SUPERSEDED
    verification_status = Column(String(50), default="APPROVED", index=True)
    
    # Provenance Classification: EXPLICIT_SOURCE_RELATION, MACHINE_EXTRACTED_RELATION, MACHINE_INFERRED_RELATION, HUMAN_VERIFIED_RELATION
    provenance_type = Column(String(50), default="EXPLICIT_SOURCE_RELATION", index=True)
    
    # Model extraction confidence (never presented as historical certainty)
    confidence = Column(Float, default=1.0)
    
    evidence_reference = Column(String(500), nullable=True)
    evidence_text = Column(Text, nullable=True)
    source_document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    document_version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    ocr_text_version_id = Column(Integer, ForeignKey("ocr_text_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    page_id = Column(Integer, ForeignKey("ocr_pages.id", ondelete="SET NULL"), nullable=True, index=True)
    chunk_id = Column(Integer, ForeignKey("search_chunks.id", ondelete="SET NULL"), nullable=True, index=True)
    media_asset_id = Column(Integer, ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True, index=True)
    access_level = Column(String(50), default="PUBLIC", index=True)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    source_entity = relationship("GraphEntity", foreign_keys=[source_entity_id], back_populates="outgoing_relationships")
    target_entity = relationship("GraphEntity", foreign_keys=[target_entity_id], back_populates="incoming_relationships")
    source_document = relationship("Document")
    document_version = relationship("DocumentVersion")
    ocr_text_version = relationship("OCRTextVersion")
    ocr_page = relationship("OCRPage")
    search_chunk = relationship("SearchChunk")
    media_asset = relationship("MediaAsset")
    creator = relationship("User", foreign_keys=[created_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class GraphEntityMerge(Base):
    """
    Curatorial record of proposed or executed entity merges for duplicate resolution.
    """
    __tablename__ = "graph_entity_merges"

    id = Column(Integer, primary_key=True, index=True)
    primary_entity_id = Column(Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    merged_entity_id = Column(Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="MATCH_REVIEW_REQUIRED", index=True) # MATCH_CONFIRMED, MATCH_REVIEW_REQUIRED, MATCH_REJECTED
    merge_reason = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    primary_entity = relationship("GraphEntity", foreign_keys=[primary_entity_id])
    merged_entity = relationship("GraphEntity", foreign_keys=[merged_entity_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class TimelineEventEntity(Base):
    """
    Associates a TimelineEvent with participating or referenced GraphEntities.
    """
    __tablename__ = "timeline_event_entities"

    id = Column(Integer, primary_key=True, index=True)
    timeline_event_id = Column(Integer, ForeignKey("timeline_events.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id = Column(Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="SUBJECT") # PRIMARY_SPEAKER, PARTICIPANT, SUBJECT, LOCATION, TOPIC
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    timeline_event = relationship("TimelineEvent", back_populates="entities")
    entity = relationship("GraphEntity", back_populates="timeline_event_associations")


class GraphAuditLog(Base):
    """
    Audit log dedicated to knowledge graph mutations, reviews, and entity merges.
    """
    __tablename__ = "graph_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    target_type = Column(String(50), nullable=False, index=True)
    target_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    details_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User")


# ===========================================================================
# Phase 8: Audio/Video Archive & Media Intelligence Models
# ===========================================================================

class MediaCollection(Base):
    __tablename__ = "media_collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_image_path = Column(String(500), nullable=True)
    access_level = Column(String(20), default="PUBLIC", index=True) # PUBLIC, RESEARCH_ONLY, RESTRICTED, PRIVATE
    source = Column(String(255), nullable=True)
    verification_status = Column(String(30), default="VERIFIED", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    assets = relationship("MediaAsset", back_populates="collection")
    items = relationship("MediaCollectionItem", back_populates="collection", cascade="all, delete-orphan")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True, index=True)
    archive_id = Column(String(100), unique=True, nullable=False, index=True) # e.g. AMB-MED-AUD-1949-001
    title = Column(String(500), nullable=False, index=True)
    subtitle = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    media_type = Column(String(50), nullable=False, index=True) # AUDIO, VIDEO, IMAGE, PHOTOGRAPH, OTHER
    format = Column(String(50), nullable=False) # MP3, WAV, MP4, WEBM, JPEG, PNG, TIFF
    mime_type = Column(String(100), nullable=False)
    duration = Column(Float, nullable=True) # Seconds
    file_size = Column(BigInteger, nullable=False) # Bytes
    checksum_sha256 = Column(String(64), nullable=False, index=True)
    
    source_name = Column(String(255), nullable=False, default="Dr. Ambedkar National Memorial")
    source_url = Column(String(500), nullable=True)
    source_identifier = Column(String(100), nullable=True, index=True)
    creator = Column(String(255), nullable=True)
    date = Column(String(50), nullable=True)
    date_precision = Column(String(30), default="EXACT_DAY") # EXACT_DAY, MONTH, YEAR, DECADE, APPROXIMATE, UNKNOWN
    language = Column(String(50), default="English")
    original_language = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    collection_id = Column(Integer, ForeignKey("media_collections.id", ondelete="SET NULL"), nullable=True, index=True)
    rights = Column(String(255), default="Public Domain / Institutional Heritage Access")
    license = Column(String(255), nullable=True)
    access_level = Column(String(20), default="PUBLIC", index=True) # PUBLIC, RESEARCH_ONLY, RESTRICTED, PRIVATE
    download_policy = Column(String(30), default="STREAM_ONLY", index=True) # STREAM_ONLY, DOWNLOAD_ALLOWED, ADMIN_ONLY
    verification_status = Column(String(30), default="UNVERIFIED", index=True) # UNVERIFIED, PENDING_REVIEW, VERIFIED, REJECTED
    archival_status = Column(String(30), default="MASTER_PRESERVED", index=True) # MASTER_PRESERVED, DERIVATIVES_GENERATED, QUARANTINED, CORRUPTED
    
    is_demo_data = Column(Boolean, default=False, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False) # Path to immutable original master
    thumbnail_path = Column(String(500), nullable=True)
    poster_path = Column(String(500), nullable=True)
    waveform_data_path = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    collection = relationship("MediaCollection", back_populates="assets")
    versions = relationship("MediaVersion", back_populates="media_asset", cascade="all, delete-orphan", order_by="MediaVersion.version_number")
    technical_metadata = relationship("MediaMetadata", back_populates="media_asset", cascade="all, delete-orphan")
    transcripts = relationship("MediaTranscript", back_populates="media_asset", cascade="all, delete-orphan", order_by="MediaTranscript.version")
    captions = relationship("MediaCaption", back_populates="media_asset", cascade="all, delete-orphan")
    processing_jobs = relationship("MediaProcessingJob", back_populates="media_asset", cascade="all, delete-orphan")
    integrity_records = relationship("MediaIntegrityRecord", back_populates="media_asset", cascade="all, delete-orphan")


class MediaVersion(Base):
    __tablename__ = "media_versions"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    derivative_type = Column(String(50), nullable=False, index=True) # ORIGINAL_MASTER, PRESERVATION_COPY, STREAMING_COPY, WEB_PREVIEW, AUDIO_EXTRACT, THUMBNAIL, POSTER_FRAME, WAVEFORM, OTHER
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    codec = Column(String(50), nullable=True)
    container = Column(String(50), nullable=True)
    resolution = Column(String(50), nullable=True) # e.g. 1920x1080
    frame_rate = Column(Float, nullable=True)
    bit_rate = Column(Integer, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    channels = Column(Integer, nullable=True)
    duration = Column(Float, nullable=True)
    file_size = Column(BigInteger, nullable=True)
    checksum_sha256 = Column(String(64), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    media_asset = relationship("MediaAsset", back_populates="versions")
    creator = relationship("User")


class MediaMetadata(Base):
    __tablename__ = "media_technical_metadata"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    metadata_category = Column(String(50), nullable=False, index=True) # TECHNICAL_FFPROBE, TECHNICAL_OPENCV, TECHNICAL_PILLOW, TECHNICAL_WAV, EXIF
    raw_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    media_asset = relationship("MediaAsset", back_populates="technical_metadata")


class MediaTranscript(Base):
    __tablename__ = "media_transcripts"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    language = Column(String(50), default="en")
    source_type = Column(String(50), nullable=False, index=True) # HUMAN_TRANSCRIPT, MACHINE_TRANSCRIPT, IMPORTED_TRANSCRIPT, CURATOR_CORRECTED
    status = Column(String(50), default="MACHINE_GENERATED", index=True) # MACHINE_GENERATED, UNDER_REVIEW, HUMAN_REVIEWED, APPROVED, REJECTED
    model = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)

    media_asset = relationship("MediaAsset", back_populates="transcripts")
    segments = relationship("TranscriptSegment", back_populates="transcript", cascade="all, delete-orphan", order_by="TranscriptSegment.sequence")
    creator = relationship("User", foreign_keys=[created_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    approver = relationship("User", foreign_keys=[approved_by])


class TranscriptSegment(Base):
    __tablename__ = "media_transcript_segments"

    id = Column(Integer, primary_key=True, index=True)
    transcript_id = Column(Integer, ForeignKey("media_transcripts.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence = Column(Integer, default=0, nullable=False)
    start_time = Column(Float, nullable=False) # In seconds e.g. 822.5
    end_time = Column(Float, nullable=False) # In seconds e.g. 848.2
    start_timestamp_str = Column(String(20), nullable=False) # e.g. 00:13:42.500
    end_timestamp_str = Column(String(20), nullable=False) # e.g. 00:14:08.200
    text = Column(Text, nullable=False)
    speaker_label = Column(String(100), default="UNKNOWN") # SPEAKER_1, SPEAKER_2, INTERVIEWER, UNKNOWN
    confidence = Column(Float, default=1.0) # MODEL CONFIDENCE
    verification_status = Column(String(30), default="PENDING_REVIEW") # PENDING_REVIEW, VERIFIED, REJECTED
    source_reference = Column(String(500), nullable=True)

    transcript = relationship("MediaTranscript", back_populates="segments")


class MediaCaption(Base):
    __tablename__ = "media_captions"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    transcript_id = Column(Integer, ForeignKey("media_transcripts.id", ondelete="SET NULL"), nullable=True)
    format = Column(String(20), nullable=False) # WEBVTT, SRT
    language = Column(String(50), default="en")
    caption_text = Column(Text, nullable=False)
    file_path = Column(String(500), nullable=True)
    verification_status = Column(String(30), default="PENDING_REVIEW")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    media_asset = relationship("MediaAsset", back_populates="captions")
    transcript = relationship("MediaTranscript")


class MediaCollectionItem(Base):
    __tablename__ = "media_collection_items"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("media_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    sort_order = Column(Integer, default=0)

    collection = relationship("MediaCollection", back_populates="items")
    media_asset = relationship("MediaAsset")


class MediaProcessingJob(Base):
    __tablename__ = "media_processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    job_type = Column(String(50), nullable=False, index=True) # INSPECT, TRANSCODE, THUMBNAIL, POSTER, WAVEFORM, AUDIO_EXTRACT, TRANSCRIBE, CAPTION_GENERATE, INTEGRITY_CHECK
    status = Column(String(30), default="QUEUED", index=True) # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress = Column(Integer, default=0)
    attempt = Column(Integer, default=1)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    configuration_json = Column(Text, nullable=True)
    tool_name = Column(String(100), nullable=True)
    tool_version = Column(String(50), nullable=True)

    media_asset = relationship("MediaAsset", back_populates="processing_jobs")


class MediaIntegrityRecord(Base):
    __tablename__ = "media_integrity_records"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    media_version_id = Column(Integer, ForeignKey("media_versions.id", ondelete="SET NULL"), nullable=True)
    expected_sha256 = Column(String(64), nullable=False)
    actual_sha256 = Column(String(64), nullable=False)
    status = Column(String(30), nullable=False, index=True) # INTEGRITY_VERIFIED, INTEGRITY_FAILED, NOT_VERIFIED, FILE_MISSING
    verified_at = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(Text, nullable=True)

    media_asset = relationship("MediaAsset", back_populates="integrity_records")


# ---------------------------------------------------------------------------
# Phase 9: Kiosk Hardware, Deployment, Session & Security Models
# ---------------------------------------------------------------------------

class KioskDevice(Base):
    __tablename__ = "kiosk_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_uuid = Column(String(64), unique=True, nullable=False, index=True)
    device_name = Column(String(255), nullable=False)
    institution = Column(String(255), nullable=False, default="Dr. Ambedkar National Memorial")
    location = Column(String(255), nullable=False, default="Exhibition Hall A")
    kiosk_type = Column(String(50), nullable=False, default="TOUCHSCREEN_PEDESTAL") # TOUCHSCREEN_PEDESTAL, DESKTOP_KIOSK, WALL_MOUNT, ACCESSIBLE_KIOSK
    status = Column(String(30), nullable=False, default="REGISTERED", index=True) # REGISTERED, ACTIVE, OFFLINE, MAINTENANCE, DISABLED, ERROR
    device_key_hash = Column(String(64), nullable=False, index=True) # SHA-256 of device API key
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=True, index=True)
    software_version = Column(String(50), default="1.9.0")
    configuration_version = Column(Integer, default=1)
    hardware_fingerprint = Column(String(128), nullable=True)
    capabilities_json = Column(Text, nullable=True)
    current_ip = Column(String(50), nullable=True)
    heartbeat_interval_sec = Column(Integer, default=60)
    last_health_report_json = Column(Text, nullable=True)
    maintenance_mode = Column(Boolean, default=False, index=True)
    enabled = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    heartbeats = relationship("KioskHeartbeatRecord", back_populates="kiosk", cascade="all, delete-orphan", order_by="KioskHeartbeatRecord.timestamp.desc()")
    configuration = relationship("KioskConfiguration", back_populates="kiosk", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("KioskAuditLog", back_populates="kiosk", cascade="all, delete-orphan")


class KioskHeartbeatRecord(Base):
    __tablename__ = "kiosk_heartbeat_records"

    id = Column(Integer, primary_key=True, index=True)
    kiosk_id = Column(Integer, ForeignKey("kiosk_devices.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    status = Column(String(30), nullable=False, default="ONLINE")
    cpu_percent = Column(Float, nullable=True)
    ram_percent = Column(Float, nullable=True)
    disk_percent = Column(Float, nullable=True)
    app_health = Column(String(30), default="OPERATIONAL")
    db_health = Column(String(30), default="OPERATIONAL")
    search_health = Column(String(30), default="OPERATIONAL")
    rag_health = Column(String(30), default="OPERATIONAL")
    media_health = Column(String(30), default="OPERATIONAL")
    active_errors_json = Column(Text, nullable=True)

    kiosk = relationship("KioskDevice", back_populates="heartbeats")


class KioskConfiguration(Base):
    __tablename__ = "kiosk_configurations"

    id = Column(Integer, primary_key=True, index=True)
    kiosk_id = Column(Integer, ForeignKey("kiosk_devices.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    idle_timeout_seconds = Column(Integer, default=120)
    warning_timeout_seconds = Column(Integer, default=15)
    home_route = Column(String(100), default="/")
    default_language = Column(String(10), default="en")
    available_languages_json = Column(Text, default='["en", "hi", "mr", "ta"]')
    accessibility_high_contrast = Column(Boolean, default=False)
    accessibility_font_scale = Column(String(20), default="normal")
    allowed_collections_json = Column(Text, nullable=True)
    maintenance_message = Column(String(500), default="This exhibition terminal is currently undergoing scheduled maintenance.")
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    kiosk = relationship("KioskDevice", back_populates="configuration")


class KioskAuditLog(Base):
    __tablename__ = "kiosk_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    kiosk_id = Column(Integer, ForeignKey("kiosk_devices.id", ondelete="CASCADE"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    ip_address = Column(String(50), nullable=True)
    details_json = Column(Text, nullable=True)

    kiosk = relationship("KioskDevice", back_populates="audit_logs")


class OfflinePackage(Base):
    __tablename__ = "offline_packages"

    id = Column(Integer, primary_key=True, index=True)
    package_name = Column(String(255), nullable=False)
    package_version = Column(String(50), nullable=False, index=True)
    manifest_sha256 = Column(String(64), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    document_count = Column(Integer, default=0)
    media_count = Column(Integer, default=0)
    status = Column(String(30), default="READY", index=True) # CREATING, READY, SYNCING, DEPRECATED, CORRUPTED
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)



