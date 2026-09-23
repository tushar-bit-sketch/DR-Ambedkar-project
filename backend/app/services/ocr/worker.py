import os
import json
import time
import datetime
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.db.session import SessionLocal
from app.db.models import (
    OCRJob, OCRPage, OCRBlock, OCRTextVersion, Document, ArchivalFile, AuditLog
)
from app.services.ocr.factory import get_ocr_provider
from app.services.ocr.preprocessor import ImagePreprocessor
from app.services.ocr.pdf_extractor import PDFExtractor
from app.services.ocr.cleaner import TextCleaner
from app.services.storage import STORAGE_DIR, StorageService

STORAGE_BASE_DIR = os.path.abspath(os.path.join(STORAGE_DIR, ".."))
DERIVATIVES_DIR = os.path.abspath(os.path.join(STORAGE_BASE_DIR, "derivatives"))

class OCRWorker:
    """
    Asynchronous archival OCR worker.
    Processes documents page-by-page, records numerical OCR model confidence,
    saves derivative preprocessed folios, and produces structured reviewable text.
    Strictly preserves the original master file unchanged.
    """

    @classmethod
    def execute_job(cls, job_id: int):
        """Entry point executed in background task thread."""
        db: Session = SessionLocal()
        try:
            job = db.query(OCRJob).filter(OCRJob.id == job_id).first()
            if not job:
                return

            job.status = "PROCESSING"
            job.started_at = datetime.datetime.utcnow()
            db.commit()

            document = db.query(Document).filter(Document.id == job.document_id).first()
            if not document:
                job.status = "FAILED"
                job.error = "Target document record not found."
                db.commit()
                return

            # Find the master archival file
            master_file: Optional[ArchivalFile] = None
            if document.versions:
                current_ver = sorted(document.versions, key=lambda v: v.version_number, reverse=True)[0]
                if current_ver and current_ver.file:
                    master_file = current_ver.file
                elif current_ver and current_ver.file_path:
                    # Version may have file_path directly or via file
                    master_file = db.query(ArchivalFile).filter(ArchivalFile.id == current_ver.file_id).first()

            if not master_file:
                # Try finding any archival file matching the document's archive_id
                master_file = db.query(ArchivalFile).filter(ArchivalFile.filename.like(f"%{document.archive_id}%")).first()

            master_disk_path = None
            if master_file and master_file.storage_path:
                resolved = StorageService.get_absolute_path(master_file.storage_path)
                if os.path.exists(resolved):
                    master_disk_path = resolved
                elif os.path.exists(master_file.storage_path):
                    master_disk_path = master_file.storage_path

            if not master_file or not master_disk_path:
                job.status = "FAILED"
                job.error = f"Physical archival master file missing on storage disk."
                db.commit()
                cls._log_audit(db, "OCR_JOB_FAILED", job.document_id, f"Job #{job.id} failed: File not found on disk.")
                return

            # Parse preprocessing configuration
            prep_cfg = json.loads(job.preprocessing_config) if job.preprocessing_config else {}
            preprocessor = ImagePreprocessor(prep_cfg)

            # Get OCR provider
            provider = get_ocr_provider(job.engine)
            job.engine_version = provider.version
            job.model_name = provider.model_name
            db.commit()

            file_ext = os.path.splitext(master_file.filename)[1].lower()
            job_derivatives_dir = os.path.join(DERIVATIVES_DIR, f"job_{job.id}")
            os.makedirs(job_derivatives_dir, exist_ok=True)

            page_confidences = []

            # -------------------------------------------------------------
            # PATH A: PDF Document (Inspect text vs scanned images)
            # -------------------------------------------------------------
            if file_ext == ".pdf":
                inspection = PDFExtractor.inspect_pdf(master_disk_path)
                total_pages = max(inspection["total_pages"], 1)
                job.total_pages = total_pages
                db.commit()

                has_selectable = inspection["has_selectable_text"]

                for page_num in range(1, total_pages + 1):
                    try:
                        folio_raw = os.path.join(job_derivatives_dir, f"page_{page_num}_raw.png")
                        folio_prep = os.path.join(job_derivatives_dir, f"page_{page_num}_prep.png")

                        PDFExtractor.render_pdf_page_to_image(
                            master_disk_path, page_num, folio_raw, dpi=prep_cfg.get("target_dpi", 300)
                        )
                        preprocessor.process_image(folio_raw, folio_prep)

                        if has_selectable:
                            # Direct text extraction path (Preserves high digital fidelity)
                            page_result = PDFExtractor.extract_text_page(master_disk_path, page_num)
                        else:
                            # Scanned PDF: Perform visual engine OCR
                            page_result = provider.extract_from_image(folio_prep, language=job.language)

                        page_result.page_number = page_num
                        page_result.image_derivative_path = os.path.relpath(folio_prep, STORAGE_BASE_DIR).replace("\\", "/")
                        page_result.original_page_image_path = os.path.relpath(folio_raw, STORAGE_BASE_DIR).replace("\\", "/")

                        cls._persist_page(db, job, page_result)
                        page_confidences.append(page_result.confidence)
                        job.processed_pages += 1
                        job.avg_confidence = round(sum(page_confidences) / len(page_confidences), 4)
                        db.commit()
                    except Exception as pe:
                        job.failed_pages += 1
                        cls._persist_failed_page(db, job, page_num, str(pe))
                        db.commit()

            # -------------------------------------------------------------
            # PATH B: Image Document (JPEG, PNG, TIFF, WEBP)
            # -------------------------------------------------------------
            elif file_ext in [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"]:
                job.total_pages = 1
                db.commit()

                folio_prep = os.path.join(job_derivatives_dir, "page_1_prep.png")
                preprocessor.process_image(master_disk_path, folio_prep)
                page_result = provider.extract_from_image(folio_prep, language=job.language)
                page_result.page_number = 1
                page_result.image_derivative_path = os.path.relpath(folio_prep, STORAGE_BASE_DIR).replace("\\", "/")
                page_result.original_page_image_path = os.path.relpath(master_disk_path, STORAGE_BASE_DIR).replace("\\", "/")

                cls._persist_page(db, job, page_result)
                job.processed_pages = 1
                job.avg_confidence = page_result.confidence
                db.commit()

            # -------------------------------------------------------------
            # PATH C: Verbatim Text File
            # -------------------------------------------------------------
            elif file_ext == ".txt":
                job.total_pages = 1
                with open(master_disk_path, "r", encoding="utf-8", errors="replace") as f:
                    txt_content = f.read()

                cleaned = TextCleaner.clean(txt_content)
                page_result = provider.extract_from_image.__func__(
                    provider, master_file.storage_path, language=job.language
                ) if False else None # construct directly
                from app.services.ocr.base import OCRPageResult, OCRBlockResult
                page_result = OCRPageResult(
                    page_number=1,
                    raw_text=txt_content,
                    cleaned_text=cleaned,
                    confidence=1.0,
                    confidence_category="HIGH",
                    is_low_confidence=False,
                    width=800,
                    height=1000,
                    dpi=300,
                    processing_time_ms=5,
                    blocks=[OCRBlockResult(text=cleaned[:200], confidence=1.0, block_type="PARAGRAPH")]
                )
                cls._persist_page(db, job, page_result)
                job.processed_pages = 1
                job.avg_confidence = 1.0
                db.commit()

            # Job completion
            job.completed_at = datetime.datetime.utcnow()
            if job.failed_pages > 0 and job.processed_pages == 0:
                job.status = "FAILED"
                job.error = "All document pages failed during OCR processing."
            else:
                # Strictly set to REVIEW_REQUIRED, never automatically VERIFIED!
                job.status = "REVIEW_REQUIRED"

            db.commit()
            cls._log_audit(
                db, "OCR_JOB_COMPLETED", job.document_id,
                f"Job #{job.id} completed ({job.processed_pages}/{job.total_pages} pages processed). Status: REVIEW_REQUIRED."
            )

        except Exception as e:
            db.rollback()
            try:
                job = db.query(OCRJob).filter(OCRJob.id == job_id).first()
                if job:
                    job.status = "FAILED"
                    job.error = str(e)
                    db.commit()
                    cls._log_audit(db, "OCR_JOB_FAILED", job.document_id, f"Job #{job.id} failed: {str(e)}")
            except Exception:
                pass
        finally:
            db.close()

    @classmethod
    def _persist_page(cls, db: Session, job: OCRJob, res: Any):
        """Persists OCRPage, OCRBlocks, and Version 1 OCRTextVersion."""
        page = db.query(OCRPage).filter(
            OCRPage.ocr_job_id == job.id, OCRPage.page_number == res.page_number
        ).first()

        if not page:
            page = OCRPage(
                ocr_job_id=job.id,
                page_number=res.page_number,
                width=res.width,
                height=res.height,
                dpi=res.dpi,
                raw_text=res.raw_text,
                cleaned_text=res.cleaned_text,
                confidence=res.confidence,
                confidence_category=res.confidence_category,
                is_low_confidence=res.is_low_confidence,
                processing_time_ms=res.processing_time_ms,
                status="REVIEW_REQUIRED", # Requires curatorial review
                image_derivative_path=res.image_derivative_path,
                original_page_image_path=res.original_page_image_path
            )
            db.add(page)
            db.flush()
        else:
            page.width = res.width
            page.height = res.height
            page.raw_text = res.raw_text
            page.cleaned_text = res.cleaned_text
            page.confidence = res.confidence
            page.confidence_category = res.confidence_category
            page.is_low_confidence = res.is_low_confidence
            page.status = "REVIEW_REQUIRED"
            page.image_derivative_path = res.image_derivative_path
            db.flush()

        # Add Blocks
        db.query(OCRBlock).filter(OCRBlock.ocr_page_id == page.id).delete()
        for b in res.blocks:
            block = OCRBlock(
                ocr_page_id=page.id,
                text=b.text,
                confidence=b.confidence,
                x=b.x,
                y=b.y,
                width=b.width,
                height=b.height,
                block_type=b.block_type
            )
            db.add(block)

        # Create Version 1 (Machine OCR Output)
        existing_v1 = db.query(OCRTextVersion).filter(
            OCRTextVersion.ocr_page_id == page.id, OCRTextVersion.version_number == 1
        ).first()

        if not existing_v1:
            v1 = OCRTextVersion(
                ocr_page_id=page.id,
                version_number=1,
                text=res.cleaned_text,
                engine=job.engine,
                language=job.language,
                change_summary="Initial machine-generated OCR output",
                created_at=datetime.datetime.utcnow()
            )
            db.add(v1)

    @classmethod
    def _persist_failed_page(cls, db: Session, job: OCRJob, page_number: int, error_msg: str):
        """Records page error for granular retry."""
        page = OCRPage(
            ocr_job_id=job.id,
            page_number=page_number,
            status="FAILED",
            error=error_msg
        )
        db.add(page)

    @classmethod
    def rerun_page(
        cls, 
        page_id: int, 
        engine_name: Optional[str] = None, 
        language: Optional[str] = None,
        custom_prep_cfg: Optional[Dict[str, Any]] = None
    ) -> OCRPage:
        """Re-runs OCR on an individual page."""
        db: Session = SessionLocal()
        try:
            page = db.query(OCRPage).filter(OCRPage.id == page_id).first()
            if not page:
                raise ValueError(f"OCRPage #{page_id} not found.")

            job = page.job
            selected_engine = engine_name or job.engine
            selected_lang = language or job.language
            provider = get_ocr_provider(selected_engine)

            prep_cfg = custom_prep_cfg or (json.loads(job.preprocessing_config) if job.preprocessing_config else {})

            # Use existing derivative or preprocess original
            derivative_full = (
                page.image_derivative_path
                if os.path.isabs(page.image_derivative_path)
                else os.path.join(STORAGE_BASE_DIR, page.image_derivative_path)
            ) if page.image_derivative_path else None

            if not derivative_full or not os.path.exists(derivative_full):
                orig_full = (
                    page.original_page_image_path
                    if os.path.isabs(page.original_page_image_path)
                    else os.path.join(STORAGE_BASE_DIR, page.original_page_image_path)
                ) if page.original_page_image_path else None

                if not orig_full or not os.path.exists(orig_full):
                    # Fallback: re-render or resolve from document master file
                    doc = job.document
                    master_file = None
                    if doc and doc.versions:
                        latest_v = sorted(doc.versions, key=lambda v: v.version_number, reverse=True)[0]
                        master_file = latest_v.file
                    if not master_file and doc:
                        master_file = db.query(ArchivalFile).filter(ArchivalFile.filename.like(f"%{doc.archive_id}%")).first()

                    if master_file:
                        master_disk = StorageService.get_absolute_path(master_file.storage_path)
                        if not os.path.exists(master_disk) and os.path.exists(master_file.storage_path):
                            master_disk = master_file.storage_path

                        if master_disk and os.path.exists(master_disk):
                            job_derivatives_dir = os.path.join(DERIVATIVES_DIR, f"job_{job.id}")
                            os.makedirs(job_derivatives_dir, exist_ok=True)
                            ext = os.path.splitext(master_file.filename)[1].lower()
                            if ext == ".pdf":
                                orig_full = os.path.join(job_derivatives_dir, f"page_{page.page_number}_raw.png")
                                PDFExtractor.render_pdf_page_to_image(
                                    master_disk, page.page_number, orig_full, dpi=prep_cfg.get("target_dpi", 300)
                                )
                                page.original_page_image_path = os.path.relpath(orig_full, STORAGE_BASE_DIR).replace("\\", "/")
                            elif ext in [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"]:
                                orig_full = master_disk
                                page.original_page_image_path = os.path.relpath(orig_full, STORAGE_BASE_DIR).replace("\\", "/")

                if not orig_full or not os.path.exists(orig_full):
                    raise FileNotFoundError("Original page raster missing for rerun.")
                derivative_full = orig_full.replace("_raw.png", "_prep.png")
                preprocessor = ImagePreprocessor(prep_cfg)
                preprocessor.process_image(orig_full, derivative_full)
                page.image_derivative_path = os.path.relpath(derivative_full, STORAGE_BASE_DIR).replace("\\", "/")

            # Re-extract
            res = provider.extract_from_image(derivative_full, language=selected_lang)
            res.page_number = page.page_number
            res.image_derivative_path = page.image_derivative_path
            res.original_page_image_path = page.original_page_image_path

            cls._persist_page(db, job, res)

            # Add incremental version
            latest_v = db.query(OCRTextVersion).filter(OCRTextVersion.ocr_page_id == page.id).order_by(OCRTextVersion.version_number.desc()).first()
            next_v_num = (latest_v.version_number + 1) if latest_v else 2

            new_v = OCRTextVersion(
                ocr_page_id=page.id,
                version_number=next_v_num,
                text=res.cleaned_text,
                engine=selected_engine,
                language=selected_lang,
                change_summary=f"Re-run machine OCR with {selected_engine} ({selected_lang})",
                created_at=datetime.datetime.utcnow()
            )
            db.add(new_v)
            db.commit()

            cls._log_audit(db, "OCR_PAGE_RERUN", job.document_id, f"Page #{page.page_number} re-run with {selected_engine}.")
            db.refresh(page)
            return page
        finally:
            db.close()

    @staticmethod
    def _log_audit(db: Session, action: str, entity_id: Any, details: str):
        try:
            log = AuditLog(
                action=action,
                entity="OCR",
                entity_id=str(entity_id),
                description=details,
                details=details,
                result="SUCCESS",
                created_at=datetime.datetime.utcnow()
            )
            db.add(log)
            db.commit()
        except Exception:
            pass
