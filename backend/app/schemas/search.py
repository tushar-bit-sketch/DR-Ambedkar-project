from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SearchResultItem(BaseModel):
    chunk_id: int
    chunk_sequence: int = 1
    page_number: Optional[int] = None
    folio_number: Optional[str] = None
    char_start: int = 0
    char_end: int = 0
    token_count: int = 0
    chunk_text: str
    highlighted_snippet: Optional[str] = None
    matched_terms: List[str] = []
    transcription_layer: str = "MACHINE_UNVERIFIED"
    is_verified: bool = False
    document_id: int
    archive_id: str
    title: str
    document_title: str
    document_type: str
    creator: Optional[str] = "Dr. B.R. Ambedkar"
    year: Optional[int] = None
    language: Optional[str] = "English"
    collection_id: Optional[int] = None
    collection_title: Optional[str] = None
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    document_version_id: Optional[int] = None
    ocr_page_id: Optional[int] = None
    ocr_text_version_id: Optional[int] = None
    verification_status: str = "UNVERIFIED"
    access_level: str = "PUBLIC"
    citation: str
    retrieval_type: str = "HYBRID"
    score: float = 0.0
    keyword_rank: Optional[int] = None
    keyword_score: Optional[float] = None
    semantic_rank: Optional[int] = None
    semantic_score: Optional[float] = None
    rrf_score: Optional[float] = None
    reranker_score: Optional[float] = None
    is_reranked: bool = False

class SearchFacets(BaseModel):
    document_types: Dict[str, int] = {}
    collections: Dict[str, int] = {}
    languages: Dict[str, int] = {}
    years: Dict[str, int] = {}
    transcription_layers: Dict[str, int] = {}

class SearchDiagnostics(BaseModel):
    mode: str = "hybrid"
    query: str = ""
    page: int = 1
    page_size: int = 10
    applied_filters: Dict[str, Any] = {}
    vector_backend: str = "SQLITE_DEV_FALLBACK"
    is_vector_production: bool = False
    keyword_count: Optional[int] = None
    semantic_count: Optional[int] = None
    semantic_diagnostics: Optional[Dict[str, Any]] = None
    reranker_diagnostics: Optional[Dict[str, Any]] = None

class SearchResponse(BaseModel):
    query: Optional[str] = None
    mode: str = "hybrid"
    total: int
    page: int = 1
    page_size: int = 10
    items: List[SearchResultItem] = []
    facets: SearchFacets = Field(default_factory=SearchFacets)
    diagnostics: SearchDiagnostics = Field(default_factory=SearchDiagnostics)

# Alias for explicit naming
ArchivalSearchResponse = SearchResponse

class SearchIndexStatusResponse(BaseModel):
    total_documents: int
    indexed_documents: int
    total_chunks: int
    indexed_chunks: int
    vectorized_chunks: int
    verified_chunks: int
    vector_backend: str
    is_vector_backend_production: bool
    embedding_model_name: str
    embedding_model_status: str
    embedding_dimension: Optional[int] = None
    recent_jobs: List[Dict[str, Any]] = []

class SearchIndexJobResponse(BaseModel):
    id: int
    job_type: str
    document_id: Optional[int] = None
    status: str
    total_chunks: int = 0
    indexed_chunks: int = 0
    failed_chunks: int = 0
    embedding_model: Optional[str] = None
    embedding_dim: Optional[int] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None

class EvaluationReportResponse(BaseModel):
    eval_timestamp: float
    total_benchmark_queries: int
    modes_evaluated: List[str]
    vector_backend: str
    is_vector_production: bool
    embedding_model_status: str
    reranker_model_status: str
    metrics_by_mode: Dict[str, Any]
    evaluation_notice: str
