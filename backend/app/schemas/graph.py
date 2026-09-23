from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class GraphEntityBase(BaseModel):
    entity_type: str
    canonical_name: str
    alternate_names: Optional[List[str]] = []
    description: Optional[str] = ""
    language: Optional[str] = "English"
    verification_status: Optional[str] = "VERIFIED"
    source_reference: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    date_precision: Optional[str] = "YEAR"
    location: Optional[str] = None
    external_identifier: Optional[str] = None
    access_level: Optional[str] = "PUBLIC"

class GraphEntityCreate(GraphEntityBase):
    pass

class GraphEntityUpdate(BaseModel):
    canonical_name: Optional[str] = None
    alternate_names: Optional[List[str]] = None
    description: Optional[str] = None
    language: Optional[str] = None
    verification_status: Optional[str] = None
    source_reference: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    date_precision: Optional[str] = None
    location: Optional[str] = None
    external_identifier: Optional[str] = None
    access_level: Optional[str] = None

class GraphEntityOut(GraphEntityBase):
    id: int
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class GraphRelationshipBase(BaseModel):
    source_entity_id: int
    relationship_type: str
    target_entity_id: int
    verification_status: Optional[str] = "APPROVED"
    provenance_type: Optional[str] = "EXPLICIT_SOURCE_RELATION"
    confidence: Optional[float] = 1.0
    evidence_reference: Optional[str] = None
    evidence_text: Optional[str] = None
    source_document_id: Optional[int] = None
    document_version_id: Optional[int] = None
    ocr_text_version_id: Optional[int] = None
    page_id: Optional[int] = None
    chunk_id: Optional[int] = None
    access_level: Optional[str] = "PUBLIC"

class GraphRelationshipCreate(GraphRelationshipBase):
    pass

class GraphRelationshipUpdate(BaseModel):
    verification_status: Optional[str] = None
    provenance_type: Optional[str] = None
    confidence: Optional[float] = None
    evidence_reference: Optional[str] = None
    evidence_text: Optional[str] = None
    access_level: Optional[str] = None

class GraphRelationshipReviewAction(BaseModel):
    action: str # "APPROVE" or "REJECT"
    notes: Optional[str] = None

class GraphRelationshipOut(GraphRelationshipBase):
    id: int
    source_entity_name: Optional[str] = None
    source_entity_type: Optional[str] = None
    target_entity_name: Optional[str] = None
    target_entity_type: Optional[str] = None
    confidence_label: Optional[str] = None
    created_by: Optional[int] = None
    reviewed_by: Optional[int] = None
    created_at: Optional[str] = None
    reviewed_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class GraphNeighborsOut(BaseModel):
    root_id: int
    depth: int
    nodes: List[GraphEntityOut]
    edges: List[GraphRelationshipOut]
    total_nodes: int
    total_edges: int

class GraphPathOut(BaseModel):
    source_id: int
    target_id: int
    path: List[GraphEntityOut]
    path_length: int

class GraphStatsOut(BaseModel):
    total_entities: int
    total_relationships: int
    pending_relationships: int
    pending_entities: int
    entity_types: Dict[str, int]
    relationship_types: Dict[str, int]
    backend: str

class GraphStatusOut(BaseModel):
    backend: str
    is_operational: bool
    status: str
    entity_count: Optional[int] = None
    relationship_count: Optional[int] = None
    details: Optional[str] = None
    neo4j_uri: Optional[str] = None

class EntityMergeCreate(BaseModel):
    primary_entity_id: int
    merged_entity_id: int
    merge_reason: str

class EntityMergeReviewAction(BaseModel):
    action: str # "APPROVE" or "REJECT"

class EntityMergeOut(BaseModel):
    id: int
    primary_entity_id: int
    merged_entity_id: int
    status: str
    merge_reason: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class GraphExtractionRequest(BaseModel):
    document_id: int
    extractor_type: Optional[str] = "deterministic" # "deterministic", "rule_based", "llm"

class GraphExtractionResponse(BaseModel):
    document_id: int
    extractor_type: str
    entities_extracted: int
    relationships_extracted: int
    status: str
    message: str

class ProvenanceChainOut(BaseModel):
    claim_id: Optional[int] = None
    relationship: Optional[GraphRelationshipOut] = None
    document: Optional[Dict[str, Any]] = None
    document_version: Optional[Dict[str, Any]] = None
    ocr_page: Optional[Dict[str, Any]] = None
    ocr_text_version: Optional[Dict[str, Any]] = None
    search_chunk: Optional[Dict[str, Any]] = None
    physical_source: Optional[Dict[str, Any]] = None
    verification_status: str
    provenance_classification: str
