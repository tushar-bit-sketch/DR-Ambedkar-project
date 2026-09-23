import pytest
import io
import os
import json
import uuid
import datetime
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db.models import Document, ArchivalFile, OCRJob, OCRPage, OCRBlock, OCRTextVersion, OCRReview, AuditLog
from app.services.ocr.preprocessor import ImagePreprocessor
from app.services.ocr.pdf_extractor import PDFExtractor
from app.services.ocr.worker import OCRWorker

client = TestClient(app)

def get_auth_token(role="SUPER_ADMIN"):
    email_map = {
        "SUPER_ADMIN": ("admin@ambedkar-archive.gov.in", "AmbedkarArchive2026!"),
        "ARCHIVIST": ("archivist@ambedkar-archive.gov.in", "Archivist2026!"),
        "REVIEWER": ("reviewer@ambedkar-archive.gov.in", "Reviewer2026!"),
        "RESEARCHER": ("researcher@ambedkar-archive.gov.in", "Researcher2026!")
    }
    email, pwd = email_map.get(role, ("admin@ambedkar-archive.gov.in", "AmbedkarArchive2026!"))
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert resp.status_code == 200
    return resp.json()["access_token"]

def test_image_preprocessing_and_derivative_isolation(tmp_path):
    """Verifies OpenCV preprocessing creates derivative image while leaving master untouched."""
    # 1. Create a real sample scanned folio image fixture
    test_img_path = str(tmp_path / "test_folio_master.png")
    img = Image.new("RGB", (800, 1000), color=(245, 240, 230))
    draw = ImageDraw.Draw(img)
    draw.text((60, 80), "CONSTITUENT ASSEMBLY OF INDIA", fill=(20, 20, 20))
    draw.text((60, 120), "Debate on the Draft Constitution - November 1949", fill=(40, 40, 40))
    img.save(test_img_path, "PNG", dpi=(300, 300))

    master_size_before = os.path.getsize(test_img_path)

    # 2. Run OpenCV preprocessing
    derivative_path = str(tmp_path / "derivatives" / "test_folio_prep.png")
    preprocessor = ImagePreprocessor({
        "target_dpi": 300,
        "grayscale": True,
        "deskew": True,
        "denoise": True,
        "contrast_clahe": True
    })
    metrics = preprocessor.process_image(test_img_path, derivative_path)

    # 3. Assert derivative was written
    assert os.path.exists(derivative_path)
    assert metrics["processed_width"] > 0
    assert metrics["processed_height"] > 0

    # 4. Assert original master was NOT touched or modified
    assert os.path.getsize(test_img_path) == master_size_before

def test_pdf_inspection_and_direct_text_extraction():
    """Verifies PDF inspection fast-paths machine-readable text without redundant raster OCR."""
    pdf_path = os.path.join("storage", "uploads", "AMB-CAD-1949-042_master.pdf")
    if os.path.exists(pdf_path):
        inspection = PDFExtractor.inspect_pdf(pdf_path)
        assert inspection["total_pages"] >= 1
        page_res = PDFExtractor.extract_text_page(pdf_path, 1)
        assert page_res.page_number == 1
        assert page_res.confidence >= 0.95
        assert len(page_res.blocks) >= 1

def test_ocr_job_lifecycle_and_confidence():
    """
    Tests complete Phase 3 workflow:
    Job creation -> Asynchronous worker -> REVIEW_REQUIRED status ->
    Confidence categorization -> V1 versioning.
    """
    token = get_auth_token("ARCHIVIST")
    headers = {"Authorization": f"Bearer {token}"}

    # Find a document with an archival file
    db = SessionLocal()
    doc = db.query(Document).filter(Document.is_deleted == False).first()
    assert doc is not None
    doc_id = doc.id
    db.close()

    payload = {
        "document_id": doc_id,
        "engine": "PADDLEOCR",
        "language": "English",
        "preprocessing_config": {
            "target_dpi": 300,
            "grayscale": True,
            "deskew": True,
            "denoise": True,
            "contrast_clahe": True,
            "thresholding": False
        }
    }

    resp = client.post("/api/v1/ocr/jobs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    job_data = resp.json()
    job_id = job_data["id"]
    assert job_data["status"] in ["QUEUED", "PROCESSING", "REVIEW_REQUIRED"]
    assert job_data["engine"] == "PADDLEOCR"
    assert job_data["language"] == "English"
    assert "preprocessing_config" in job_data

    # Synchronously execute worker for deterministic test verification
    OCRWorker.execute_job(job_id)

    # Fetch updated job details
    get_resp = client.get(f"/api/v1/ocr/jobs/{job_id}", headers=headers)
    assert get_resp.status_code == 200
    updated_job = get_resp.json()
    # CRITICAL: Must be REVIEW_REQUIRED, never automatically VERIFIED!
    assert updated_job["status"] == "REVIEW_REQUIRED"
    assert updated_job["processed_pages"] >= 1
    assert updated_job["avg_confidence"] is not None

    # Fetch pages
    pages_resp = client.get(f"/api/v1/ocr/jobs/{job_id}/pages", headers=headers)
    assert pages_resp.status_code == 200
    pages = pages_resp.json()
    assert len(pages) >= 1
    page1 = pages[0]
    assert page1["confidence"] > 0.0
    assert page1["confidence_category"] in ["HIGH", "MEDIUM", "LOW"]
    assert page1["status"] == "REVIEW_REQUIRED"

def test_ocr_human_correction_and_versioning():
    """Verifies scholar editing creates Version 2 without overwriting machine Version 1."""
    rev_token = get_auth_token("REVIEWER")
    headers = {"Authorization": f"Bearer {rev_token}"}

    db = SessionLocal()
    page = db.query(OCRPage).filter(OCRPage.status == "REVIEW_REQUIRED").first()
    assert page is not None
    page_id = page.id
    db.close()

    # Get page before correction
    before_resp = client.get(f"/api/v1/ocr/pages/{page_id}", headers=headers)
    assert before_resp.status_code == 200
    page_data = before_resp.json()
    orig_text = page_data["cleaned_text"]
    v1_count = len(page_data["versions"])
    assert v1_count >= 1

    # Apply curatorial correction
    correction_text = orig_text + "\n[Scholarly Curatorial Annotation: Verified against BAWS Volume XI]"
    patch_resp = client.patch(
        f"/api/v1/ocr/pages/{page_id}",
        json={"corrected_text": correction_text, "review_notes": "Fixed typography and lineation."},
        headers=headers
    )
    assert patch_resp.status_code == 200
    patched_data = patch_resp.json()
    assert patched_data["cleaned_text"] == correction_text

    # Assert new version was created
    assert len(patched_data["versions"]) == v1_count + 1
    assert patched_data["versions"][-1]["version_number"] == v1_count + 1
    assert patched_data["versions"][-1]["engine"] == "HUMAN_CORRECTION"
    # Assert Version 1 remains intact
    assert patched_data["versions"][0]["version_number"] == 1
    assert patched_data["versions"][0]["engine"] in ["PADDLEOCR", "TESSERACT", "PDF_DIRECT"]

def test_ocr_page_approval_and_rejection():
    """Verifies reviewer approving / rejecting page transitions."""
    rev_token = get_auth_token("REVIEWER")
    headers = {"Authorization": f"Bearer {rev_token}"}

    db = SessionLocal()
    page = db.query(OCRPage).first()
    assert page is not None
    page_id = page.id
    db.close()

    # 1. Approve
    app_resp = client.post(
        f"/api/v1/ocr/pages/{page_id}/approve",
        json={"review_notes": "Approved after archival verification."},
        headers=headers
    )
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "APPROVED"

    # 2. Reject
    rej_resp = client.post(
        f"/api/v1/ocr/pages/{page_id}/reject",
        json={"review_notes": "Blurred scan - re-scan required."},
        headers=headers
    )
    assert rej_resp.status_code == 200
    assert rej_resp.json()["status"] == "REJECTED"

def test_ocr_page_rerun_with_custom_config():
    """Verifies re-running page with custom engine and language."""
    arch_token = get_auth_token("ARCHIVIST")
    headers = {"Authorization": f"Bearer {arch_token}"}

    db = SessionLocal()
    page = db.query(OCRPage).first()
    assert page is not None
    page_id = page.id
    db.close()

    rerun_payload = {
        "engine": "TESSERACT",
        "language": "English",
        "preprocessing_config": {"target_dpi": 300, "deskew": True, "contrast_clahe": True}
    }

    rerun_resp = client.post(f"/api/v1/ocr/pages/{page_id}/rerun", json=rerun_payload, headers=headers)
    assert rerun_resp.status_code == 200
    data = rerun_resp.json()
    assert data["id"] == page_id
    assert len(data["versions"]) >= 2

def test_ocr_rbac_enforcement():
    """Verifies unauthorized roles cannot create jobs or approve pages."""
    # 1. Visitor cannot create job
    resp1 = client.post("/api/v1/ocr/jobs", json={"document_id": 1})
    assert resp1.status_code in [401, 403]

    # 2. Researcher cannot approve page
    res_token = get_auth_token("RESEARCHER")
    res_headers = {"Authorization": f"Bearer {res_token}"}
    resp2 = client.post("/api/v1/ocr/pages/1/approve", json={"review_notes": "Test"}, headers=res_headers)
    assert resp2.status_code == 403

def test_audit_logs_record_ocr_actions():
    """Verifies immutable audit trail logs OCR events."""
    admin_token = get_auth_token("SUPER_ADMIN")
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.get("/api/v1/admin/audit-logs?entity=OCR", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) >= 1
    actions = [l["action"] for l in logs]
    assert any("OCR" in a for a in actions)
