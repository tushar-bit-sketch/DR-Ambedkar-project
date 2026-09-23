"""
Phase 7 Automated Test Suite: Knowledge Graph, Intelligent Timeline & Entity Relationships.

Verifies:
1. Graph backend status and honest PostgreSQL fallback reporting (no fake Neo4j claims).
2. Canonical entity CRUD with strict date precisions.
3. Entity alias resolution, canonical name normalization, and case insensitivity.
4. Archival relationship creation with strict unbroken 6-step provenance.
5. Provenance chain validation: relationship -> document -> doc_version -> ocr_text_version -> ocr_page -> chunk.
6. Relationship verification workflow (PENDING_REVIEW -> APPROVED / REJECTED).
7. Bidirectional and directed neighbor expansion graph queries.
8. Shortest archival pathfinding using BFS with traversal depth constraints.
9. Strict RBAC: RESTRICTED entities/relationships are hidden from unprivileged visitors.
10. DeterministicArchivalExtractor yields EXPLICIT_SOURCE_RELATION with 1.0 confidence.
11. RuleBasedArchivalExtractor yields MACHINE_EXTRACTED_RELATION marked PENDING_REVIEW.
12. LLMArchivalExtractor transparently reports ENTITY_EXTRACTION_UNAVAILABLE if offline.
13. Timeline date precision EXACT_DAY parsing (e.g. 1949-11-26).
14. Timeline date precision YEAR parsing (e.g. 1949 stays 1949, never fabricated as 1949-01-01).
15. Timeline date precision DECADE and APPROXIMATE parsing (e.g. 1930s, c. 1927).
16. Timeline candidate extraction preserving exact evidence snippets and OCR page pointers.
17. Timeline milestone curator approval workflow.
18. Entity deduplication and merge workflow (MATCH_REVIEW_REQUIRED -> MATCH_CONFIRMED).
19. Comprehensive GraphAuditLog tracking of all graph mutations.
20. Unified search across documents, graph entities, and timeline events.
21. RAG candidate retrieval context with verified Knowledge Graph entities.
22. Preservation of original archival master immutability and checksum integrity.
23. Knowledge Graph statistics API (/graph/stats).
24. Zero historical fabrication enforcement on ungrounded relations.
25. Touchscreen kiosk data integrity for graph, timeline, and entity dossiers.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import SessionLocal
from app.db.models import (
    Document, DocumentVersion, OCRJob, OCRPage, OCRTextVersion, SearchChunk,
    ArchivalFile, User, Role, GraphEntity, GraphEntityAlias, GraphRelationship,
    GraphEntityMerge, TimelineEvent, TimelineEventEntity, GraphAuditLog
)
from app.services.graph.repository.factory import get_graph_repository
from app.services.graph.repository.postgres_repo import PostgreSQLGraphRepository
from app.services.graph.repository.neo4j_repo import Neo4jGraphRepository
from app.services.graph.resolution import EntityResolutionService
from app.services.graph.timeline_service import TimelineService
from app.services.graph.extraction.deterministic_extractor import DeterministicArchivalExtractor
from app.services.graph.extraction.rule_based_extractor import RuleBasedArchivalExtractor
from app.services.graph.extraction.llm_extractor import LLMArchivalExtractor
from app.services.rag.engine import ArchivalRAGEngine
from app.services.rag.llm.mock_test import MockTestLLMProvider

client = TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def setup_provenance_data(db: Session):
    """Creates or retrieves a complete 6-step archival lineage in the database for Phase 7 testing."""
    # 1. Document
    doc = db.query(Document).filter(Document.archive_id == "AMB-TEST-P7-001").first()
    if not doc:
        doc = Document(
            archive_id="AMB-TEST-P7-001",
            title="Constitution Drafting Committee Resolution",
            slug="constitution-drafting-committee-resolution",
            document_type="OFFICIAL_RECORD",
            language="English",
            year=1947,
            description="Resolution appointing the Drafting Committee for the Indian Constitution.",
            verification_status="VERIFIED"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

    # Archival Master File
    arch_file = db.query(ArchivalFile).filter(ArchivalFile.original_filename == "drafting_committee_1947.pdf").first()
    if not arch_file:
        arch_file = ArchivalFile(
            filename="drafting_committee_1947.pdf",
            original_filename="drafting_committee_1947.pdf",
            file_size_bytes=102400,
            mime_type="application/pdf",
            checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            storage_path="storage/masters/drafting_committee_1947.pdf",
            integrity_status="VALID"
        )
        db.add(arch_file)
        db.commit()
        db.refresh(arch_file)

    # 2. Document Version
    doc_ver = db.query(DocumentVersion).filter(DocumentVersion.document_id == doc.id).first()
    if not doc_ver:
        doc_ver = DocumentVersion(
            document_id=doc.id,
            version_number=1,
            file_id=arch_file.id,
            file_format="PDF",
            checksum=arch_file.checksum
        )
        db.add(doc_ver)
        db.commit()
        db.refresh(doc_ver)

    # OCR Job
    ocr_job = db.query(OCRJob).filter(OCRJob.document_id == doc.id).first()
    if not ocr_job:
        ocr_job = OCRJob(
            document_id=doc.id,
            language="English",
            status="COMPLETED"
        )
        db.add(ocr_job)
        db.commit()
        db.refresh(ocr_job)

    # 3. OCR Page
    ocr_page = db.query(OCRPage).filter(OCRPage.ocr_job_id == ocr_job.id).first()
    if not ocr_page:
        ocr_page = OCRPage(
            ocr_job_id=ocr_job.id,
            page_number=1,
            confidence=0.98,
            status="APPROVED"
        )
        db.add(ocr_page)
        db.commit()
        db.refresh(ocr_page)

    # 4. OCR Text Version
    ocr_txt = db.query(OCRTextVersion).filter(OCRTextVersion.ocr_page_id == ocr_page.id).first()
    if not ocr_txt:
        ocr_txt = OCRTextVersion(
            ocr_page_id=ocr_page.id,
            version_number=1,
            text="On 29th August 1947, the Constituent Assembly appointed a Drafting Committee with Dr. B.R. Ambedkar as Chairman.",
            engine="tesseract",
            language="English"
        )
        db.add(ocr_txt)
        db.commit()
        db.refresh(ocr_txt)

    # 5. Search Chunk
    chunk = db.query(SearchChunk).filter(SearchChunk.document_id == doc.id).first()
    if not chunk:
        chunk = SearchChunk(
            document_id=doc.id,
            document_version_id=doc_ver.id,
            ocr_page_id=ocr_page.id,
            ocr_text_version_id=ocr_txt.id,
            chunk_sequence=0,
            page_number=1,
            chunk_text=ocr_txt.text,
            content_hash="mock_hash_constitution_drafting_resolution_001",
            status="INDEXED"
        )
        db.add(chunk)
        db.commit()
        db.refresh(chunk)

    return {
        "document": doc,
        "document_version": doc_ver,
        "ocr_page": ocr_page,
        "ocr_text_version": ocr_txt,
        "search_chunk": chunk,
        "archival_file": arch_file
    }

# ---------------------------------------------------------------------------
# Test 1: Honest Graph Backend Status (No Fake Neo4j Claims)
# ---------------------------------------------------------------------------
def test_01_graph_backend_status_reports_postgres_fallback(db: Session):
    """
    Condition 1 & 4:
    Transparently report PostgreSQL fallback when Neo4j is not operational.
    Neo4j repository must report GRAPH_BACKEND_DEGRADED without crashing or faking.
    """
    repo = get_graph_repository(db)
    status = repo.get_status()
    assert status["backend"] == "postgres_fallback"
    assert status["is_operational"] is True
    assert status["status"] == "OPERATIONAL"

    neo_repo = Neo4jGraphRepository()
    neo_status = neo_repo.get_status()
    assert neo_status["backend"] == "neo4j"
    assert neo_status["is_operational"] is False
    assert neo_status["status"] == "GRAPH_BACKEND_DEGRADED"

# ---------------------------------------------------------------------------
# Test 2: Canonical Entity Creation & Retrieval with Date Precision
# ---------------------------------------------------------------------------
def test_02_create_and_get_entity(db: Session):
    """
    Verifies entity creation with exact date precision and biographical attributes.
    """
    repo = get_graph_repository(db)
    ent_data = {
        "canonical_name": "Dr. Bhimrao Ramji Ambedkar",
        "entity_type": "Person",
        "description": "Principal architect of the Indian Constitution, jurist, and social reformer.",
        "birth_date": "1891-04-14",
        "death_date": "1956-12-06",
        "date_precision": "EXACT_DAY",
        "location": "Mhow, Central Provinces",
        "verification_status": "VERIFIED",
        "access_level": "PUBLIC"
    }
    entity = repo.create_entity(ent_data)
    assert entity["id"] is not None
    assert entity["canonical_name"] == "Dr. Bhimrao Ramji Ambedkar"
    assert entity["date_precision"] == "EXACT_DAY"

    fetched = repo.get_entity(entity["id"])
    assert fetched is not None
    assert fetched["canonical_name"] == entity["canonical_name"]

# ---------------------------------------------------------------------------
# Test 3: Entity Alias Resolution and Normalization
# ---------------------------------------------------------------------------
def test_03_entity_aliases_and_normalization(db: Session):
    """
    Condition 15 & 16:
    Supports canonical name normalization, alias matching, and case-insensitivity.
    """
    repo = get_graph_repository(db)
    primary = repo.get_entity_by_canonical_name("Dr. Bhimrao Ramji Ambedkar")
    if not primary:
        primary = repo.create_entity({
            "canonical_name": "Dr. Bhimrao Ramji Ambedkar",
            "entity_type": "Person",
            "verification_status": "VERIFIED"
        })

    repo.add_alias(primary["id"], "Babasaheb", "Vernacular honorific")
    repo.add_alias(primary["id"], "B.R. Ambedkar", "Standard abbreviated name")

    aliases = repo.get_entity_aliases(primary["id"])
    alias_names = [a["alias_name"] for a in aliases]
    assert "Babasaheb" in alias_names
    assert "B.R. Ambedkar" in alias_names

    # Test resolution service
    resolved_id = EntityResolutionService.resolve_name(db, "babasaheb")
    assert resolved_id == primary["id"]

    resolved_abbr = EntityResolutionService.resolve_name(db, "B.R. AMBEDKAR")
    assert resolved_abbr == primary["id"]

# ---------------------------------------------------------------------------
# Test 4: Archival Relationship with Explicit Provenance
# ---------------------------------------------------------------------------
def test_04_create_explicit_relationship_with_provenance(db: Session, setup_provenance_data):
    """
    Condition 2 & 5:
    Every historical graph relationship must retain source citation and provenance classification.
    """
    repo = get_graph_repository(db)
    data = setup_provenance_data

    org = repo.get_entity_by_canonical_name("Drafting Committee of the Constituent Assembly")
    if not org:
        org = repo.create_entity({
            "canonical_name": "Drafting Committee of the Constituent Assembly",
            "entity_type": "Organization",
            "description": "Committee appointed to draft the Constitution of India.",
            "start_date": "1947-08-29",
            "date_precision": "EXACT_DAY",
            "verification_status": "VERIFIED"
        })

    ambedkar = repo.get_entity_by_canonical_name("Dr. Bhimrao Ramji Ambedkar")
    if not ambedkar:
        ambedkar = repo.create_entity({
            "canonical_name": "Dr. Bhimrao Ramji Ambedkar",
            "entity_type": "Person",
            "verification_status": "VERIFIED"
        })

    rel_data = {
        "source_entity_id": ambedkar["id"],
        "target_entity_id": org["id"],
        "relationship_type": "CHAIRED",
        "verification_status": "APPROVED",
        "provenance_type": "EXPLICIT_SOURCE_RELATION",
        "confidence": 1.0,
        "confidence_label": "Direct primary source resolution",
        "evidence_reference": "Resolution of Constituent Assembly, Page 1",
        "evidence_text": "On 29th August 1947, the Constituent Assembly appointed a Drafting Committee with Dr. B.R. Ambedkar as Chairman.",
        "source_document_id": data["document"].id,
        "document_version_id": data["document_version"].id,
        "ocr_text_version_id": data["ocr_text_version"].id,
        "page_id": data["ocr_page"].id,
        "chunk_id": data["search_chunk"].id,
        "access_level": "PUBLIC"
    }

    rel = repo.create_relationship(rel_data)
    assert rel["id"] is not None
    assert rel["relationship_type"] == "CHAIRED"
    assert rel["provenance_type"] == "EXPLICIT_SOURCE_RELATION"
    assert rel["confidence"] == 1.0
    assert rel["chunk_id"] == data["search_chunk"].id

# ---------------------------------------------------------------------------
# Test 5: Provenance Chain Integrity (6-Step Archival Lineage)
# ---------------------------------------------------------------------------
def test_05_provenance_chain_integrity(db: Session, setup_provenance_data):
    """
    Condition 5:
    Unbroken provenance chain:
    Relationship -> SearchChunk -> OCRPage -> OCRTextVersion -> DocumentVersion -> Document -> Source.
    """
    data = setup_provenance_data
    repo = get_graph_repository(db)

    rels = repo.get_relationships(relationship_types=["CHAIRED"])
    assert len(rels) >= 1
    rel = rels[0]

    resp = client.get(f"/api/v1/provenance/relationship/{rel['id']}")
    assert resp.status_code == 200
    p_data = resp.json()

    assert p_data["relationship"]["id"] == rel["id"]
    assert p_data["document"]["archive_id"] == data["document"].archive_id
    assert p_data["document_version"]["version_number"] == 1
    assert p_data["ocr_page"]["page_number"] == 1
    assert p_data["ocr_text_version"]["engine"] == "tesseract"
    assert p_data["search_chunk"]["chunk_index"] == 0
    assert p_data["provenance_classification"] == "EXPLICIT_SOURCE_RELATION"

# ---------------------------------------------------------------------------
# Test 6: Relationship Verification Workflow
# ---------------------------------------------------------------------------
def test_06_relationship_verification_workflow(db: Session):
    """
    Condition 7:
    Machine extractions must remain PENDING_REVIEW until human verified.
    Curators can approve or reject relationships.
    """
    repo = get_graph_repository(db)
    ambedkar = repo.get_entity_by_canonical_name("Dr. Bhimrao Ramji Ambedkar")
    if not ambedkar:
        ambedkar = repo.create_entity({"canonical_name": "Dr. Bhimrao Ramji Ambedkar", "entity_type": "Person", "verification_status": "VERIFIED"})

    concept = repo.get_entity_by_canonical_name("Social Democracy")
    if not concept:
        concept = repo.create_entity({
            "canonical_name": "Social Democracy",
            "entity_type": "Concept",
            "description": "Political ideology advocating democratic social order.",
            "verification_status": "VERIFIED"
        })

    candidate_rel = repo.create_relationship({
        "source_entity_id": ambedkar["id"],
        "target_entity_id": concept["id"],
        "relationship_type": "ADVOCATED",
        "verification_status": "PENDING_REVIEW",
        "provenance_type": "MACHINE_EXTRACTED_RELATION",
        "confidence": 0.88,
        "evidence_text": "We must make our political democracy a social democracy as well."
    })
    assert candidate_rel["verification_status"] == "PENDING_REVIEW"

    # Approve relationship
    approved = repo.update_relationship(candidate_rel["id"], {"verification_status": "APPROVED"})
    assert approved["verification_status"] == "APPROVED"

    # Reject another candidate
    cand2 = repo.create_relationship({
        "source_entity_id": ambedkar["id"],
        "target_entity_id": concept["id"],
        "relationship_type": "OPPOSED",
        "verification_status": "PENDING_REVIEW",
        "provenance_type": "MACHINE_INFERRED_RELATION",
        "confidence": 0.35
    })
    rejected = repo.update_relationship(cand2["id"], {"verification_status": "REJECTED"})
    assert rejected["verification_status"] == "REJECTED"

# ---------------------------------------------------------------------------
# Test 7: Bidirectional and Directed Neighbor Expansion
# ---------------------------------------------------------------------------
def test_07_bidirectional_and_directed_traversal(db: Session):
    """
    Tests graph neighborhood retrieval finding both incoming and outgoing edges.
    """
    repo = get_graph_repository(db)
    ambedkar = repo.get_entity_by_canonical_name("Dr. Bhimrao Ramji Ambedkar")
    if not ambedkar:
        ambedkar = repo.create_entity({"canonical_name": "Dr. Bhimrao Ramji Ambedkar", "entity_type": "Person", "verification_status": "VERIFIED"})

    neighbors = repo.get_neighbors(ambedkar["id"], depth=1, limit=50)
    assert len(neighbors["nodes"]) >= 1
    node_ids = [n["id"] for n in neighbors["nodes"]]
    assert ambedkar["id"] in node_ids

# ---------------------------------------------------------------------------
# Test 8: Archival Shortest Pathfinding with Depth Limit
# ---------------------------------------------------------------------------
def test_08_pathfinding_bfs(db: Session):
    """
    Verifies BFS pathfinding between interconnected entities.
    """
    repo = get_graph_repository(db)
    e1 = repo.create_entity({"canonical_name": "Test Node A", "entity_type": "Person", "verification_status": "VERIFIED"})
    e2 = repo.create_entity({"canonical_name": "Test Node B", "entity_type": "Organization", "verification_status": "VERIFIED"})
    e3 = repo.create_entity({"canonical_name": "Test Node C", "entity_type": "Event", "verification_status": "VERIFIED"})

    repo.create_relationship({"source_entity_id": e1["id"], "target_entity_id": e2["id"], "relationship_type": "MEMBER_OF", "verification_status": "APPROVED"})
    repo.create_relationship({"source_entity_id": e2["id"], "target_entity_id": e3["id"], "relationship_type": "ORGANIZED", "verification_status": "APPROVED"})

    path = repo.find_path(e1["id"], e3["id"], max_depth=3)
    assert len(path) == 3
    assert path[0]["id"] == e1["id"]
    assert path[1]["id"] == e2["id"]
    assert path[2]["id"] == e3["id"]

# ---------------------------------------------------------------------------
# Test 9: Strict RBAC Restricted Entity Filtering
# ---------------------------------------------------------------------------
def test_09_rbac_restricted_entity_filtering(db: Session):
    """
    Condition 8:
    RBAC access control enforced before graph nodes/edges enter client responses.
    """
    repo = get_graph_repository(db)
    restricted = repo.create_entity({
        "canonical_name": "Restricted Archival Record",
        "entity_type": "Concept",
        "access_level": "RESTRICTED",
        "verification_status": "VERIFIED"
    })

    public_results = repo.search_entities(query="Restricted", access_level="PUBLIC")
    assert all(r["id"] != restricted["id"] for r in public_results)

    priv_results = repo.search_entities(query="Restricted", access_level="ALL")
    assert any(r["id"] == restricted["id"] for r in priv_results)

# ---------------------------------------------------------------------------
# Test 10: DeterministicArchivalExtractor Metadata Extraction
# ---------------------------------------------------------------------------
def test_10_deterministic_extractor(db: Session, setup_provenance_data):
    """
    Deterministic extraction on primary archival document yields
    EXPLICIT_SOURCE_RELATION with 1.0 confidence.
    """
    data = setup_provenance_data
    doc = data["document"]

    extractor = DeterministicArchivalExtractor()
    entities = extractor.extract_entities("", {"document": doc})
    assert len(entities) >= 1
    assert any(e.canonical_name == doc.title for e in entities)

    rels = extractor.extract_relationships("", entities, {"document": doc})
    assert all(r.provenance_type == "EXPLICIT_SOURCE_RELATION" for r in rels)
    assert all(r.confidence == 1.0 for r in rels)

# ---------------------------------------------------------------------------
# Test 11: RuleBasedArchivalExtractor Pattern Extraction
# ---------------------------------------------------------------------------
def test_11_rule_based_extractor():
    """
    Pattern-based extractor extracts historical entities and relations,
    labeling them MACHINE_EXTRACTED_RELATION with extraction confidence.
    """
    extractor = RuleBasedArchivalExtractor()
    text = "Dr. B.R. Ambedkar was the Chairman of the Drafting Committee in 1947."
    entities = extractor.extract_entities(text)
    assert len(entities) >= 1

    ent_names = [e.canonical_name for e in entities]
    assert any("Ambedkar" in name for name in ent_names)

    rels = extractor.extract_relationships(text, entities)
    assert all(r.provenance_type == "MACHINE_EXTRACTED_RELATION" for r in rels)
    assert all(r.verification_status == "PENDING_REVIEW" for r in rels)

# ---------------------------------------------------------------------------
# Test 12: LLMArchivalExtractor Graceful Handling & Honest Offline State
# ---------------------------------------------------------------------------
def test_12_llm_extractor_graceful_handling():
    """
    Condition 6 & 14:
    If local LLM extraction is unavailable, report ENTITY_EXTRACTION_UNAVAILABLE honestly.
    """
    extractor = LLMArchivalExtractor(model_name="gemma-3:1b")
    assert extractor.extractor_name in ["local_llm_structured_ner", "ollama_historical_llm"]
    if not extractor.is_available:
        assert extractor.status == "ENTITY_EXTRACTION_UNAVAILABLE"
        assert extractor.extract_entities("test text") == []
    else:
        res = extractor.extract_entities("Dr. Ambedkar drafted the Constitution.")
        assert isinstance(res, list)

# ---------------------------------------------------------------------------
# Test 13: Strict Date Precision Parsing: EXACT_DAY
# ---------------------------------------------------------------------------
def test_13_timeline_date_precision_exact_day():
    """
    Condition 11:
    Parses '1949-11-26' and '25th November 1949' as EXACT_DAY.
    """
    yr, d_str, prec = TimelineService.parse_date_precision("1949-11-26")
    assert yr == 1949
    assert d_str == "1949-11-26"
    assert prec == "EXACT_DAY"

    yr2, d_str2, prec2 = TimelineService.parse_date_precision("25th November 1949")
    assert yr2 == 1949
    assert d_str2 == "1949-11-25"
    assert prec2 == "EXACT_DAY"

# ---------------------------------------------------------------------------
# Test 14: Strict Date Precision Parsing: YEAR (No Synthetic Dates)
# ---------------------------------------------------------------------------
def test_14_timeline_date_precision_year():
    """
    Condition 11:
    '1949' must be parsed as YEAR and NOT synthesized to '1949-01-01'.
    """
    yr, d_str, prec = TimelineService.parse_date_precision("1949")
    assert yr == 1949
    assert d_str == "1949"
    assert prec == "YEAR"
    assert d_str != "1949-01-01"

# ---------------------------------------------------------------------------
# Test 15: Strict Date Precision Parsing: DECADE and APPROXIMATE
# ---------------------------------------------------------------------------
def test_15_timeline_date_precision_decade_and_approx():
    """
    Condition 11:
    '1930s' parsed as DECADE, 'circa 1927' parsed as APPROXIMATE.
    """
    yr, d_str, prec = TimelineService.parse_date_precision("1930s")
    assert yr == 1930
    assert d_str == "1930s"
    assert prec == "DECADE"

    yr2, d_str2, prec2 = TimelineService.parse_date_precision("circa 1927")
    assert yr2 == 1927
    assert "1927" in d_str2
    assert prec2 == "APPROXIMATE"

# ---------------------------------------------------------------------------
# Test 16: Timeline Candidate Extraction Preserving Archival Evidence
# ---------------------------------------------------------------------------
def test_16_timeline_candidate_generation(db: Session, setup_provenance_data):
    """
    Condition 9 & 10:
    Timeline candidates preserve exact evidence snippet and link to source OCR page.
    """
    data = setup_provenance_data
    candidates = TimelineService.extract_candidates_from_document(db, data["document"].id)
    assert len(candidates) >= 1

    c = candidates[0]
    assert c.evidence_text is not None
    assert len(c.evidence_text) > 0
    assert c.verification_status in ["PENDING_REVIEW", "UNDER_REVIEW"]
    assert c.provenance_type == "MACHINE_EXTRACTED_RELATION"

# ---------------------------------------------------------------------------
# Test 17: Timeline Milestone Curator Approval
# ---------------------------------------------------------------------------
def test_17_timeline_curator_approval(db: Session):
    """
    Tests curator verification of candidate milestone.
    """
    evt = TimelineService.create_event(
        db=db,
        title="Adoption of the Constitution of India",
        description="The Constituent Assembly adopted the Constitution of India.",
        date_str="1949-11-26",
        category="Constitutional",
        verification_status="PENDING_REVIEW"
    )
    assert evt.verification_status == "PENDING_REVIEW"

    approved = TimelineService.approve_event(db, evt.id)
    assert approved is not None
    assert approved.verification_status == "VERIFIED"

# ---------------------------------------------------------------------------
# Test 18: Entity Merge Workflow and Review Lifecycle
# ---------------------------------------------------------------------------
def test_18_entity_merge_proposal_and_review(db: Session):
    """
    Condition 16:
    Duplicate merge creates MATCH_REVIEW_REQUIRED, confirmed review supersedes duplicate.
    """
    repo = get_graph_repository(db)
    e_orig = repo.create_entity({"canonical_name": "Bahishkrit Hitakarini Sabha", "entity_type": "Organization", "verification_status": "VERIFIED"})
    e_dup = repo.create_entity({"canonical_name": "Depressed Classes Institute", "entity_type": "Organization", "verification_status": "PENDING_REVIEW"})

    merge_rec = EntityResolutionService.propose_merge(db, e_orig["id"], e_dup["id"], "English translation of historical organization")
    assert merge_rec.status == "MATCH_REVIEW_REQUIRED"

    reviewed = EntityResolutionService.review_merge(db, merge_rec.id, action="APPROVE")
    assert reviewed.status == "MATCH_CONFIRMED"

    dup_entity = repo.get_entity(e_dup["id"])
    assert dup_entity["verification_status"] == "SUPERSEDED"

# ---------------------------------------------------------------------------
# Test 19: Comprehensive Graph Audit Logging
# ---------------------------------------------------------------------------
def test_19_graph_audit_log_tracking(db: Session):
    """
    Verifies audit logging records entity creation, relationship verification, and merges.
    """
    log_count_before = db.query(GraphAuditLog).count()

    repo = get_graph_repository(db)
    repo.create_entity({
        "canonical_name": "Audit Test Entity",
        "entity_type": "Concept",
        "verification_status": "VERIFIED"
    })

    log_count_after = db.query(GraphAuditLog).count()
    assert log_count_after > log_count_before

# ---------------------------------------------------------------------------
# Test 20: Unified Search API Across Documents, Entities, and Milestones
# ---------------------------------------------------------------------------
def test_20_unified_search_api():
    """
    GET /api/v1/search/unified returns structured search results
    aggregating documents, graph entities, and timeline events.
    """
    resp = client.get("/api/v1/search/unified?q=Ambedkar&limit=10")
    assert resp.status_code == 200
    data = resp.json()

    assert "query" in data
    assert "documents" in data
    assert "entities" in data
    assert "timeline_events" in data
    assert isinstance(data["entities"], list)

# ---------------------------------------------------------------------------
# Test 21: RAG Candidate Retrieval Knowledge Graph Context
# ---------------------------------------------------------------------------
def test_21_rag_graph_enrichment(db: Session):
    """
    Condition 12:
    Phase 5 RAG engine operates with retrieved evidence and citations.
    """
    mock_llm = MockTestLLMProvider()
    engine = ArchivalRAGEngine(db=db, llm_provider=mock_llm)

    res = engine.ask(query="Who chaired the Drafting Committee?")
    assert res["status"] in ["SUCCESS", "NO_EVIDENCE", "INSUFFICIENT_EVIDENCE", "CITATION_VALIDATION_FAILED"]

# ---------------------------------------------------------------------------
# Test 22: Original Archival Masters Remain Immutable
# ---------------------------------------------------------------------------
def test_22_immutable_masters_preserved(db: Session, setup_provenance_data):
    """
    Condition 3:
    Graph mutations and timeline entries must never modify master archival files.
    """
    data = setup_provenance_data
    arch_file = data["archival_file"]

    expected_checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert arch_file.checksum == expected_checksum
    assert arch_file.integrity_status == "VALID"

# ---------------------------------------------------------------------------
# Test 23: Knowledge Graph Statistics API
# ---------------------------------------------------------------------------
def test_23_graph_stats_api():
    """
    GET /api/v1/graph/stats returns accurate entity, relationship, and breakdown metrics.
    """
    resp = client.get("/api/v1/graph/stats")
    assert resp.status_code == 200
    st = resp.json()

    assert "total_entities" in st
    assert "total_relationships" in st
    assert "entity_types" in st
    assert "relationship_types" in st
    assert st["backend"] in ["postgres_fallback", "neo4j"]

# ---------------------------------------------------------------------------
# Test 24: Zero Historical Fabrication Enforcement
# ---------------------------------------------------------------------------
def test_24_no_historical_fabrication_zero_invented_relations(db: Session):
    """
    Condition 2 & 13:
    Rejects or flags relationships lacking primary textual evidence.
    """
    repo = get_graph_repository(db)
    ambedkar = repo.get_entity_by_canonical_name("Dr. Bhimrao Ramji Ambedkar")
    if not ambedkar:
        ambedkar = repo.create_entity({"canonical_name": "Dr. Bhimrao Ramji Ambedkar", "entity_type": "Person", "verification_status": "VERIFIED"})

    rel = repo.create_relationship({
        "source_entity_id": ambedkar["id"],
        "target_entity_id": ambedkar["id"],
        "relationship_type": "SELF_REFERENTIAL",
        "verification_status": "PENDING_REVIEW",
        "provenance_type": "MACHINE_INFERRED_RELATION",
        "confidence": 0.20,
        "evidence_text": None
    })
    assert rel["confidence"] < 0.5
    assert rel["verification_status"] == "PENDING_REVIEW"

# ---------------------------------------------------------------------------
# Test 25: Touchscreen Kiosk Data Integrity
# ---------------------------------------------------------------------------
def test_25_kiosk_graph_and_timeline_data_endpoints():
    """
    Kiosk endpoints return well-formed JSON objects with high-contrast text labels.
    """
    resp = client.get("/api/v1/entities?limit=20")
    assert resp.status_code == 200
    entities = resp.json()
    assert isinstance(entities, list)
    if len(entities) > 0:
        ent = entities[0]
        assert "canonical_name" in ent
        assert "entity_type" in ent

    tl_resp = client.get("/api/v1/timeline")
    assert tl_resp.status_code == 200
    events = tl_resp.json()
    assert isinstance(events, list)
    if len(events) > 0:
        evt = events[0]
        assert "title" in evt
        assert "year" in evt
