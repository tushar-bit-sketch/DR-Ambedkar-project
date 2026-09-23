from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
import datetime
import os

from app.db.session import get_db
from app.db.models import Document, Collection, Author, Language, ArchivalFile, DocumentVersion, DocumentMetadata, AuditLog, User
from app.schemas.document import (
    DocumentOut, DocumentDetailOut, DocumentListResponse, 
    DocumentCreate, DocumentUpdate, DocumentVerificationRequest
)
from app.schemas.file import IntegrityCheckResult
from app.api.v1.endpoints.auth import get_current_user_optional, require_role
from app.services.storage import StorageService
from app.services.importer import generate_archive_id, slugify

router = APIRouter()

def serialize_document_out(d: Document, db: Session) -> DocumentOut:
    primary_version = db.query(DocumentVersion).filter(DocumentVersion.document_id == d.id).order_by(DocumentVersion.version_number.desc()).first()
    primary_file = primary_version.file if primary_version and primary_version.file else None
    
    return DocumentOut(
        id=d.id,
        archive_id=d.archive_id,
        title=d.title,
        subtitle=d.subtitle,
        slug=d.slug,
        description=d.description,
        document_type=d.document_type,
        collection_id=d.collection_id,
        collection_title=d.collection.title or d.collection.name if d.collection else None,
        author_id=d.author_id,
        author_name=d.author.name if d.author else None,
        creator=d.creator or (d.author.name if d.author else None),
        date=d.date or d.date_created,
        date_created=d.date_created or d.date,
        date_precision=d.date_precision or "EXACT",
        year=d.year,
        date_approximate=d.date_approximate,
        language=d.language or "English",
        language_name=d.language_rel.name if d.language_rel else d.language,
        original_language=d.original_language,
        location=d.location or d.physical_location,
        publisher=d.publisher,
        source_name=d.source_name,
        source_url=d.source_url,
        source_identifier=d.source_identifier,
        source_reference=d.source_reference,
        physical_location=d.physical_location,
        rights=d.rights,
        access_level=d.access_level or "PUBLIC",
        keywords=d.keywords,
        status=d.status or "DRAFT",
        verification_status=d.verification_status or "UNVERIFIED",
        checksum=d.checksum or (primary_file.checksum if primary_file else None),
        is_demo_data=d.is_demo_data,
        is_deleted=d.is_deleted,
        transcription_status=d.transcription_status,
        vector_indexed=d.vector_indexed,
        thumbnail_url=d.thumbnail_url,
        created_at=d.created_at,
        updated_at=d.updated_at,
        primary_file_path=primary_file.storage_path if primary_file else (primary_version.file_path if primary_version else None),
        primary_file_id=primary_file.id if primary_file else None,
        file_mime_type=primary_file.mime_type if primary_file else None,
        integrity_status=primary_file.integrity_status if primary_file else "VALID"
    )

@router.get("", response_model=DocumentListResponse)
def list_documents(
    q: Optional[str] = Query(None, description="Search across title, description, and identifier"),
    collection_id: Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    verification_status: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    access_level: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("date_desc"), # date_desc, date_asc, title_asc, created_desc
    include_deleted: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    # RBAC filtering: Visitors only see not-deleted, VERIFIED, PUBLIC documents
    is_staff = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]
    
    if not is_staff:
        query = query.filter(
            Document.is_deleted == False,
            Document.verification_status == "VERIFIED",
            Document.access_level == "PUBLIC"
        )
    else:
        if not include_deleted:
            query = query.filter(Document.is_deleted == False)

    # Apply filters
    if q:
        pat = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Document.title.ilike(pat),
                Document.subtitle.ilike(pat),
                Document.description.ilike(pat),
                Document.archive_id.ilike(pat),
                Document.creator.ilike(pat),
                Document.source_identifier.ilike(pat),
                Document.keywords.ilike(pat)
            )
        )

    if collection_id:
        query = query.filter(Document.collection_id == collection_id)
    if document_type:
        query = query.filter(Document.document_type == document_type.upper())
    if language:
        query = query.filter(Document.language.ilike(f"%{language}%"))
    if year:
        query = query.filter(Document.year == year)
    if verification_status and is_staff:
        query = query.filter(Document.verification_status == verification_status.upper())
    if status_filter and is_staff:
        query = query.filter(Document.status == status_filter.upper())
    if access_level and is_staff:
        query = query.filter(Document.access_level == access_level.upper())

    # Sorting
    if sort_by == "date_asc":
        query = query.order_by(Document.year.asc().nullslast(), Document.id.asc())
    elif sort_by == "title_asc":
        query = query.order_by(Document.title.asc())
    elif sort_by == "created_desc":
        query = query.order_by(Document.created_at.desc())
    else: # Default date_desc
        query = query.order_by(Document.year.desc().nullslast(), Document.id.desc())

    total = query.count()
    docs = query.offset((page - 1) * page_size).limit(page_size).all()

    items = [serialize_document_out(d, db) for d in docs]

    has_demo_items = any(d.is_demo_data for d in docs)

    return DocumentListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
        is_demo_data=has_demo_items,
        disclaimer="DEMO DATA — NOT VERIFIED ARCHIVAL CONTENT" if has_demo_items else None
    )

@router.get("/{id_or_slug}", response_model=DocumentDetailOut)
def get_document(
    id_or_slug: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    doc = None
    if id_or_slug.isdigit():
        doc = db.query(Document).filter(Document.id == int(id_or_slug)).first()
    if not doc:
        doc = db.query(Document).filter(
            or_(Document.slug == id_or_slug, Document.archive_id == id_or_slug)
        ).first()

    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Archival document record not found or has been soft-deleted.")

    # Access level check for visitors
    is_staff = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER", "RESEARCHER"]
    if not is_staff:
        if doc.verification_status != "VERIFIED" or doc.access_level != "PUBLIC":
            raise HTTPException(status_code=403, detail="Access to unverified or restricted archival records is limited to authorized personnel.")

    base_out = serialize_document_out(doc, db)

    return DocumentDetailOut(
        **base_out.model_dump(),
        language_rel=doc.language_rel,
        author=doc.author,
        topics=doc.topics,
        versions=doc.versions,
        metadata_entries=doc.metadata_entries,
        ocr_text=doc.ocr_text
    )

@router.post("", response_model=DocumentDetailOut, status_code=status.HTTP_201_CREATED)
async def create_document(
    title: str = Form(...),
    subtitle: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    document_type: str = Form("BOOK"),
    collection_id: Optional[int] = Form(None),
    creator: Optional[str] = Form("Dr. B. R. Ambedkar"),
    date: Optional[str] = Form(None),
    date_precision: str = Form("EXACT"),
    year: Optional[int] = Form(None),
    language: str = Form("English"),
    location: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    source_name: str = Form("Dr. Ambedkar Foundation"),
    source_url: Optional[str] = Form(None),
    source_identifier: Optional[str] = Form(None),
    rights: str = Form("Public Domain / Institutional Heritage Access"),
    access_level: str = Form("PUBLIC"),
    keywords: Optional[str] = Form(None),
    is_demo_data: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    # 1. Duplicate detection by source_identifier
    if source_identifier:
        existing = db.query(Document).filter(
            Document.source_identifier == source_identifier.strip(),
            Document.is_deleted == False
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate detected: Record with source identifier '{source_identifier}' already exists as Document #{existing.id} ({existing.title})."
            )

    # 2. File upload processing & SHA-256 duplicate detection
    archival_file = None
    if file:
        StorageService.validate_file(file)
        file_bytes = await file.read()
        
        # Check duplicate file checksum
        temp_sha = StorageService.compute_sha256_and_save(file_bytes, file.filename)
        sanitized_fn, rel_path, sha256_hash, file_size = temp_sha

        existing_file = db.query(ArchivalFile).filter(ArchivalFile.checksum == sha256_hash).first()
        if existing_file:
            archival_file = existing_file
        else:
            archival_file = ArchivalFile(
                filename=sanitized_fn,
                original_filename=file.filename,
                mime_type=file.content_type or "application/octet-stream",
                file_size_bytes=file_size,
                storage_path=rel_path,
                checksum=sha256_hash,
                uploaded_by=current_user.id,
                integrity_status="VALID",
                last_integrity_check=datetime.datetime.utcnow()
            )
            db.add(archival_file)
            db.flush()

    # 3. Create Document
    archive_id = generate_archive_id(document_type, year)
    slug_val = slugify(title) + f"-{archive_id.split('-')[-1].lower()}"

    new_doc = Document(
        archive_id=archive_id,
        title=title.strip(),
        subtitle=subtitle.strip() if subtitle else None,
        slug=slug_val,
        description=description.strip() if description else None,
        document_type=document_type.upper(),
        collection_id=collection_id,
        creator=creator.strip() if creator else "Dr. B. R. Ambedkar",
        date=date.strip() if date else None,
        date_created=date.strip() if date else None,
        date_precision=date_precision,
        year=year,
        language=language,
        location=location.strip() if location else None,
        publisher=publisher.strip() if publisher else None,
        source_name=source_name.strip(),
        source_url=source_url.strip() if source_url else None,
        source_identifier=source_identifier.strip() if source_identifier else None,
        rights=rights.strip(),
        access_level=access_level.upper(),
        keywords=keywords.strip() if keywords else None,
        status="UNDER_REVIEW",
        verification_status="UNVERIFIED",
        checksum=archival_file.checksum if archival_file else None,
        is_demo_data=is_demo_data
    )
    db.add(new_doc)
    db.flush()

    # 4. Create Initial Version
    if archival_file:
        version = DocumentVersion(
            document_id=new_doc.id,
            version_number=1,
            file_id=archival_file.id,
            file_path=archival_file.storage_path,
            file_format=archival_file.original_filename.split(".")[-1].upper(),
            file_size_bytes=archival_file.file_size_bytes,
            checksum=archival_file.checksum,
            change_description="Initial accession file upload",
            created_by=current_user.id
        )
        db.add(version)

    # 5. Dublin Core metadata entries
    dc_terms = [
        ("dc.title", new_doc.title),
        ("dc.creator", new_doc.creator),
        ("dc.date", str(new_doc.date or new_doc.year or "")),
        ("dc.identifier", new_doc.archive_id),
        ("dc.source", new_doc.source_name),
        ("dc.rights", new_doc.rights),
        ("dc.language", new_doc.language)
    ]
    for k, v in dc_terms:
        if v:
            db.add(DocumentMetadata(document_id=new_doc.id, key=k, value=str(v)))

    # 6. Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DOCUMENT_CREATED",
        entity="DOCUMENT",
        entity_id=new_doc.archive_id,
        description=f"Created archival document '{new_doc.title}'. Source: {new_doc.source_name}",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_doc)

    return get_document(str(new_doc.id), current_user=current_user, db=db)

@router.patch("/{doc_id}", response_model=DocumentDetailOut)
def update_document(
    doc_id: int,
    payload: DocumentUpdate,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.is_deleted == False).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(doc, field, val)

    doc.updated_at = datetime.datetime.utcnow()

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DOCUMENT_UPDATED",
        entity="DOCUMENT",
        entity_id=doc.archive_id,
        description=f"Updated metadata for document '{doc.title}'. Fields modified: {', '.join(update_data.keys())}",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()
    db.refresh(doc)

    return get_document(str(doc.id), current_user=current_user, db=db)

@router.delete("/{doc_id}")
def soft_delete_document(
    doc_id: int,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.is_deleted == False).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_deleted = True
    doc.deleted_at = datetime.datetime.utcnow()
    doc.deleted_by = current_user.id

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DOCUMENT_DELETED",
        entity="DOCUMENT",
        entity_id=doc.archive_id,
        description=f"Archival soft-deletion executed for document '{doc.title}'. Underlying master files preserved.",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Document '{doc.title}' has been safely soft-deleted. Underlying files preserved in archival storage.",
        "archive_id": doc.archive_id,
        "is_deleted": True
    }

@router.post("/{doc_id}/restore")
def restore_document(
    doc_id: int,
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_deleted = False
    doc.deleted_at = None
    doc.deleted_by = None

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DOCUMENT_RESTORED",
        entity="DOCUMENT",
        entity_id=doc.archive_id,
        description=f"Restored soft-deleted archival document '{doc.title}'.",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Document '{doc.title}' restored to active archive catalog.",
        "archive_id": doc.archive_id,
        "is_deleted": False
    }

@router.post("/{doc_id}/verify")
def verify_document_workflow(
    doc_id: int,
    payload: DocumentVerificationRequest,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.is_deleted == False).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    new_ver_status = payload.verification_status.upper()
    if new_ver_status not in ["UNVERIFIED", "UNDER_REVIEW", "VERIFIED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid verification status. Must be UNVERIFIED, UNDER_REVIEW, VERIFIED, or REJECTED.")

    old_status = doc.verification_status
    doc.verification_status = new_ver_status
    if new_ver_status == "VERIFIED":
        doc.status = "PUBLISHED"
    elif new_ver_status == "REJECTED":
        doc.status = "DRAFT"

    audit_action = "DOCUMENT_VERIFIED" if new_ver_status == "VERIFIED" else ("DOCUMENT_REJECTED" if new_ver_status == "REJECTED" else "DOCUMENT_UPDATED")

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action=audit_action,
        entity="DOCUMENT",
        entity_id=doc.archive_id,
        description=f"Verification status transitioned from {old_status} to {new_ver_status}. Notes: {payload.reason}",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "document_id": doc.id,
        "archive_id": doc.archive_id,
        "verification_status": doc.verification_status,
        "status": doc.status,
        "message": f"Curatorial review recorded: status is now {doc.verification_status}."
    }

@router.post("/{doc_id}/verify-integrity", response_model=IntegrityCheckResult)
def check_document_file_integrity(
    doc_id: int,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    latest_version = db.query(DocumentVersion).filter(DocumentVersion.document_id == doc.id).order_by(DocumentVersion.version_number.desc()).first()
    if not latest_version or not latest_version.file:
        raise HTTPException(status_code=400, detail="No registered archival file associated with this document record.")

    archival_file = latest_version.file
    is_valid, check_msg = StorageService.verify_integrity(archival_file.storage_path, archival_file.checksum)

    archival_file.integrity_status = "VALID" if is_valid else "INTEGRITY_CHECK_FAILED"
    archival_file.last_integrity_check = datetime.datetime.utcnow()

    # Log verification
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="FILE_INTEGRITY_CHECKED",
        entity="FILE",
        entity_id=str(archival_file.id),
        description=f"SHA-256 integrity checked for file '{archival_file.filename}'. Result: {archival_file.integrity_status}",
        result="SUCCESS" if is_valid else "FAILED"
    )
    db.add(audit)
    db.commit()

    return IntegrityCheckResult(
        file_id=archival_file.id,
        filename=archival_file.filename,
        expected_checksum=archival_file.checksum,
        computed_checksum=archival_file.checksum if is_valid else "MISMATCH",
        integrity_status=archival_file.integrity_status,
        message="SHA-256 checksum matched on-disk binary stream." if is_valid else "INTEGRITY CHECK FAILED: File altered or missing on storage.",
        checked_at=archival_file.last_integrity_check
    )
