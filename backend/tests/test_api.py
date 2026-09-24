import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["phase"] in [
        "PHASE_1_FOUNDATION",
        "PHASE_4_INTELLIGENT_SEARCH",
        "PHASE_5_RESEARCH_RAG",
        "PHASE_10_FINAL_INTEGRATION"
    ]

def test_documents_list():
    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert isinstance(data["is_demo_data"], bool)
    # Ensure items have required archival fields
    item = data["items"][0]
    assert "archive_id" in item
    assert "title" in item
    assert "document_type" in item
    assert "verification_status" in item

def test_document_detail():
    response = client.get("/api/v1/documents/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert "metadata_entries" in data
    assert "versions" in data

def test_collections_list():
    response = client.get("/api/v1/collections")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert "title" in data[0]
    assert "document_count" in data[0]

def test_timeline_list():
    response = client.get("/api/v1/timeline")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["year"] <= data[-1]["year"]
    assert "title" in data[0]

def test_media_list():
    response = client.get("/api/v1/media")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["media_type"] in ["AUDIO", "VIDEO", "PHOTOGRAPH"]

def test_research_assistant_placeholder():
    response = client.post(
        "/api/v1/research/query",
        json={"query": "What did Dr. Ambedkar say on social democracy?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "RETIRED" in data["disclaimer"]
    assert data["is_live_rag"] is False
    assert len(data["sources"]) >= 1
    assert "document_title" in data["sources"][0]
    assert "archive_id" in data["sources"][0]

def test_auth_login_and_me():
    # Login as admin
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ambedkar-archive.gov.in", "password": "AmbedkarArchive2026!"}
    )
    assert login_resp.status_code == 200
    auth_data = login_resp.json()
    assert "access_token" in auth_data
    assert auth_data["role"] == "SUPER_ADMIN"

    # Test /me endpoint with token
    headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "admin@ambedkar-archive.gov.in"
    assert me_data["role"]["name"] == "SUPER_ADMIN"

def test_admin_metrics():
    response = client.get("/api/v1/admin/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["total_documents"] >= 1

def test_admin_audit_logs():
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ambedkar-archive.gov.in", "password": "AmbedkarArchive2026!"}
    )
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}
    response = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert "action" in data[0]

def test_files_stream_missing_returns_404():
    response = client.get("/api/v1/files/stream/nonexistent_master.pdf")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
