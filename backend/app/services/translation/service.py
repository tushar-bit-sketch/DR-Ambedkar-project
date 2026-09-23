"""
Translation Service for Archival Derivatives.
Coordinates translation generation, review workflow, and provenance integrity.
Strictly adheres to:
- Condition 1: Original archival material remains immutable; translations are derivative layers only.
- Condition 4: Unbroken provenance: translation -> source text version -> OCR page -> document version -> document -> archive source.
- Condition 5: Machine translations never automatically become APPROVED.
  Workflow: MACHINE_GENERATED -> UNDER_REVIEW -> HUMAN_REVIEWED/APPROVED.
- Condition 8: Machine translations and human-reviewed translations are distinct versions.
"""

import datetime
import logging
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import (
    Document, DocumentVersion, OCRJob, OCRPage, OCRTextVersion, Translation, User
)
from app.services.translation.factory import get_translation_provider
from app.services.translation.base import TranslationUnavailableError, UnsupportedLanguagePairError

logger = logging.getLogger("archive.translation.service")

class TranslationService:
    @staticmethod
    def get_translation(db: Session, translation_id: int) -> Optional[Translation]:
        return db.query(Translation).filter(Translation.id == translation_id).first()

    @staticmethod
    def list_translations(
        db: Session,
        document_id: Optional[int] = None,
        language: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Translation]:
        query = db.query(Translation)
        if document_id:
            query = query.filter(Translation.document_id == document_id)
        if language:
            query = query.filter(Translation.target_language.ilike(f"%{language}%"))
        if status:
            query = query.filter(Translation.status == status)
        return query.order_by(Translation.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_document_source_text(
        db: Session,
        document_id: int,
        page_id: Optional[int] = None
    ) -> Tuple[str, Optional[int], Optional[int], Optional[int], str]:
        """
        Retrieves source text and provenance IDs for a document or specific page.
        Returns: (source_text, document_version_id, ocr_page_id, ocr_text_version_id, source_language)
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")

        source_language = doc.language or "English"
        doc_version_id = None
        ocr_page_id = None
        ocr_text_version_id = None
        source_text = ""

        if page_id:
            ocr_page = db.query(OCRPage).filter(OCRPage.id == page_id).first()
            if not ocr_page:
                raise HTTPException(status_code=404, detail=f"OCR Page {page_id} not found")
            ocr_page_id = ocr_page.id
            doc_version_id = ocr_page.job.document_version_id if ocr_page.job else None
            
            # Look for human corrected text version first, then latest text version
            text_ver = (
                db.query(OCRTextVersion)
                .filter(OCRTextVersion.ocr_page_id == page_id)
                .order_by(OCRTextVersion.version_number.desc())
                .first()
            )
            if text_ver:
                ocr_text_version_id = text_ver.id
                source_text = text_ver.text
            else:
                source_text = ocr_page.raw_text or ""
        else:
            # Full document translation: look for latest document version or aggregated OCR text
            doc_ver = (
                db.query(DocumentVersion)
                .filter(DocumentVersion.document_id == document_id)
                .order_by(DocumentVersion.version_number.desc())
                .first()
            )
            if doc_ver:
                doc_version_id = doc_ver.id
            
            # Check for OCR pages
            pages = (
                db.query(OCRPage)
                .join(OCRJob, OCRPage.ocr_job_id == OCRJob.id)
                .filter(OCRJob.document_id == document_id)
                .order_by(OCRPage.page_number.asc())
                .all()
            )
            if pages:
                page_texts = []
                for p in pages:
                    tver = (
                        db.query(OCRTextVersion)
                        .filter(OCRTextVersion.ocr_page_id == p.id)
                        .order_by(OCRTextVersion.version_number.desc())
                        .first()
                    )
                    page_texts.append(tver.text if tver else (p.raw_text or ""))
                source_text = "\n\n".join(filter(None, page_texts))
            else:
                # Fallback to document metadata / description if no OCR
                source_text = doc.description or doc.title or ""

        if not source_text.strip():
            raise HTTPException(
                status_code=400,
                detail=f"No source text available for document {document_id} to translate."
            )

        return source_text, doc_version_id, ocr_page_id, ocr_text_version_id, source_language

    @classmethod
    def generate_translation(
        cls,
        db: Session,
        document_id: int,
        target_language: str,
        provider_name: Optional[str] = None,
        page_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Translation:
        """
        Executes translation via selected provider and records a new Translation derivative.
        Preserves complete provenance and marks layer strictly as MACHINE_GENERATED.
        """
        source_text, doc_version_id, ocr_page_id, ocr_text_version_id, source_language = (
            cls.get_document_source_text(db, document_id, page_id)
        )

        provider = get_translation_provider(provider_name)
        if not provider.is_available:
            raise TranslationUnavailableError(
                f"Translation provider '{provider.provider_name}' is unavailable: {provider.status}"
            )

        doc = db.query(Document).filter(Document.id == document_id).first()

        # Run translation
        translated_text, meta = provider.translate(
            text=source_text,
            source_language=source_language,
            target_language=target_language
        )

        # Also translate title if translating full document
        translated_title = None
        if not page_id and doc and doc.title:
            try:
                title_trans, _ = provider.translate(
                    text=doc.title,
                    source_language=source_language,
                    target_language=target_language
                )
                translated_title = title_trans
            except Exception as e:
                logger.warning(f"Failed to translate title: {e}")
                translated_title = doc.title

        # Determine version number for this document & language
        existing_count = (
            db.query(Translation)
            .filter(
                Translation.document_id == document_id,
                Translation.target_language.ilike(target_language),
                Translation.ocr_page_id == ocr_page_id
            )
            .count()
        )
        new_version = existing_count + 1

        translation_record = Translation(
            document_id=document_id,
            document_version_id=doc_version_id,
            ocr_page_id=ocr_page_id,
            ocr_text_version_id=ocr_text_version_id,
            source_language=source_language,
            target_language=target_language,
            translated_title=translated_title,
            translated_text=translated_text,
            translation_provider=meta.get("provider", provider.provider_name),
            translation_model=meta.get("model", provider.model_name),
            model_version=meta.get("model_version", "1.0"),
            translation_version=new_version,
            status="MACHINE_GENERATED", # Condition 5: Never automatically APPROVED
            reviewer_notes="Machine generated translation. Awaiting scholarly human review.",
            created_by=user_id,
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow()
        )

        db.add(translation_record)
        db.commit()
        db.refresh(translation_record)
        logger.info(
            f"Created Translation #{translation_record.id} for Doc #{document_id} "
            f"({source_language} -> {target_language}) [v{new_version}, status: MACHINE_GENERATED]"
        )
        return translation_record

    @classmethod
    def review_translation(
        cls,
        db: Session,
        translation_id: int,
        reviewer_id: int,
        action: str, # "APPROVE", "REJECT", "EDIT_AND_APPROVE"
        edited_text: Optional[str] = None,
        reviewer_notes: Optional[str] = None
    ) -> Translation:
        """
        Human review workflow.
        If edited, creates a new version preserving the original machine-generated record intact.
        """
        existing = db.query(Translation).filter(Translation.id == translation_id).first()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Translation {translation_id} not found")

        action_norm = action.upper().strip()
        now = datetime.datetime.utcnow()

        if action_norm == "EDIT_AND_APPROVE":
            if not edited_text or not edited_text.strip():
                raise HTTPException(status_code=400, detail="Edited text is required for EDIT_AND_APPROVE action")
            
            # Condition 1 & 8: Preserve existing machine translation, create new version as HUMAN_REVIEWED
            new_version = existing.translation_version + 1
            new_trans = Translation(
                document_id=existing.document_id,
                document_version_id=existing.document_version_id,
                ocr_page_id=existing.ocr_page_id,
                ocr_text_version_id=existing.ocr_text_version_id,
                source_language=existing.source_language,
                target_language=existing.target_language,
                translated_title=existing.translated_title,
                translated_text=edited_text.strip(),
                translation_provider="HUMAN_REVIEWER",
                translation_model=f"Scholar Review (based on {existing.translation_provider})",
                model_version="human-edit",
                translation_version=new_version,
                status="HUMAN_REVIEWED",
                reviewer_notes=reviewer_notes or "Edited and verified by scholarly human reviewer.",
                created_by=existing.created_by,
                reviewed_by=reviewer_id,
                reviewed_at=now,
                created_at=now,
                updated_at=now
            )
            db.add(new_trans)
            db.commit()
            db.refresh(new_trans)
            logger.info(f"Translation #{translation_id} edited into new approved version #{new_trans.id} (v{new_version})")
            return new_trans

        elif action_norm == "APPROVE":
            existing.status = "HUMAN_REVIEWED"
            existing.reviewed_by = reviewer_id
            existing.reviewed_at = now
            if reviewer_notes:
                existing.reviewer_notes = reviewer_notes
            existing.updated_at = now
            db.commit()
            db.refresh(existing)
            logger.info(f"Translation #{translation_id} approved as HUMAN_REVIEWED by user #{reviewer_id}")
            return existing

        elif action_norm == "REJECT":
            existing.status = "REJECTED"
            existing.reviewed_by = reviewer_id
            existing.reviewed_at = now
            if reviewer_notes:
                existing.reviewer_notes = reviewer_notes
            existing.updated_at = now
            db.commit()
            db.refresh(existing)
            logger.info(f"Translation #{translation_id} rejected by user #{reviewer_id}")
            return existing

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid review action: '{action}'. Must be APPROVE, REJECT, or EDIT_AND_APPROVE."
            )

    @classmethod
    def get_side_by_side(cls, db: Session, translation_id: int) -> Dict[str, Any]:
        """
        Returns structured side-by-side payload comparing original archival text
        with the derivative translation, including complete provenance.
        """
        trans = cls.get_translation(db, translation_id)
        if not trans:
            raise HTTPException(status_code=404, detail=f"Translation {translation_id} not found")

        source_text, _, _, _, _ = cls.get_document_source_text(
            db, trans.document_id, trans.ocr_page_id
        )

        doc = db.query(Document).filter(Document.id == trans.document_id).first()

        return {
            "translation_id": trans.id,
            "document_id": trans.document_id,
            "document_title": doc.title if doc else "Unknown",
            "ocr_page_id": trans.ocr_page_id,
            "source_language": trans.source_language,
            "target_language": trans.target_language,
            "original_text": source_text,
            "translated_text": trans.translated_text,
            "translation_version": trans.translation_version,
            "status": trans.status,
            "provider": trans.translation_provider,
            "model": trans.translation_model,
            "reviewer_notes": trans.reviewer_notes,
            "reviewed_by": trans.reviewed_by,
            "reviewed_at": trans.reviewed_at.isoformat() if trans.reviewed_at else None,
            "created_at": trans.created_at.isoformat() if trans.created_at else None,
            "is_machine_generated": trans.status == "MACHINE_GENERATED"
        }
