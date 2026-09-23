from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import os

from app.db.session import get_db
from app.db.models import Document, MediaItem, Language, AuditLog, User, Collection, ArchivalFile
from app.schemas.audit import AdminStatisticsOut, AuditLogOut, RecentUploadItem
from app.api.v1.endpoints.auth import require_role

router = APIRouter()

@router.get("/statistics", response_model=AdminStatisticsOut)
def get_admin_statistics(
    db: Session = Depends(get_db)
):
    """
    Computes real database-driven statistics. Zero hardcoded values.
    """
    total_docs = db.query(Document).filter(Document.is_deleted == False).count()
    verified_docs = db.query(Document).filter(Document.is_deleted == False, Document.verification_status == "VERIFIED").count()
    pending_review = db.query(Document).filter(
        Document.is_deleted == False,
        Document.verification_status.in_(["UNVERIFIED", "UNDER_REVIEW"])
    ).count()

    colls_count = db.query(Collection).filter(Collection.is_deleted == False).count()
    media_count = db.query(MediaItem).count()
    langs_count = db.query(Language).count()
    audit_count = db.query(AuditLog).count()

    # Real storage size sum
    storage_sum = db.query(func.sum(ArchivalFile.file_size_bytes)).scalar() or 0
    storage_mb = round(storage_sum / (1024 * 1024), 2)

    recent_docs = db.query(Document).filter(Document.is_deleted == False).order_by(Document.created_at.desc()).limit(8).all()
    recent_uploads = [
        RecentUploadItem(
            id=d.id,
            archive_id=d.archive_id,
            title=d.title,
            document_type=d.document_type,
            source_name=d.source_name,
            verification_status=d.verification_status,
            created_at=d.created_at
        ) for d in recent_docs
    ]

    empty_msg = None
    if total_docs == 0:
        empty_msg = "No archival records have been imported yet."

    return AdminStatisticsOut(
        total_documents=total_docs,
        verified_documents=verified_docs,
        pending_review=pending_review,
        collections_count=colls_count,
        media_items=media_count,
        languages_count=langs_count,
        recent_activity_count=audit_count,
        storage_bytes=storage_sum,
        storage_mb=storage_mb,
        recent_uploads=recent_uploads,
        empty_state_message=empty_msg,
        disclaimer="REAL TIME ARCHIVE STATISTICS"
    )

@router.get("/metrics", response_model=AdminStatisticsOut)
def get_admin_metrics(db: Session = Depends(get_db)):
    return get_admin_statistics(db=db)

@router.get("/audit-logs", response_model=List[AuditLogOut])
def list_audit_logs(
    action: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity:
        query = query.filter(AuditLog.entity == entity.upper())

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs
