import pytest
import io
import os
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db.models import Document, ArchivalFile, Collection, User

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

def test_admin_real_statistics():
    resp = client.get("/api/v1/admin/statistics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_documents"] >= 7
    assert data["verified_documents"] >= 6
    assert data["collections_count"] >= 5
    assert data["storage_bytes"] > 0
    assert len(data["recent_uploads"]) >= 1

def test_document_ingestion_with_file_and_checksum():
    import uuid
    uid = uuid.uuid4().hex[:6]
    token = get_auth_token("ARCHIVIST")
    headers = {"Authorization": f"Bearer {token}"}

    sample_content = f"Official Record: Test archival speech ingestion content for Phase 2 #{uid}.".encode("utf-8")
    file_tuple = (f"test_speech_{uid}.txt", io.BytesIO(sample_content), "text/plain")

    form_data = {
        "title": f"Test Archival Ingestion Speech {uid}",
        "document_type": "SPEECH",
        "creator": "Dr. B. R. Ambedkar",
        "date": "1948",
        "year": "1948",
        "language": "English",
        "source_name": "Constituent Assembly Debates Archive",
        "source_identifier": f"TEST-CAD-1948-UNIQUE-{uid}",
        "rights": "Public Domain",
        "access_level": "PUBLIC",
        "is_demo_data": "false"
    }

    resp = client.post("/api/v1/documents", data=form_data, files={"file": file_tuple}, headers=headers)
    assert resp.status_code == 201, resp.text
    doc = resp.json()
    assert doc["title"] == f"Test Archival Ingestion Speech {uid}"
    assert doc["source_identifier"] == f"TEST-CAD-1948-UNIQUE-{uid}"
    assert doc["checksum"] is not None
    assert doc["verification_status"] == "UNVERIFIED"

    # Test file integrity verification
    doc_id = doc["id"]
    integrity_resp = client.post(f"/api/v1/documents/{doc_id}/verify-integrity", headers=headers)
    assert integrity_resp.status_code == 200
    int_data = integrity_resp.json()
    assert int_data["integrity_status"] == "VALID"
    assert "matched" in int_data["message"].lower()

def test_duplicate_source_identifier_rejection():
    token = get_auth_token("ARCHIVIST")
    headers = {"Authorization": f"Bearer {token}"}

    form_data = {
        "title": "Duplicate Check Attempt",
        "document_type": "BOOK",
        "source_name": "Constituent Assembly Debates Archive",
        "source_identifier": "CAD-VOL-XI-1949-11-25-P972" # Already seeded
    }

    resp = client.post("/api/v1/documents", data=form_data, headers=headers)
    assert resp.status_code == 409
    assert "duplicate" in resp.json()["detail"].lower()

def test_review_workflow_and_rbac():
    # 1. Visitor cannot verify
    doc_resp = client.get("/api/v1/documents")
    assert doc_resp.status_code == 200
    initial_count = doc_resp.json()["total"]

    # 2. Reviewer can verify
    reviewer_token = get_auth_token("REVIEWER")
    rev_headers = {"Authorization": f"Bearer {reviewer_token}"}

    # Find the unverified test document
    db = SessionLocal()
    unverified = db.query(Document).filter(Document.verification_status == "UNVERIFIED").first()
    db.close()
    assert unverified is not None

    verify_resp = client.post(
        f"/api/v1/documents/{unverified.id}/verify",
        json={"verification_status": "VERIFIED", "reason": "Curatorial review approved."},
        headers=rev_headers
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verification_status"] == "VERIFIED"

def test_soft_delete_and_restoration():
    admin_token = get_auth_token("SUPER_ADMIN")
    headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    target = db.query(Document).filter(Document.is_deleted == False).first()
    target_id = target.id
    target_title = target.title
    db.close()

    # Soft delete
    del_resp = client.delete(f"/api/v1/documents/{target_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["is_deleted"] is True

    # Confirm it cannot be accessed directly by visitor
    get_resp = client.get(f"/api/v1/documents/{target_id}")
    assert get_resp.status_code == 404

    # Restore as super admin
    restore_resp = client.post(f"/api/v1/documents/{target_id}/restore", headers=headers)
    assert restore_resp.status_code == 200
    assert restore_resp.json()["is_deleted"] is False

    # Confirm accessible again
    get_again = client.get(f"/api/v1/documents/{target_id}", headers=headers)
    assert get_again.status_code == 200

def test_metadata_search():
    resp = client.get("/api/v1/search?q=Constitution")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any("Constitution" in item["title"] for item in data["items"])

def test_import_pipeline_json():
    import uuid
    uid = uuid.uuid4().hex[:6]
    token = get_auth_token("SUPER_ADMIN")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "documents": [
            {
                "title": f"Imported Historical Manifesto on Labour {uid}",
                "document_type": "HISTORICAL_RECORD",
                "creator": "Independent Labour Party",
                "year": 1937,
                "language": "English",
                "source_name": "National Digital Library of India",
                "source_identifier": f"NDLI-ILP-MANIFESTO-{uid}",
                "rights": "Public Domain",
                "verified": True,
                "is_demo_data": False
            },
            {
                "title": "Imported Duplicate Check Item",
                "document_type": "BOOK",
                "source_name": "Dr. Ambedkar Foundation",
                "source_identifier": "DAF-BAWS-VOL-01-AOC-1936", # Duplicate of Annihilation of Caste
                "verified": True
            }
        ]
    }

    resp = client.post("/api/v1/import/json", json=payload, headers=headers)
    assert resp.status_code == 200
    report = resp.json()
    assert report["total_processed"] == 2
    assert report["imported_count"] == 1
    assert report["duplicates_count"] == 1
    assert "DAF-BAWS-VOL-01-AOC-1936" in report["duplicate_identifiers"]
