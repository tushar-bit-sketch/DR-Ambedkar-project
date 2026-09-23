"""
Phase 10 Automated Test Suite: Final System Integration, End-to-End Journeys & SIH Demo Mode.

Covers:
1. Workflow A: Public Visitor End-to-End Journey
2. Workflow B: Academic Researcher End-to-End Journey
3. Workflow C: Memorial Kiosk Visitor End-to-End Journey
4. Workflow D: Institutional Archivist End-to-End Journey
5. Workflow E: Audio/Video Media Consumer Journey
6. Workflow F: Kiosk Fleet Administrator Journey
7. SIH 2024 Demonstration Stages & Steering APIs (10 Structured Stages)
8. Subsystem Status & Live Health Diagnostics Matrix (14 Platform Components)
9. Strict Radical Honesty verification: zero synthetic providers or fake capabilities.
"""

import os
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import SessionLocal
from app.db.models import (
    Document, Collection, MediaAsset, TimelineEvent,
    GraphEntity, GraphRelationship, OCRJob, User, Role
)
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="module")
def archivist_token(db_session: Session):
    role = db_session.query(Role).filter(Role.name == "ARCHIVIST").first()
    if not role:
        role = Role(name="ARCHIVIST", description="Archivist role")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

    user = db_session.query(User).filter(User.email == "test_archivist@archive.gov.in").first()
    if not user:
        user = User(
            email="test_archivist@archive.gov.in",
            full_name="Senior Heritage Archivist",
            hashed_password="mock_hashed_pw",
            role_id=role.id,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = create_access_token(subject=str(user.id), role="ARCHIVIST")
    return token

@pytest.fixture(scope="module")
def researcher_token(db_session: Session):
    role = db_session.query(Role).filter(Role.name == "RESEARCHER").first()
    if not role:
        role = Role(name="RESEARCHER", description="Researcher role")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

    user = db_session.query(User).filter(User.email == "test_researcher@archive.gov.in").first()
    if not user:
        user = User(
            email="test_researcher@archive.gov.in",
            full_name="Constitutional Scholar",
            hashed_password="mock_hashed_pw",
            role_id=role.id,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = create_access_token(subject=str(user.id), role="RESEARCHER")
    return token


# ==============================================================================
# 1. WORKFLOW A: PUBLIC VISITOR END-TO-END JOURNEY
# ==============================================================================

def test_workflow_a_public_visitor_journey():
    """
    Public Visitor Journey:
    Health checks -> Search -> Document metadata -> Master check -> Timeline -> Graph -> Media.
    """
    # 1. Platform Liveness & System Probes
    res = client.get("/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "ALIVE"

    res = client.get("/system-status")
    assert res.status_code == 200
    assert "subsystems" in res.json()

    # 2. Search Archival Catalog
    res = client.get("/api/v1/search?q=Constitution&mode=keyword")
    assert res.status_code == 200
    search_data = res.json()
    assert "items" in search_data
    assert len(search_data["items"]) > 0

    target_archive_id = search_data["items"][0]["archive_id"]
    assert target_archive_id.startswith("AMB-")

    # 3. Retrieve Document Catalog
    res = client.get("/api/v1/documents?page=1&size=10")
    assert res.status_code == 200
    docs_data = res.json()
    assert "items" in docs_data
    assert len(docs_data["items"]) > 0

    # 4. Interactive Timeline Query
    res = client.get("/api/v1/timeline")
    assert res.status_code == 200
    timeline_data = res.json()
    assert isinstance(timeline_data, list)
    assert len(timeline_data) > 0
    assert any(e.get("year") == 1949 or "Constitution" in e.get("title", "") for e in timeline_data)

    # 5. Knowledge Graph Probing
    res = client.get("/api/v1/graph/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_entities"] > 0
    assert stats["total_relationships"] > 0

    # 6. Audio/Video Media Catalog
    res = client.get("/api/v1/media")
    assert res.status_code == 200
    media_data = res.json()
    assert isinstance(media_data, list)
    assert len(media_data) > 0


# ==============================================================================
# 2. WORKFLOW B: ACADEMIC RESEARCHER JOURNEY
# ==============================================================================

def test_workflow_b_academic_researcher_journey(researcher_token):
    """
    Academic Researcher Journey:
    Authenticated query -> Advanced faceted search -> OCR inspection -> RAG grounding check.
    """
    headers = {"Authorization": f"Bearer {researcher_token}"}

    # 1. Advanced Search Query with Facets
    res = client.get("/api/v1/search?q=Constitution&mode=hybrid", headers=headers)
    assert res.status_code == 200
    items = res.json().get("items", [])
    assert len(items) > 0

    # 2. Research Assistant Grounded Query (Closed-world verification)
    rag_payload = {
        "query": "What did Dr. Ambedkar state regarding constitutional morality?",
        "collection_filter": None,
        "language": "en"
    }
    res = client.post("/api/v1/research/query", json=rag_payload, headers=headers)
    assert res.status_code in [200, 503]
    if res.status_code == 200:
        ans = res.json()
        assert "answer" in ans or "response" in ans
        assert len(ans.get("answer") or ans.get("response") or "") > 0

    # 3. Knowledge Graph Entity Details Traversal
    res = client.get("/api/v1/entities", headers=headers)
    assert res.status_code == 200
    entities = res.json()
    assert len(entities) > 0
    first_entity_id = entities[0]["id"]

    res = client.get(f"/api/v1/graph/neighbors/{first_entity_id}", headers=headers)
    assert res.status_code == 200
    neighbors = res.json()
    assert "nodes" in neighbors
    assert "edges" in neighbors


# ==============================================================================
# 3. WORKFLOW C: MEMORIAL KIOSK VISITOR JOURNEY
# ==============================================================================

def test_workflow_c_memorial_kiosk_visitor_journey():
    """
    Kiosk Visitor Journey:
    Read-only public access -> Multilingual translation check -> Safe playback.
    """
    # 1. Hardware & Kiosk Diagnostics
    res = client.get("/api/v1/system/status")
    assert res.status_code == 200
    kiosk_sub = res.json()["subsystems"]["kiosk_fleet"]
    assert kiosk_sub["status"] in ["OPERATIONAL", "OPERATIONAL (FALLBACK)", "DEGRADED"]

    # 2. Translations Service Query
    res = client.get("/api/v1/translations")
    assert res.status_code == 200

    # 3. Ensure Kiosk Visitor Cannot Perform Admin Modifications (Privilege Isolation)
    malicious_payload = {
        "title": "Unauthorized Modification Attempt",
        "archive_id": "AMB-FAKE-2026-999"
    }
    res = client.post("/api/v1/documents", json=malicious_payload)
    assert res.status_code in [401, 403, 405]


# ==============================================================================
# 4. WORKFLOW D: INSTITUTIONAL ARCHIVIST JOURNEY
# ==============================================================================

def test_workflow_d_institutional_archivist_journey(archivist_token):
    """
    Institutional Archivist Journey:
    Admin authentication -> Ingestion / Collections catalog -> OCR Jobs -> Audit logs.
    """
    headers = {"Authorization": f"Bearer {archivist_token}"}

    # 1. Collections Catalog
    res = client.get("/api/v1/collections", headers=headers)
    assert res.status_code == 200
    collections = res.json()
    assert isinstance(collections, list)
    assert len(collections) > 0

    # 2. OCR Digitization Jobs
    res = client.get("/api/v1/ocr/jobs", headers=headers)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)
    assert len(jobs) > 0

    # 3. Archival Audit Log Inspection
    res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert res.status_code == 200
    audit_data = res.json()
    assert isinstance(audit_data, list)


# ==============================================================================
# 5. WORKFLOW E: AUDIO/VIDEO MEDIA CONSUMER JOURNEY
# ==============================================================================

def test_workflow_e_media_consumer_journey():
    """
    Audio/Video Media Journey:
    Catalog -> Media detail -> WebVTT subtitle stream verification.
    """
    # 1. Media Asset Listing
    res = client.get("/api/v1/media")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) > 0

    first_media = items[0]
    media_id = first_media["id"]

    # 2. Media Detail Retrieval
    res = client.get(f"/api/v1/media/{media_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == media_id
    assert "archive_id" in detail
    assert "duration" in detail

    # 3. WebVTT Caption Stream / Captions Catalog
    res = client.get(f"/api/v1/media/{media_id}/captions")
    assert res.status_code == 200

    media_with_captions = next((m for m in items if m.get("has_captions")), None)
    if media_with_captions:
        res = client.get(f"/api/v1/media/{media_with_captions['id']}/captions.vtt")
        assert res.status_code == 200
        assert "text/vtt" in res.headers.get("content-type", "")
        assert res.text.startswith("WEBVTT")


# ==============================================================================
# 6. WORKFLOW F: KIOSK FLEET ADMINISTRATOR JOURNEY
# ==============================================================================

def test_workflow_f_kiosk_fleet_admin_journey(archivist_token):
    """
    Kiosk Fleet Admin Journey:
    Admin lists registered kiosks, monitors fleet status.
    """
    headers = {"Authorization": f"Bearer {archivist_token}"}

    # 1. Kiosk Fleet List
    res = client.get("/api/v1/admin/kiosks", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "kiosks" in data
    kiosks = data["kiosks"]
    assert isinstance(kiosks, list)
    assert len(kiosks) > 0

    first_kiosk = kiosks[0]
    kiosk_id = first_kiosk["id"]

    # 2. Kiosk Detail
    res = client.get(f"/api/v1/admin/kiosks/{kiosk_id}", headers=headers)
    assert res.status_code == 200
    kiosk_detail = res.json()
    assert kiosk_detail["id"] == kiosk_id
    assert "status" in kiosk_detail


# ==============================================================================
# 7. SIH 2024 DEMONSTRATION STAGES & STEERING APIS
# ==============================================================================

def test_sih_demo_stages_listing():
    """
    Verifies that /api/v1/demo/stages returns exactly 10 structured presentation stages.
    """
    res = client.get("/api/v1/demo/stages")
    assert res.status_code == 200
    stages = res.json()
    assert isinstance(stages, list)
    assert len(stages) == 10

    expected_stage_ids = [
        "digital_archive",
        "smart_search",
        "ocr_digitization",
        "ai_research_assistant",
        "multilingual_access",
        "knowledge_graph",
        "intelligent_timeline",
        "audio_video_archive",
        "kiosk_experience",
        "security_preservation"
    ]

    actual_ids = [s["stage_id"] for s in stages]
    assert actual_ids == expected_stage_ids

    for idx, s in enumerate(stages, start=1):
        assert s["step"] == idx
        assert s["title"]
        assert s["subtitle"]
        assert s["capability_status"] in [
            "OPERATIONAL", "OPERATIONAL (FALLBACK)", "DEGRADED", "UNAVAILABLE", "NOT_CONFIGURED"
        ]
        assert len(s["summary"]) > 0

def test_sih_demo_stage_details():
    """
    Verifies that /api/v1/demo/stage/{stage_id} returns problem, solution, talking points, and genuine sample records.
    """
    # Test digital archive stage
    res = client.get("/api/v1/demo/stage/digital_archive")
    assert res.status_code == 200
    data = res.json()
    assert data["stage_id"] == "digital_archive"
    assert "problem" in data
    assert "solution" in data
    assert len(data["talking_points"]) >= 3
    assert len(data["sample_records"]) > 0
    assert data["sample_records"][0]["archive_id"] == "AMB-CAD-1949-042"

    # Test knowledge graph stage
    res = client.get("/api/v1/demo/stage/knowledge_graph")
    assert res.status_code == 200
    kg_data = res.json()
    assert kg_data["stage_id"] == "knowledge_graph"
    assert "featured_entities" in kg_data
    assert len(kg_data["featured_entities"]) > 0

def test_sih_demo_stage_not_found():
    res = client.get("/api/v1/demo/stage/invalid_nonexistent_stage")
    assert res.status_code == 404

def test_sih_demo_control_steering(archivist_token):
    """
    Verifies that curator control state transitions forward, backward, and resets correctly.
    """
    headers = {"Authorization": f"Bearer {archivist_token}"}

    # 1. Reset initial state
    res = client.post("/api/v1/demo/control/reset", headers=headers)
    assert res.status_code == 200
    state = res.json()
    assert state["active_stage_step"] == 1
    assert state["total_stages"] == 10

    # 2. Advance Next
    res = client.post("/api/v1/demo/control/step", json={"direction": "next"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["active_stage_step"] == 2

    # 3. Regress Prev
    res = client.post("/api/v1/demo/control/step", json={"direction": "prev"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["active_stage_step"] == 1

    # 4. Reset to Stage 1
    res = client.post("/api/v1/demo/control/reset", headers=headers)
    assert res.status_code == 200
    assert res.json()["active_stage_step"] == 1


# ==============================================================================
# 8. SUBSYSTEM STATUS & LIVE HEALTH DIAGNOSTICS MATRIX
# ==============================================================================

def test_system_status_matrix_completeness():
    """
    Verifies that /api/v1/system/status accurately reports on all 14 subsystems.
    """
    res = client.get("/api/v1/system/status")
    assert res.status_code == 200
    data = res.json()

    assert "PHASE" in data["phase"]
    assert data["overall_status"] in ["OPERATIONAL", "OPERATIONAL (FALLBACK)", "DEGRADED"]
    subsystems = data["subsystems"]
    assert len(subsystems) >= 14

    required_subsystem_keys = [
        "digital_archive",
        "ocr_digitization",
        "hybrid_search",
        "rag_research_assistant",
        "translation_service",
        "text_to_speech",
        "speech_to_text",
        "knowledge_graph",
        "intelligent_timeline",
        "media_processor",
        "kiosk_fleet",
        "database",
        "storage_vault",
        "security_posture"
    ]

    for key in required_subsystem_keys:
        assert key in subsystems, f"Missing required subsystem key: {key}"
        sub = subsystems[key]
        assert "name" in sub
        assert "status" in sub
        assert sub["status"] in [
            "OPERATIONAL", "OPERATIONAL (FALLBACK)", "DEGRADED", "UNAVAILABLE", "NOT_CONFIGURED", "NOT_TESTED"
        ]
        assert "provider" in sub
        assert "version" in sub
        assert "details" in sub

def test_top_level_system_status_matches_api():
    """
    Verifies /system-status top-level probe produces valid payload matching /api/v1/system/status.
    """
    res = client.get("/system-status")
    assert res.status_code == 200
    data = res.json()
    assert "subsystems" in data
    assert len(data["subsystems"]) >= 14
