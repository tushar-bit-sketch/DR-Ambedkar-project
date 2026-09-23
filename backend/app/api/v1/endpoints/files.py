from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app.db.session import get_db
from app.db.models import ArchivalFile, DocumentVersion, Document, User
from app.api.v1.endpoints.auth import get_current_user_optional
from app.services.storage import StorageService

router = APIRouter()

@router.get("/{file_id}/stream")
def stream_archival_file(
    file_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    archival_file = db.query(ArchivalFile).filter(ArchivalFile.id == file_id).first()
    if not archival_file:
        raise HTTPException(status_code=404, detail="Archival file not found")

    # Check document access permissions
    version = db.query(DocumentVersion).filter(DocumentVersion.file_id == file_id).first()
    if version and version.document:
        doc = version.document
        is_staff = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER", "RESEARCHER"]
        if not is_staff and (doc.verification_status != "VERIFIED" or doc.access_level != "PUBLIC"):
            raise HTTPException(status_code=403, detail="File belongs to an unverified or restricted document.")

    abs_path = StorageService.get_absolute_path(archival_file.storage_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Physical file missing from storage repository.")

    return FileResponse(
        path=abs_path,
        media_type=archival_file.mime_type,
        filename=archival_file.original_filename
    )

@router.get("/{file_id}/download")
def download_archival_file(
    file_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    archival_file = db.query(ArchivalFile).filter(ArchivalFile.id == file_id).first()
    if not archival_file:
        raise HTTPException(status_code=404, detail="Archival file not found")

    # Check document access permissions
    version = db.query(DocumentVersion).filter(DocumentVersion.file_id == file_id).first()
    if version and version.document:
        doc = version.document
        is_staff = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER", "RESEARCHER"]
        if not is_staff and (doc.verification_status != "VERIFIED" or doc.access_level != "PUBLIC"):
            raise HTTPException(status_code=403, detail="Download access restricted.")

    abs_path = StorageService.get_absolute_path(archival_file.storage_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Physical file missing from storage repository.")

    return FileResponse(
        path=abs_path,
        media_type="application/octet-stream",
        filename=archival_file.original_filename
    )
