from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.db.models import Collection, Document, User, AuditLog
from app.schemas.collection import CollectionOut, CollectionCreate, CollectionUpdate
from app.api.v1.endpoints.auth import require_role, get_current_user_optional
from app.services.importer import slugify

router = APIRouter()

def serialize_collection(c: Collection, db: Session) -> CollectionOut:
    count = db.query(Document).filter(
        Document.collection_id == c.id,
        Document.is_deleted == False
    ).count()
    return CollectionOut(
        id=c.id,
        name=c.name or c.title,
        title=c.title or c.name,
        slug=c.slug,
        description=c.description,
        source=c.source,
        language=c.language,
        date_range=c.date_range or c.period,
        period=c.period or c.date_range,
        curator_notes=c.curator_notes,
        cover_image=c.cover_image or c.thumbnail_url,
        thumbnail_url=c.thumbnail_url or c.cover_image,
        status=c.status,
        is_deleted=c.is_deleted,
        created_at=c.created_at,
        document_count=count
    )

@router.get("", response_model=List[CollectionOut])
def list_collections(
    include_archived: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(Collection).filter(Collection.is_deleted == False)
    if not include_archived:
        query = query.filter(Collection.status == "ACTIVE")
    colls = query.order_by(Collection.id.asc()).all()
    return [serialize_collection(c, db) for c in colls]

@router.get("/{id_or_slug}", response_model=CollectionOut)
def get_collection(id_or_slug: str, db: Session = Depends(get_db)):
    coll = None
    if id_or_slug.isdigit():
        coll = db.query(Collection).filter(Collection.id == int(id_or_slug), Collection.is_deleted == False).first()
    if not coll:
        coll = db.query(Collection).filter(Collection.slug == id_or_slug, Collection.is_deleted == False).first()

    if not coll:
        raise HTTPException(status_code=404, detail="Archival collection not found")

    return serialize_collection(coll, db)

@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
def create_collection(
    payload: CollectionCreate,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    slug_val = slugify(payload.name)
    existing = db.query(Collection).filter(Collection.slug == slug_val).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Collection with slug '{slug_val}' already exists.")

    new_coll = Collection(
        name=payload.name.strip(),
        title=payload.name.strip(),
        slug=slug_val,
        description=payload.description,
        source=payload.source,
        language=payload.language,
        date_range=payload.date_range,
        period=payload.date_range,
        curator_notes=payload.curator_notes,
        cover_image=payload.cover_image,
        thumbnail_url=payload.cover_image,
        status=payload.status
    )
    db.add(new_coll)
    db.flush()

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="COLLECTION_CREATED",
        entity="COLLECTION",
        entity_id=str(new_coll.id),
        description=f"Created archival collection '{new_coll.name}'.",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_coll)

    return serialize_collection(new_coll, db)

@router.patch("/{coll_id}", response_model=CollectionOut)
def update_collection(
    coll_id: int,
    payload: CollectionUpdate,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    coll = db.query(Collection).filter(Collection.id == coll_id, Collection.is_deleted == False).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(coll, field, val)
    if "name" in update_data:
        coll.title = update_data["name"]

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="COLLECTION_UPDATED",
        entity="COLLECTION",
        entity_id=str(coll.id),
        description=f"Updated collection '{coll.name}'.",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()
    db.refresh(coll)

    return serialize_collection(coll, db)

@router.delete("/{coll_id}")
def delete_collection(
    coll_id: int,
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    coll = db.query(Collection).filter(Collection.id == coll_id, Collection.is_deleted == False).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    coll.is_deleted = True
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="COLLECTION_DELETED",
        entity="COLLECTION",
        entity_id=str(coll.id),
        description=f"Soft-deleted collection '{coll.name}'.",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Collection '{coll.name}' soft-deleted."}
