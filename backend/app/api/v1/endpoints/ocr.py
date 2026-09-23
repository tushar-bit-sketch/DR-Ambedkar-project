import os
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.db.models import (
    Document, ArchivalFile, OCRJob, OCRPage, OCRBlock, OCRReview, OCRTextVersion, User, AuditLog
)
from app.schemas.ocr import (
    OCRJobCreate, OCRJobOut, OCRPageOut, OCRBlockOut, OCRReviewOut, 
    OCRTextVersionOut, OCRCorrectionRequest, OCRReviewStatusRequest, OCRPageRerunRequest
)
from app.api.v1.endpoints.auth import require_role, get_current_user
from app.services.ocr.worker import OCRWorker
from app.services.storage import STORAGE_DIR

STORAGE_BASE_DIR = os.path.abspath(os.path.join(STORAGE_DIR, ".."))

router = APIRouter()

def _log_audit(db: Session, action: str, entity_id: str, details: str, user: Optional[User] = None):
    try:
        log = AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else None,
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

def _enrich_job_out(job: OCRJob) -> OCRJobOut:
    return OCRJobOut(
        id=job.id,
        document_id=job.document_id,
        document_title=job.document.title if job.document else None,
        document_archive_id=job.document.archive_id if job.document else None,
        status=job.status,
        engine=job.engine,
        engine_version=job.engine_version,
        model_name=job.model_name,
        model_config_detail=job.model_config,
        preprocessing_config=job.preprocessing_config,
        language=job.language,
        total_pages=job.total_pages,
        processed_pages=job.processed_pages,
        failed_pages=job.failed_pages,
        avg_confidence=job.avg_confidence,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error=job.error,
        created_at=job.created_at
    )

@router.post("/jobs", response_model=OCRJobOut, status_code=status.HTTP_201_CREATED)
def create_ocr_job(
    body: OCRJobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    """
    Creates and enqueues an asynchronous OCR job for a document.
    Saves exact engine, model configuration, and OpenCV preprocessing profile.
    """
    doc = db.query(Document).filter(Document.id == body.document_id, Document.is_deleted == False).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document record not found or has been deleted.")

    prep_dict = body.preprocessing_config.model_dump() if body.preprocessing_config else {
        "target_dpi": 300,
        "grayscale": True,
        "deskew": True,
        "denoise": True,
        "contrast_clahe": True,
        "thresholding": False,
        "remove_borders": True
    }

    job = OCRJob(
        document_id=doc.id,
        status="QUEUED",
        engine=body.engine or "PADDLEOCR",
        engine_version="2.8.0",
        model_name="PP-OCRv4" if (body.engine or "PADDLEOCR").upper() == "PADDLEOCR" else "tesseract-v5",
        model_config=json.dumps({"rec_algorithm": "CRNN", "det_algorithm": "DB", "use_angle_cls": True}),
        preprocessing_config=json.dumps(prep_dict),
        language=body.language or "English",
        created_by=current_user.id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    _log_audit(
        db, "OCR_JOB_CREATED", job.id, 
        f"OCR job created for document '{doc.title}' ({doc.archive_id}) with engine {job.engine} ({job.language}).",
        current_user
    )

    # Launch background execution
    background_tasks.add_task(OCRWorker.execute_job, job.id)

    return _enrich_job_out(job)

@router.get("/jobs", response_model=List[OCRJobOut])
def list_ocr_jobs(
    status: Optional[str] = Query(None),
    document_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists all OCR jobs with real-time status and confidence metrics."""
    query = db.query(OCRJob)
    if status:
        query = query.filter(OCRJob.status == status.upper())
    if document_id:
        query = query.filter(OCRJob.document_id == document_id)

    jobs = query.order_by(OCRJob.created_at.desc()).limit(limit).all()
    return [_enrich_job_out(j) for j in jobs]

@router.get("/jobs/{id}", response_model=OCRJobOut)
def get_ocr_job(id: int, db: Session = Depends(get_db)):
    """Fetches single OCR job detail."""
    job = db.query(OCRJob).filter(OCRJob.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="OCR Job not found.")
    return _enrich_job_out(job)

@router.post("/jobs/{id}/retry", response_model=OCRJobOut)
def retry_ocr_job(
    id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    """Re-enqueues failed pages of an OCR job."""
    job = db.query(OCRJob).filter(OCRJob.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="OCR Job not found.")

    job.status = "QUEUED"
    job.failed_pages = 0
    job.error = None
    db.commit()

    _log_audit(db, "OCR_JOB_RETRY", job.id, f"OCR Job #{job.id} retry initiated.", current_user)
    background_tasks.add_task(OCRWorker.execute_job, job.id)
    return _enrich_job_out(job)

@router.get("/jobs/{id}/pages", response_model=List[OCRPageOut])
def get_job_pages(id: int, db: Session = Depends(get_db)):
    """Lists all page folios for an OCR job."""
    job = db.query(OCRJob).filter(OCRJob.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="OCR Job not found.")
    return job.pages

@router.get("/pages/{id}", response_model=OCRPageOut)
def get_ocr_page(id: int, db: Session = Depends(get_db)):
    """Fetches a single page with blocks, version history, and reviews."""
    page = db.query(OCRPage).filter(OCRPage.id == id).first()
    if not page:
        raise HTTPException(status_code=404, detail="OCR Page not found.")
    return page

@router.patch("/pages/{id}", response_model=OCRPageOut)
def correct_ocr_page(
    id: int,
    body: OCRCorrectionRequest,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    """
    Saves a scholar/reviewer correction to an OCR page.
    Creates a new immutable OCRTextVersion (Version 2+).
    Never overwrites previous OCR machine version.
    """
    page = db.query(OCRPage).filter(OCRPage.id == id).first()
    if not page:
        raise HTTPException(status_code=404, detail="OCR Page not found.")

    page.cleaned_text = body.corrected_text.strip()
    
    # Calculate next version number
    latest_v = db.query(OCRTextVersion).filter(OCRTextVersion.ocr_page_id == page.id).order_by(OCRTextVersion.version_number.desc()).first()
    next_ver = (latest_v.version_number + 1) if latest_v else 2

    version_record = OCRTextVersion(
        ocr_page_id=page.id,
        version_number=next_ver,
        text=page.cleaned_text,
        engine="HUMAN_CORRECTION",
        language=page.job.language,
        created_by=current_user.id,
        change_summary=body.review_notes or f"Curatorial correction by {current_user.email}",
        created_at=datetime.datetime.utcnow()
    )
    db.add(version_record)

    if body.mark_approved:
        page.status = "APPROVED"
        review = OCRReview(
            ocr_page_id=page.id,
            reviewer_id=current_user.id,
            reviewer_email=current_user.email,
            status="APPROVED",
            corrected_text=page.cleaned_text,
            review_notes=body.review_notes,
            reviewed_at=datetime.datetime.utcnow()
        )
        db.add(review)

    db.commit()
    db.refresh(page)

    _log_audit(
        db, "OCR_PAGE_CORRECTED", page.id,
        f"Page #{page.page_number} corrected (v{next_ver}) by {current_user.email}.",
        current_user
    )
    return page

@router.post("/pages/{id}/approve", response_model=OCRPageOut)
def approve_ocr_page(
    id: int,
    body: OCRReviewStatusRequest,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    """
    Marks an OCR page APPROVED by curatorial review.
    If all pages in the job are approved, updates job status to APPROVED.
    """
    page = db.query(OCRPage).filter(OCRPage.id == id).first()
    if not page:
        raise HTTPException(status_code=404, detail="OCR Page not found.")

    page.status = "APPROVED"
    review = OCRReview(
        ocr_page_id=page.id,
        reviewer_id=current_user.id,
        reviewer_email=current_user.email,
        status="APPROVED",
        corrected_text=page.cleaned_text,
        review_notes=body.review_notes,
        reviewed_at=datetime.datetime.utcnow()
    )
    db.add(review)

    # Check if all pages of the parent job are now approved
    job = page.job
    all_approved = all(p.status == "APPROVED" for p in job.pages)
    if all_approved:
        job.status = "APPROVED"
        # Sync approved transcript to document text layer with clear label
        full_text = "\n\n--- Page Break ---\n\n".join([p.cleaned_text or "" for p in job.pages])
        job.document.ocr_text = f"[Human-reviewed transcription • Curatorial approved]\n\n{full_text}"

    db.commit()
    db.refresh(page)

    _log_audit(
        db, "OCR_PAGE_APPROVED", page.id,
        f"Page #{page.page_number} of job #{page.ocr_job_id} approved by {current_user.email}.",
        current_user
    )
    return page

@router.post("/pages/{id}/reject", response_model=OCRPageOut)
def reject_ocr_page(
    id: int,
    body: OCRReviewStatusRequest,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    """Marks an OCR page REJECTED (poor scan quality, unreadable, or wrong orientation)."""
    page = db.query(OCRPage).filter(OCRPage.id == id).first()
    if not page:
        raise HTTPException(status_code=404, detail="OCR Page not found.")

    page.status = "REJECTED"
    review = OCRReview(
        ocr_page_id=page.id,
        reviewer_id=current_user.id,
        reviewer_email=current_user.email,
        status="REJECTED",
        review_notes=body.review_notes,
        reviewed_at=datetime.datetime.utcnow()
    )
    db.add(review)
    db.commit()
    db.refresh(page)

    _log_audit(db, "OCR_PAGE_REJECTED", page.id, f"Page #{page.page_number} rejected.", current_user)
    return page

@router.post("/pages/{id}/rerun", response_model=OCRPageOut)
def rerun_ocr_page(
    id: int,
    body: OCRPageRerunRequest,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    """
    Re-runs OCR on an individual page allowing archivist to customize
    OCR engine, language, and preprocessing profile.
    """
    page = db.query(OCRPage).filter(OCRPage.id == id).first()
    if not page:
        raise HTTPException(status_code=404, detail="OCR Page not found.")

    OCRWorker.rerun_page(
        page_id=id,
        engine_name=body.engine,
        language=body.language,
        custom_prep_cfg=body.preprocessing_config
    )
    db.expire_all()
    updated_page = db.query(OCRPage).filter(OCRPage.id == id).first()
    _log_audit(db, "OCR_PAGE_RERUN", str(page.ocr_job_id), f"Re-ran OCR on Page #{page.page_number} with engine {body.engine or page.job.engine}", user=current_user)
    return updated_page

@router.get("/pages/{id}/derivative")
def get_page_derivative(id: int, db: Session = Depends(get_db)):
    """Streams the preprocessed derivative image for a page folio."""
    page = db.query(OCRPage).filter(OCRPage.id == id).first()
    if not page or not page.image_derivative_path:
        raise HTTPException(status_code=404, detail="Derivative folio image not found.")

    if os.path.isabs(page.image_derivative_path):
        full_path = page.image_derivative_path
    else:
        full_path = os.path.join(STORAGE_BASE_DIR, page.image_derivative_path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Physical derivative image missing on disk.")

    return FileResponse(full_path, media_type="image/png")

@router.get("/pages/{id}/original-image")
def get_page_original_image(id: int, db: Session = Depends(get_db)):
    """Streams the raw original page image for a page folio."""
    page = db.query(OCRPage).filter(OCRPage.id == id).first()
    if not page or not page.original_page_image_path:
        raise HTTPException(status_code=404, detail="Original folio image not found.")

    if os.path.isabs(page.original_page_image_path):
        full_path = page.original_page_image_path
    else:
        full_path = os.path.join(STORAGE_BASE_DIR, page.original_page_image_path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Physical original folio missing on disk.")

    return FileResponse(full_path, media_type="image/png")
