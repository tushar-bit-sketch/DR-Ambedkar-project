from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import mimetypes

from app.db.session import get_db
from app.db.models import ArchivalFile, DocumentVersion, Document, User
from app.api.v1.endpoints.auth import get_current_user_optional
from app.services.storage import StorageService

router = APIRouter()

def _resolve_file_and_check_access(
    identifier: str,
    current_user: User,
    db: Session
):
    """
    Resolves file by ID, filename, or archive_id, enforcing institutional RBAC.
    Returns (abs_path, mime_type, download_filename).
    """
    archival_file = None
    clean_identifier = os.path.basename(identifier.strip())

    # 1. Try numeric ID
    if clean_identifier.isdigit():
        archival_file = db.query(ArchivalFile).filter(ArchivalFile.id == int(clean_identifier)).first()

    # 2. Try by storage filename or original filename
    if not archival_file:
        archival_file = db.query(ArchivalFile).filter(
            (ArchivalFile.filename == clean_identifier) |
            (ArchivalFile.original_filename == clean_identifier) |
            (ArchivalFile.storage_path.like(f"%{clean_identifier}%"))
        ).first()

    # 3. Try by Document archive_id
    if not archival_file:
        doc = db.query(Document).filter(Document.archive_id == clean_identifier).first()
        if doc and doc.versions:
            archival_file = doc.versions[0].file

    # Check RBAC permissions if archival file record exists
    is_staff = current_user and current_user.role and current_user.role.name in [
        "SUPER_ADMIN", "ARCHIVIST", "REVIEWER", "RESEARCHER"
    ]

    if archival_file:
        version = db.query(DocumentVersion).filter(DocumentVersion.file_id == archival_file.id).first()
        if version and version.document:
            doc = version.document
            if not is_staff and (doc.verification_status != "VERIFIED" or doc.access_level != "PUBLIC"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="File belongs to an unverified or restricted document."
                )

        abs_path = StorageService.get_absolute_path(archival_file.storage_path)
        mime_type = archival_file.mime_type
        download_filename = archival_file.original_filename
    else:
        # Check direct storage upload path by sanitized filename
        abs_path = StorageService.get_absolute_path(clean_identifier)
        mime_type, _ = mimetypes.guess_type(abs_path)
        mime_type = mime_type or "application/octet-stream"
        download_filename = clean_identifier

    if not os.path.exists(abs_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Physical archival file '{clean_identifier}' is not present in storage repository for this deployment."
        )

    return abs_path, mime_type, download_filename


@router.get("/stream/{identifier:path}")
@router.get("/{identifier}/stream")
def stream_archival_file(
    identifier: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Streams primary archival facsimiles (PDF, Audio, Video, Image) with HTTP range support.
    """
    abs_path, mime_type, download_filename = _resolve_file_and_check_access(identifier, current_user, db)
    return FileResponse(
        path=abs_path,
        media_type=mime_type,
        filename=download_filename
    )


@router.get("/download/{identifier:path}")
@router.get("/{identifier}/download")
def download_archival_file(
    identifier: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Downloads primary archival master with octet-stream Content-Disposition header.
    """
    abs_path, _, download_filename = _resolve_file_and_check_access(identifier, current_user, db)
    return FileResponse(
        path=abs_path,
        media_type="application/octet-stream",
        filename=download_filename
    )
