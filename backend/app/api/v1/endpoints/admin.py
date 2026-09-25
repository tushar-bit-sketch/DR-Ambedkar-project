from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import os

from app.db.session import get_db
from app.db.models import Document, MediaItem, Language, AuditLog, User, Collection, ArchivalFile, Role
from app.schemas.audit import AdminStatisticsOut, AuditLogOut, RecentUploadItem
from app.schemas.user import UserOut, UserCreate, UserStatusUpdate, UserRoleUpdate
from app.core.security import get_password_hash
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

# ---------------------------------------------------------
# RBAC & Personnel User Management (SUPER_ADMIN Only)
# ---------------------------------------------------------

@router.get("/users", response_model=List[UserOut])
def list_admin_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    List all registered institutional personnel and accounts with RBAC roles.
    """
    users = db.query(User).order_by(User.id.asc()).offset(skip).limit(limit).all()
    return users

@router.post("/users", response_model=UserOut)
def create_admin_user(
    user_in: UserCreate,
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Create a new institutional user with assigned role and credentials.
    """
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    role = db.query(Role).filter(Role.name == user_in.role_name.upper()).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Invalid role: {user_in.role_name}")

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pw,
        is_active=user_in.is_active,
        role_id=role.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_USER",
        entity="USER",
        entity_id=str(new_user.id),
        details=f"Created user {new_user.email} with role {role.name}"
    )
    db.add(audit)
    db.commit()

    return new_user

@router.put("/users/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Toggle institutional user account status (Active / Inactive).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and not status_in.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate the currently authenticated administrator account")

    user.is_active = status_in.is_active
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER_STATUS",
        entity="USER",
        entity_id=str(user.id),
        details=f"Set user {user.email} status to {'ACTIVE' if user.is_active else 'INACTIVE'}"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Update institutional user RBAC role.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(Role).filter(Role.name == role_in.role_name.upper()).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role_in.role_name}")

    old_role_name = user.role.name if user.role else "UNKNOWN"
    user.role_id = role.id

    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER_ROLE",
        entity="USER",
        entity_id=str(user.id),
        details=f"Changed role of user {user.email} from {old_role_name} to {role.name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user
