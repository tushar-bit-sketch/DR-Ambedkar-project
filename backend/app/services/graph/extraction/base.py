"""
Base Extraction Interfaces for Knowledge Graph Entities and Relationships.
Enforces strict provenance metadata and clear labeling of machine extractions.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class ExtractedEntity:
    canonical_name: str
    entity_type: str
    description: Optional[str] = None
    alternate_names: Optional[List[str]] = None
    language: str = "English"
    confidence: float = 1.0
    extraction_method: str = "DETERMINISTIC"
    source_reference: Optional[str] = None
    source_text: Optional[str] = None
    document_id: Optional[int] = None
    page_id: Optional[int] = None
    chunk_id: Optional[int] = None

@dataclass
class ExtractedRelationship:
    source_entity_name: str
    source_entity_type: str
    relationship_type: str
    target_entity_name: str
    target_entity_type: str
    confidence: float = 1.0
    provenance_type: str = "EXPLICIT_SOURCE_RELATION"
    verification_status: str = "PENDING_REVIEW"
    extraction_method: str = "DETERMINISTIC"
    evidence_text: Optional[str] = None
    evidence_reference: Optional[str] = None
    document_id: Optional[int] = None
    document_version_id: Optional[int] = None
    ocr_text_version_id: Optional[int] = None
    page_id: Optional[int] = None
    chunk_id: Optional[int] = None

class BaseEntityExtractor(ABC):
    """Abstract interface for extracting entities from archival texts or metadata."""

    @property
    @abstractmethod
    def extractor_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def extract_entities(self, text: str, context: Optional[Dict[str, Any]] = None) -> List[ExtractedEntity]:
        pass

class BaseRelationshipExtractor(ABC):
    """Abstract interface for extracting relationships between entities."""

    @property
    @abstractmethod
    def extractor_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def extract_relationships(
        self,
        text: str,
        entities: List[ExtractedEntity],
        context: Optional[Dict[str, Any]] = None
    ) -> List[ExtractedRelationship]:
        pass
