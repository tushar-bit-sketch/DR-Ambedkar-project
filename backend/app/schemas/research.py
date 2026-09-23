from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Phase 1 Legacy Schemas (Preserved for backward compatibility)
class ResearchSourceCitation(BaseModel):
    document_id: int
    archive_id: str
    document_title: str
    page: int
    collection: str
    date: str
    excerpt: str

class ResearchQueryRequest(BaseModel):
    query: str
    language: Optional[str] = "en"
    collection_filter: Optional[str] = None

class ResearchQueryResponse(BaseModel):
    query: str
    disclaimer: str = "DEMO RESPONSE — NOT CONNECTED TO ARCHIVE (PHASE 1 FOUNDATION ONLY)"
    is_live_rag: bool = False
    answer: str
    sources: List[ResearchSourceCitation]

# Phase 5 Real Source-Grounded RAG Schemas

class CitationProvenanceChain(BaseModel):
    chunk_id: Optional[int] = None
    ocr_page_id: Optional[int] = None
    ocr_text_version_id: Optional[int] = None
    document_version_id: Optional[int] = None
    document_id: Optional[int] = None
    archive_id: Optional[str] = None
    layer: Optional[str] = None
    is_verified: Optional[bool] = False
    chain_description: Optional[str] = None

class CitationCard(BaseModel):
    source_index: int
    chunk_id: Optional[int] = None
    document_id: Optional[int] = None
    archive_id: Optional[str] = None
    document_title: Optional[str] = None
    creator: Optional[str] = None
    year: Optional[int] = None
    page_number: Optional[int] = None
    folio_number: Optional[str] = None
    transcription_layer: Optional[str] = None
    is_verified: bool = False
    citation_label: Optional[str] = None
    snippet: str
    provenance_chain: Optional[CitationProvenanceChain] = None

class EvidenceSnippet(BaseModel):
    chunk_id: Optional[int] = None
    document_id: Optional[int] = None
    archive_id: Optional[str] = None
    title: Optional[str] = None
    page_number: Optional[int] = None
    score: Optional[float] = None
    snippet: str

class ResearchAskRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    mode: Optional[str] = "hybrid" # hybrid, keyword, semantic
    filters: Optional[Dict[str, Any]] = None
    target_language: Optional[str] = "en"

class ResearchAskResponse(BaseModel):
    answer: str
    conversation_id: str
    message_id: Optional[int] = None
    status: str # SUCCESS, NO_EVIDENCE, INSUFFICIENT_EVIDENCE, LLM_UNAVAILABLE, CITATION_VALIDATION_FAILED
    grounded: bool
    citations: List[CitationCard] = []
    retrieved_evidence: List[EvidenceSnippet] = []
    diagnostics: Dict[str, Any] = {}
    audit_id: Optional[int] = None

class ResearchMessageItem(BaseModel):
    id: int
    role: str
    content: str
    status: str
    grounded: bool
    evidence_count: int
    citations: Optional[List[Dict[str, Any]]] = None
    created_at: str

class ResearchConversationSummary(BaseModel):
    conversation_id: str
    title: str
    message_count: int
    created_at: str
    updated_at: str

class ResearchConversationDetail(BaseModel):
    conversation_id: str
    title: str
    created_at: str
    messages: List[ResearchMessageItem]
