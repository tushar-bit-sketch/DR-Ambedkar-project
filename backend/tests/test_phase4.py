import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import numpy as np

from app.main import app
from app.db.session import SessionLocal
from app.db.models import Document, SearchChunk, SearchIndexJob, User
from app.core.config import settings
from app.services.search.vector_store.factory import get_vector_store
from app.services.search.vector_store.sqlite_store import SqliteVectorStore
from app.services.search.vector_store.pgvector_store import PgVectorStore
from app.services.search.embeddings.bge_m3 import BGE_M3_EmbeddingProvider
from app.services.search.reranker import BGERerankerProvider
from app.services.search.retrieval_engine import ArchivalRetrievalEngine
from app.services.search.indexer import ArchivalIndexerService
from app.services.search.evaluator import ArchivalSearchEvaluator

client = TestClient(app)

def get_auth_token(role_name: str = "SUPER_ADMIN") -> str:
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ambedkar-archive.gov.in", "password": "AmbedkarArchive2026!"}
    )
    return login_resp.json()["access_token"]

# ----------------------------------------------------------------------
# Conditions 1 & 10: PostgreSQL + pgvector is Primary Production Backend
# Must Fail Fast in Production if pgvector is missing, NOT silently downgrade
# ----------------------------------------------------------------------
def test_condition_1_and_10_pgvector_production_fail_fast():
    db = SessionLocal()
    try:
        orig_backend = settings.VECTOR_BACKEND
        settings.VECTOR_BACKEND = "pgvector"
        
        # When dialect is SQLite and pgvector is requested, must raise RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            get_vector_store(db)
        
            assert "requires PostgreSQL" in str(exc_info.value)
            assert "prohibits silent fallback" in str(exc_info.value)
    finally:
        settings.VECTOR_BACKEND = orig_backend
        db.close()

# ----------------------------------------------------------------------
# Conditions 2 & 9: SQLite Fallback is DEVELOPMENT/TEST ONLY
# ----------------------------------------------------------------------
def test_condition_2_and_9_sqlite_dev_fallback_labeling():
    db = SessionLocal()
    try:
        orig_backend = settings.VECTOR_BACKEND
        settings.VECTOR_BACKEND = "sqlite_dev_fallback"
        store = get_vector_store(db)
        
        assert isinstance(store, SqliteVectorStore)
        assert store.backend_name == "SQLITE_DEV_FALLBACK"
        assert store.is_production_grade is False

        # Verify exact mathematical cosine similarity calculation
        c1 = SearchChunk(
            document_id=1,
            chunk_sequence=998,
            chunk_text="Vector cosine test passage A",
            content_hash="mock_hash_cosine_a",
            status="INDEXED"
        )
        c2 = SearchChunk(
            document_id=1,
            chunk_sequence=999,
            chunk_text="Vector cosine test passage B",
            content_hash="mock_hash_cosine_b",
            status="INDEXED"
        )
        db.add_all([c1, c2])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)

        # Store orthogonal vectors
        store.store_vector(c1.id, [1.0, 0.0, 0.0], 3)
        store.store_vector(c2.id, [0.0, 1.0, 0.0], 3)

        # Query aligned with c1
        sims = store.search_similarity([1.0, 0.0, 0.0], top_k=2, candidate_chunk_ids=[c1.id, c2.id])
        assert len(sims) == 2
        assert sims[0][0] == c1.id
        assert abs(sims[0][1] - 1.0) < 1e-4
        assert sims[1][0] == c2.id
        assert abs(sims[1][1] - 0.0) < 1e-4

        # Cleanup
        db.delete(c1)
        db.delete(c2)
        db.commit()
    finally:
        settings.VECTOR_BACKEND = orig_backend
        db.close()

# ----------------------------------------------------------------------
# Conditions 3 & 4: Do not silently downgrade from BGE-M3.
# Report MODEL_UNAVAILABLE clearly. Never generate fake/random vectors.
# ----------------------------------------------------------------------
def test_condition_3_and_4_bge_m3_model_unavailable_zero_fake_vectors():
    provider = BGE_M3_EmbeddingProvider()
    
    assert provider.model_name == "BAAI/bge-m3"
    assert provider.status in ["READY", "MODEL_UNAVAILABLE"]
    
    if not provider.is_available:
        assert provider.status == "MODEL_UNAVAILABLE"
        # Must refuse to embed text and NEVER produce fake vectors
        with pytest.raises(RuntimeError) as exc_info:
            provider.embed_text("Sample query")
        assert "forbidden" in str(exc_info.value)

# ----------------------------------------------------------------------
# Condition 5: Verify embedding dimension at runtime, not blind 1024
# ----------------------------------------------------------------------
def test_condition_5_runtime_dimension_verification():
    provider = BGE_M3_EmbeddingProvider()
    if not provider.is_available:
        # If model is unavailable, dimension must be None, not assumed
        assert provider.dimension is None
    else:
        assert isinstance(provider.dimension, int)
        assert provider.dimension > 0

# ----------------------------------------------------------------------
# Conditions 6 & 8: Reranker verification, never produce fake scores
# ----------------------------------------------------------------------
def test_condition_6_and_8_reranker_verification_no_fake_scores():
    reranker = BGERerankerProvider()
    assert reranker.model_name == "BAAI/bge-reranker-v2-m3"
    assert reranker.status in ["READY", "MODEL_UNAVAILABLE"]

    candidates = [
        {"chunk_id": 1, "chunk_text": "Passage 1 on caste", "score": 0.8},
        {"chunk_id": 2, "chunk_text": "Passage 2 on constitutionalism", "score": 0.7}
    ]

    reranked = reranker.rerank("caste reform", candidates, top_k=2)
    assert len(reranked) == 2

    if not reranker.is_available:
        assert reranker.status == "MODEL_UNAVAILABLE"
        # Never produce fake scores
        for cand in reranked:
            assert cand.get("reranker_score") is None
            assert cand.get("is_reranked") is False

# ----------------------------------------------------------------------
# Condition 11: Unbroken Archival Provenance
# ----------------------------------------------------------------------
def test_condition_11_unbroken_provenance():
    db = SessionLocal()
    try:
        engine = ArchivalRetrievalEngine(db)
        res = engine.search("Constitution", mode="keyword", page_size=5)
        assert res["total"] >= 1
        item = res["items"][0]

        # Verify unbroken provenance links
        assert "document_id" in item
        assert "archive_id" in item
        assert "document_title" in item
        assert "document_type" in item
        assert "source_name" in item
        assert "citation" in item
        assert "transcription_layer" in item
        assert "is_verified" in item
        assert item["citation"].startswith("Dr. B.R. Ambedkar Digital Heritage Archive")
    finally:
        db.close()

# ----------------------------------------------------------------------
# Condition 12: RBAC Server-Side Access Control Filtering
# ----------------------------------------------------------------------
def test_condition_12_rbac_access_level_server_side():
    db = SessionLocal()
    try:
        # Clean up preexisting test document if present
        existing = db.query(Document).filter(Document.archive_id == "TEST-RESTRICTED-PHASE4-001").first()
        if existing:
            db.delete(existing)
            db.commit()

        # Create a restricted document
        restricted_doc = Document(
            archive_id="TEST-RESTRICTED-PHASE4-001",
            title="Confidential Archival Note on Constitutional Revisions",
            slug="confidential-archival-note-001",
            document_type="MANUSCRIPT",
            verification_status="VERIFIED",
            access_level="RESTRICTED",
            is_deleted=False
        )
        db.add(restricted_doc)
        db.commit()
        db.refresh(restricted_doc)

        engine = ArchivalRetrievalEngine(db)

        # 1. Anonymous visitor search -> must NOT return restricted document
        visitor_res = engine.search("Confidential", mode="keyword", user=None)
        visitor_ids = [it["document_id"] for it in visitor_res["items"]]
        assert restricted_doc.id not in visitor_ids

        # 2. Staff user search -> CAN return restricted document
        admin_user = db.query(User).filter(User.email == "admin@ambedkar-archive.gov.in").first()
        staff_res = engine.search("Confidential", mode="keyword", user=admin_user)
        staff_ids = [it["document_id"] for it in staff_res["items"]]
        assert restricted_doc.id in staff_ids

        # Cleanup
        db.delete(restricted_doc)
        db.commit()
    finally:
        db.close()

# ----------------------------------------------------------------------
# Conditions 13 & 14: Public Search Indexes ONLY Verified Material
# ----------------------------------------------------------------------
def test_condition_13_and_14_unverified_ocr_exclusion_and_labeling():
    db = SessionLocal()
    try:
        # Create an unverified document
        unverified_doc = Document(
            archive_id="TEST-UNVERIFIED-PHASE4-002",
            title="Unreviewed Preliminary Draft of Address",
            slug="unreviewed-draft-address-002",
            document_type="SPEECH",
            verification_status="UNVERIFIED",
            access_level="PUBLIC",
            is_deleted=False
        )
        db.add(unverified_doc)
        db.commit()
        db.refresh(unverified_doc)

        engine = ArchivalRetrievalEngine(db)

        # Anonymous/visitor must NOT see unverified document
        res = engine.search("Unreviewed Preliminary Draft", mode="keyword", user=None)
        matched_ids = [it["document_id"] for it in res["items"]]
        assert unverified_doc.id not in matched_ids

        # Cleanup
        db.delete(unverified_doc)
        db.commit()
    finally:
        db.close()

# ----------------------------------------------------------------------
# Reciprocal Rank Fusion & Snippet Highlighting
# ----------------------------------------------------------------------
def test_rrf_fusion_and_snippet_highlighting():
    db = SessionLocal()
    try:
        engine = ArchivalRetrievalEngine(db)

        # Test snippet highlighter
        text = "Dr. Ambedkar delivered this momentous speech on social democracy and fraternity at the Assembly."
        snip = engine.extract_evidence_snippet(text, "social democracy")
        assert "<mark>social</mark>" in snip["snippet"].lower()
        assert "<mark>democracy</mark>" in snip["snippet"].lower()
        assert "social" in [t.lower() for t in snip["matched_terms"]]

        # Test RRF formula
        kw_cands = [{"chunk_id": 101, "keyword_rank": 1}]
        sem_cands = [{"chunk_id": 101, "semantic_rank": 2}]
        fused = engine.reciprocal_rank_fusion(kw_cands, sem_cands, k=60)
        
        expected_score = (1.0 / (60 + 1)) + (1.0 / (60 + 2))
        assert abs(fused[0]["rrf_score"] - expected_score) < 1e-5
        assert fused[0]["retrieval_type"] == "HYBRID"
    finally:
        db.close()

# ----------------------------------------------------------------------
# API Endpoints End-to-End
# ----------------------------------------------------------------------
def test_search_api_endpoints():
    # 1. Universal Search endpoint
    resp = client.get("/api/v1/search?q=Constitution")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data
    assert "facets" in data
    assert "diagnostics" in data

    # 2. Hybrid search endpoint
    resp_hybrid = client.get("/api/v1/search/hybrid?q=Caste")
    assert resp_hybrid.status_code == 200
    assert resp_hybrid.json()["mode"] == "hybrid"

    # 3. Keyword search endpoint
    resp_kw = client.get("/api/v1/search/keyword?q=Mahad")
    assert resp_kw.status_code == 200
    assert resp_kw.json()["mode"] == "keyword"

    # 4. Search index status endpoint
    resp_status = client.get("/api/v1/search/index/status")
    assert resp_status.status_code == 200
    st_data = resp_status.json()
    assert "vector_backend" in st_data
    assert "is_vector_backend_production" in st_data
    assert "embedding_model_status" in st_data

    # 5. Evaluation Benchmark endpoint
    resp_eval = client.get("/api/v1/search/evaluation")
    assert resp_eval.status_code == 200
    ev_data = resp_eval.json()
    assert "total_benchmark_queries" in ev_data
    assert "metrics_by_mode" in ev_data
    assert "keyword" in ev_data["metrics_by_mode"]
    assert "mrr" in ev_data["metrics_by_mode"]["keyword"]

    # 6. Admin Indexing endpoint (requires authentication)
    token = get_auth_token("SUPER_ADMIN")
    headers = {"Authorization": f"Bearer {token}"}
    resp_idx = client.post("/api/v1/search/index/document/1", headers=headers)
    assert resp_idx.status_code == 200
    job_data = resp_idx.json()
    assert job_data["document_id"] == 1
    assert job_data["status"] in ["COMPLETED", "RUNNING"]
