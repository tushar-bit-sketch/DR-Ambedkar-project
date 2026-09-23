import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.api.v1.endpoints.auth import get_current_user_optional, require_role
from app.schemas.search import (
    SearchResponse,
    SearchIndexStatusResponse,
    SearchIndexJobResponse,
    EvaluationReportResponse
)
from app.services.search.retrieval_engine import ArchivalRetrievalEngine
from app.services.search.indexer import ArchivalIndexerService
from app.services.search.evaluator import ArchivalSearchEvaluator

logger = logging.getLogger("archive.api.search")
router = APIRouter()

def _execute_search(
    q: Optional[str],
    mode: str,
    document_type: Optional[str],
    collection_id: Optional[int],
    language: Optional[str],
    year: Optional[int],
    year_from: Optional[int],
    year_to: Optional[int],
    source_name: Optional[str],
    access_level: Optional[str],
    page: int,
    page_size: int,
    current_user: Optional[User],
    db: Session
) -> SearchResponse:
    filters: Dict[str, Any] = {}
    if document_type:
        filters["document_type"] = document_type
    if collection_id:
        filters["collection_id"] = collection_id
    if language:
        filters["language"] = language
    if year:
        filters["year"] = year
    if year_from:
        filters["year_from"] = year_from
    if year_to:
        filters["year_to"] = year_to
    if source_name:
        filters["source_name"] = source_name
    if access_level:
        filters["access_level"] = access_level

    engine = ArchivalRetrievalEngine(db)
    result = engine.search(
        query=q or "",
        mode=mode,
        filters=filters,
        user=current_user,
        page=page,
        page_size=page_size
    )

    return SearchResponse(**result)

@router.get("", response_model=SearchResponse, summary="Universal Archival Search")
def search_documents(
    q: Optional[str] = Query(None, description="Query string for keyword, semantic or hybrid search"),
    mode: str = Query("hybrid", description="Retrieval mode: 'hybrid' (default), 'keyword', 'semantic'"),
    document_type: Optional[str] = Query(None),
    collection_id: Optional[int] = Query(None),
    language: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    source_name: Optional[str] = Query(None),
    access_level: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Multilingual Archival Search Endpoint combining keyword retrieval, dense semantic vector retrieval,
    Reciprocal Rank Fusion, and cross-encoder reranking.
    """
    clean_mode = (mode or "hybrid").lower().strip()
    if clean_mode not in ["hybrid", "keyword", "semantic"]:
        clean_mode = "hybrid"

    return _execute_search(
        q=q,
        mode=clean_mode,
        document_type=document_type,
        collection_id=collection_id,
        language=language,
        year=year,
        year_from=year_from,
        year_to=year_to,
        source_name=source_name,
        access_level=access_level,
        page=page,
        page_size=page_size,
        current_user=current_user,
        db=db
    )

@router.get("/hybrid", response_model=SearchResponse, summary="Hybrid RRF Archival Search")
def search_hybrid(
    q: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    collection_id: Optional[int] = Query(None),
    language: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return _execute_search(
        q=q, mode="hybrid", document_type=document_type, collection_id=collection_id,
        language=language, year=year, year_from=None, year_to=None, source_name=None,
        access_level=None, page=page, page_size=page_size, current_user=current_user, db=db
    )

@router.get("/keyword", response_model=SearchResponse, summary="Keyword Archival Search")
def search_keyword(
    q: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    collection_id: Optional[int] = Query(None),
    language: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return _execute_search(
        q=q, mode="keyword", document_type=document_type, collection_id=collection_id,
        language=language, year=year, year_from=None, year_to=None, source_name=None,
        access_level=None, page=page, page_size=page_size, current_user=current_user, db=db
    )

@router.get("/semantic", response_model=SearchResponse, summary="Dense Semantic Archival Search")
def search_semantic(
    q: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    collection_id: Optional[int] = Query(None),
    language: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return _execute_search(
        q=q, mode="semantic", document_type=document_type, collection_id=collection_id,
        language=language, year=year, year_from=None, year_to=None, source_name=None,
        access_level=None, page=page, page_size=page_size, current_user=current_user, db=db
    )

@router.get("/index/status", response_model=SearchIndexStatusResponse, summary="Search Index Status & Diagnostics")
def get_search_index_status(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns search index statistics, vector backend status (production vs dev fallback),
    and model operational state.
    """
    indexer = ArchivalIndexerService(db)
    return indexer.get_index_status()

@router.post("/index/document/{document_id}", response_model=SearchIndexJobResponse, summary="Index Specific Document")
def index_document(
    document_id: int,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    indexer = ArchivalIndexerService(db)
    try:
        job = indexer.index_document(document_id)
        return {
            "id": job.id,
            "job_type": job.job_type,
            "document_id": job.document_id,
            "status": job.status,
            "total_chunks": job.total_chunks,
            "indexed_chunks": job.indexed_chunks,
            "failed_chunks": job.failed_chunks,
            "embedding_model": job.embedding_model,
            "embedding_dim": job.embedding_dim,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "error": job.error
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/index/reindex-document/{document_id}", response_model=SearchIndexJobResponse, summary="Reindex Document")
def reindex_document(
    document_id: int,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    indexer = ArchivalIndexerService(db)
    try:
        job = indexer.reindex_document(document_id)
        return {
            "id": job.id,
            "job_type": job.job_type,
            "document_id": job.document_id,
            "status": job.status,
            "total_chunks": job.total_chunks,
            "indexed_chunks": job.indexed_chunks,
            "failed_chunks": job.failed_chunks,
            "embedding_model": job.embedding_model,
            "embedding_dim": job.embedding_dim,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "error": job.error
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/index/rebuild", summary="Rebuild Full Search Index")
def rebuild_search_index(
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    indexer = ArchivalIndexerService(db)
    result = indexer.rebuild_search_index()
    return result

@router.get("/evaluation", response_model=EvaluationReportResponse, summary="Search Quality Evaluation Benchmark")
def get_evaluation_report(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Evaluates search quality (MRR, Precision@K, Latency) across Keyword, Semantic, and Hybrid modes
    using the authentic ground-truth benchmark suite.
    """
    evaluator = ArchivalSearchEvaluator(db)
    report = evaluator.run_evaluation_benchmark()
    return report

@router.get("/unified", summary="Unified Archival Search (Documents, Entities, Timeline & Topics)")
def unified_search(
    q: str = Query(..., min_length=1, description="Query string across all archive indices"),
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Phase 7 Unified Archival Search:
    Returns Documents, Knowledge Graph Entities, Timeline Milestones, and Topics in a single response.
    """
    # 1. Document search via existing retrieval engine
    doc_results = _execute_search(
        q=q,
        mode="hybrid",
        document_type=None,
        collection_id=None,
        language=None,
        year=None,
        year_from=None,
        year_to=None,
        source_name=None,
        access_level=None,
        page=1,
        page_size=limit,
        current_user=current_user,
        db=db
    )

    # 2. Graph Entity search
    from app.services.graph.repository.factory import get_graph_repository
    repo = get_graph_repository(db)
    is_staff = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]
    access_level = "ALL" if is_staff else "PUBLIC"
    entities = repo.search_entities(query=q, access_level=access_level, limit=limit)

    # 3. Timeline event search
    from app.services.graph.timeline_service import TimelineService
    timeline_events = TimelineService.list_events(db=db, verification_status="VERIFIED" if not is_staff else None)
    filtered_events = [
        e for e in timeline_events
        if q.lower() in e.title.lower() or q.lower() in (e.description or "").lower()
    ][:limit]

    # 4. Media Asset and Transcript Segment search
    try:
        from app.services.media.search_service import MediaSearchService
        media_assets = MediaSearchService.search_media(db=db, query=q, access_level=access_level, limit=limit)
        media_transcripts = MediaSearchService.search_media_transcript_segments(db=db, query=q, limit=limit, access_level=access_level)
    except Exception:
        media_assets = []
        media_transcripts = []

    return {
        "query": q,
        "documents": doc_results.items,
        "entities": entities,
        "timeline_events": [
            {
                "id": ev.id,
                "title": ev.title,
                "year": ev.year,
                "exact_date": ev.exact_date,
                "date_precision": ev.date_precision,
                "category": ev.category,
                "description": ev.description
            }
            for ev in filtered_events
        ],
        "media_assets": [
            {
                "id": m.id,
                "archive_id": m.archive_id,
                "title": m.title,
                "media_type": m.media_type,
                "format": m.format,
                "duration": m.duration,
                "date": m.date,
                "access_level": m.access_level
            }
            for m in media_assets
        ],
        "transcript_segments": media_transcripts,
        "total_documents": doc_results.total,
        "total_entities": len(entities),
        "total_timeline_events": len(filtered_events),
        "total_media_assets": len(media_assets),
        "total_transcript_segments": len(media_transcripts)
    }
