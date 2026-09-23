"""
API Endpoints for Archival Translation Derivatives.
Enforces Condition 1, 4, 5, 8:
- Machine translations never auto-approved.
- Unbroken provenance tracking.
- Immutability of original archival master.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, Translation
from app.api.v1.endpoints.auth import get_current_user_optional, get_current_user
from app.schemas.translation import (
    TranslationCreateRequest, TranslationReviewRequest,
    TranslationResponse, TranslationSideBySideResponse
)
from app.services.translation.service import TranslationService
from app.services.translation.base import TranslationUnavailableError, UnsupportedLanguagePairError

logger = logging.getLogger("archive.api.translations")
router = APIRouter()

@router.get("", response_model=List[TranslationResponse])
def list_translations(
    document_id: Optional[int] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Lists translations with optional filters for document, language, or status.
    """
    records = TranslationService.list_translations(
        db, document_id=document_id, language=language, status=status, skip=skip, limit=limit
    )
    results = []
    for r in records:
        results.append(TranslationResponse(
            id=r.id,
            document_id=r.document_id,
            document_version_id=r.document_version_id,
            ocr_page_id=r.ocr_page_id,
            ocr_text_version_id=r.ocr_text_version_id,
            source_language=r.source_language,
            target_language=r.target_language,
            translated_title=r.translated_title,
            translated_text=r.translated_text,
            translation_provider=r.translation_provider,
            translation_model=r.translation_model,
            model_version=r.model_version,
            translation_version=r.translation_version,
            status=r.status,
            reviewer_notes=r.reviewer_notes,
            created_by=r.created_by,
            reviewed_by=r.reviewed_by,
            reviewed_at=r.reviewed_at.isoformat() if r.reviewed_at else None,
            created_at=r.created_at.isoformat() if r.created_at else "",
            updated_at=r.updated_at.isoformat() if r.updated_at else ""
        ))
    return results

@router.post("/generate", response_model=TranslationResponse)
def generate_translation(
    payload: TranslationCreateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Generates a new machine translation derivative.
    Status is strictly set to MACHINE_GENERATED and never auto-approved.
    """
    try:
        user_id = current_user.id if current_user else None
        trans = TranslationService.generate_translation(
            db=db,
            document_id=payload.document_id,
            target_language=payload.target_language,
            provider_name=payload.provider,
            page_id=payload.page_id,
            user_id=user_id
        )
        return TranslationResponse(
            id=trans.id,
            document_id=trans.document_id,
            document_version_id=trans.document_version_id,
            ocr_page_id=trans.ocr_page_id,
            ocr_text_version_id=trans.ocr_text_version_id,
            source_language=trans.source_language,
            target_language=trans.target_language,
            translated_title=trans.translated_title,
            translated_text=trans.translated_text,
            translation_provider=trans.translation_provider,
            translation_model=trans.translation_model,
            model_version=trans.model_version,
            translation_version=trans.translation_version,
            status=trans.status,
            reviewer_notes=trans.reviewer_notes,
            created_by=trans.created_by,
            reviewed_by=trans.reviewed_by,
            reviewed_at=trans.reviewed_at.isoformat() if trans.reviewed_at else None,
            created_at=trans.created_at.isoformat() if trans.created_at else "",
            updated_at=trans.updated_at.isoformat() if trans.updated_at else ""
        )
    except TranslationUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except UnsupportedLanguagePairError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/document/{document_id}", response_model=List[TranslationResponse])
def get_document_translations(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieves all translations linked to a specific document.
    """
    records = TranslationService.list_translations(db, document_id=document_id)
    return [
        TranslationResponse(
            id=r.id,
            document_id=r.document_id,
            document_version_id=r.document_version_id,
            ocr_page_id=r.ocr_page_id,
            ocr_text_version_id=r.ocr_text_version_id,
            source_language=r.source_language,
            target_language=r.target_language,
            translated_title=r.translated_title,
            translated_text=r.translated_text,
            translation_provider=r.translation_provider,
            translation_model=r.translation_model,
            model_version=r.model_version,
            translation_version=r.translation_version,
            status=r.status,
            reviewer_notes=r.reviewer_notes,
            created_by=r.created_by,
            reviewed_by=r.reviewed_by,
            reviewed_at=r.reviewed_at.isoformat() if r.reviewed_at else None,
            created_at=r.created_at.isoformat() if r.created_at else "",
            updated_at=r.updated_at.isoformat() if r.updated_at else ""
        )
        for r in records
    ]

@router.get("/{translation_id}", response_model=TranslationResponse)
def get_translation(
    translation_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieves a single translation record.
    """
    r = TranslationService.get_translation(db, translation_id)
    if not r:
        raise HTTPException(status_code=404, detail=f"Translation {translation_id} not found")
    return TranslationResponse(
        id=r.id,
        document_id=r.document_id,
        document_version_id=r.document_version_id,
        ocr_page_id=r.ocr_page_id,
        ocr_text_version_id=r.ocr_text_version_id,
        source_language=r.source_language,
        target_language=r.target_language,
        translated_title=r.translated_title,
        translated_text=r.translated_text,
        translation_provider=r.translation_provider,
        translation_model=r.translation_model,
        model_version=r.model_version,
        translation_version=r.translation_version,
        status=r.status,
        reviewer_notes=r.reviewer_notes,
        created_by=r.created_by,
        reviewed_by=r.reviewed_by,
        reviewed_at=r.reviewed_at.isoformat() if r.reviewed_at else None,
        created_at=r.created_at.isoformat() if r.created_at else "",
        updated_at=r.updated_at.isoformat() if r.updated_at else ""
    )

@router.get("/{translation_id}/side-by-side", response_model=TranslationSideBySideResponse)
def get_side_by_side(
    translation_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns side-by-side view of original archival text vs derivative translation.
    """
    return TranslationService.get_side_by_side(db, translation_id)

@router.post("/{translation_id}/review", response_model=TranslationResponse)
def review_translation(
    translation_id: int,
    payload: TranslationReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scholarly review action: APPROVE, REJECT, or EDIT_AND_APPROVE.
    If edited, creates a new version while preserving the original machine-generated record intact.
    """
    res = TranslationService.review_translation(
        db=db,
        translation_id=translation_id,
        reviewer_id=current_user.id,
        action=payload.action,
        edited_text=payload.edited_text,
        reviewer_notes=payload.reviewer_notes
    )
    return TranslationResponse(
        id=res.id,
        document_id=res.document_id,
        document_version_id=res.document_version_id,
        ocr_page_id=res.ocr_page_id,
        ocr_text_version_id=res.ocr_text_version_id,
        source_language=res.source_language,
        target_language=res.target_language,
        translated_title=res.translated_title,
        translated_text=res.translated_text,
        translation_provider=res.translation_provider,
        translation_model=res.translation_model,
        model_version=res.model_version,
        translation_version=res.translation_version,
        status=res.status,
        reviewer_notes=res.reviewer_notes,
        created_by=res.created_by,
        reviewed_by=res.reviewed_by,
        reviewed_at=res.reviewed_at.isoformat() if res.reviewed_at else None,
        created_at=res.created_at.isoformat() if res.created_at else "",
        updated_at=res.updated_at.isoformat() if res.updated_at else ""
    )
