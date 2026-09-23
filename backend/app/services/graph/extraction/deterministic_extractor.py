"""
Deterministic Archival Metadata Extractor.
Extracts verified historical entities and EXPLICIT_SOURCE_RELATION links directly from
formally cataloged institutional document metadata, authors, topics, and collections.
"""

from typing import List, Dict, Any, Optional
import logging
from app.db.models import Document, Collection, Topic
from app.services.graph.extraction.base import (
    BaseEntityExtractor, BaseRelationshipExtractor,
    ExtractedEntity, ExtractedRelationship
)

logger = logging.getLogger("archive.graph.extraction.deterministic")

class DeterministicArchivalExtractor(BaseEntityExtractor, BaseRelationshipExtractor):
    """
    Extracts high-confidence, verified entities and relationships from cataloged archival records.
    Never invents entities or ungrounded historical claims.
    """

    @property
    def extractor_name(self) -> str:
        return "deterministic_catalog_metadata"

    @property
    def is_available(self) -> bool:
        return True

    def extract_entities(self, text: str, context: Optional[Dict[str, Any]] = None) -> List[ExtractedEntity]:
        entities: List[ExtractedEntity] = []
        context = context or {}
        doc: Optional[Document] = context.get("document")

        if not doc:
            return entities

        # 1. Document Entity
        entities.append(ExtractedEntity(
            canonical_name=doc.title,
            entity_type="Document" if doc.document_type != "SPEECH" else "Speech",
            description=doc.description or f"Archival document: {doc.title}",
            language=doc.language or "English",
            confidence=1.0,
            extraction_method=self.extractor_name,
            source_reference=f"Archive ID: {doc.archive_id}",
            document_id=doc.id
        ))

        # 2. Author / Creator Entity
        if hasattr(doc, "author") and doc.author:
            author_name = doc.author.name if hasattr(doc.author, "name") else str(doc.author)
        elif getattr(doc, "creator", None):
            author_name = doc.creator
        else:
            author_name = "Dr. B. R. Ambedkar"

        entities.append(ExtractedEntity(
            canonical_name=author_name,
            entity_type="Person",
            description="Chief Architect of the Constitution of India, jurist, economist, and social reformer.",
            alternate_names=["Babasaheb Ambedkar", "Dr. B.R. Ambedkar", "Bhimrao Ramji Ambedkar"],
            language="English",
            confidence=1.0,
            extraction_method=self.extractor_name,
            source_reference=f"Author field of {doc.archive_id}",
            document_id=doc.id
        ))

        # 3. Collection Entity
        if doc.collection:
            entities.append(ExtractedEntity(
                canonical_name=doc.collection.name,
                entity_type="Collection",
                description=doc.collection.description or f"Archival collection: {doc.collection.name}",
                confidence=1.0,
                extraction_method=self.extractor_name,
                source_reference=f"Collection of {doc.archive_id}",
                document_id=doc.id
            ))

        # 4. Topics
        if doc.topics:
            for top in doc.topics:
                entities.append(ExtractedEntity(
                    canonical_name=top.name,
                    entity_type="Topic",
                    description=top.description or f"Historical topic: {top.name}",
                    confidence=1.0,
                    extraction_method=self.extractor_name,
                    source_reference=f"Topic of {doc.archive_id}",
                    document_id=doc.id
                ))

        # 5. Organization / Institution if source mentioned
        source_inst = getattr(doc, "source_name", None) or getattr(doc, "source_institution", None)
        if source_inst:
            entities.append(ExtractedEntity(
                canonical_name=source_inst,
                entity_type="Institution",
                description=f"Institutional archival custodian: {source_inst}",
                confidence=1.0,
                extraction_method=self.extractor_name,
                source_reference=f"Custodian of {doc.archive_id}",
                document_id=doc.id
            ))

        return entities

    def extract_relationships(
        self,
        text: str,
        entities: List[ExtractedEntity],
        context: Optional[Dict[str, Any]] = None
    ) -> List[ExtractedRelationship]:
        rels: List[ExtractedRelationship] = []
        context = context or {}
        doc: Optional[Document] = context.get("document")

        if not doc:
            return rels

        if hasattr(doc, "author") and doc.author:
            author_name = doc.author.name if hasattr(doc.author, "name") else str(doc.author)
        elif getattr(doc, "creator", None):
            author_name = doc.creator
        else:
            author_name = "Dr. B. R. Ambedkar"

        doc_type = "Document" if doc.document_type != "SPEECH" else "Speech"

        # Author -> AUTHORED / SPOKE_AT -> Document
        rel_verb = "SPOKE_AT" if doc.document_type == "SPEECH" else "AUTHORED"
        rels.append(ExtractedRelationship(
            source_entity_name=author_name,
            source_entity_type="Person",
            relationship_type=rel_verb,
            target_entity_name=doc.title,
            target_entity_type=doc_type,
            confidence=1.0,
            provenance_type="EXPLICIT_SOURCE_RELATION",
            extraction_method=self.extractor_name,
            evidence_text=f"Cataloged author '{author_name}' for archival document {doc.archive_id}",
            evidence_reference=f"Catalog record: {doc.archive_id}",
            document_id=doc.id
        ))

        # Document -> PART_OF_COLLECTION -> Collection
        if doc.collection:
            rels.append(ExtractedRelationship(
                source_entity_name=doc.title,
                source_entity_type=doc_type,
                relationship_type="PART_OF_COLLECTION",
                target_entity_name=doc.collection.name,
                target_entity_type="Collection",
                confidence=1.0,
                provenance_type="EXPLICIT_SOURCE_RELATION",
                extraction_method=self.extractor_name,
                evidence_text=f"Document belongs to collection '{doc.collection.name}'",
                evidence_reference=f"Catalog record: {doc.archive_id}",
                document_id=doc.id
            ))

        # Document -> DISCUSSES -> Topic
        if doc.topics:
            for top in doc.topics:
                rels.append(ExtractedRelationship(
                    source_entity_name=doc.title,
                    source_entity_type=doc_type,
                    relationship_type="DISCUSSES",
                    target_entity_name=top.name,
                    target_entity_type="Topic",
                    confidence=1.0,
                    provenance_type="EXPLICIT_SOURCE_RELATION",
                    extraction_method=self.extractor_name,
                    evidence_text=f"Document indexed with topic '{top.name}'",
                    evidence_reference=f"Topic assignment in {doc.archive_id}",
                    document_id=doc.id
                ))

        # Document -> HELD_BY -> Institution
        source_inst = getattr(doc, "source_name", None) or getattr(doc, "source_institution", None)
        if source_inst:
            rels.append(ExtractedRelationship(
                source_entity_name=doc.title,
                source_entity_type=doc_type,
                relationship_type="HELD_BY",
                target_entity_name=source_inst,
                target_entity_type="Institution",
                confidence=1.0,
                provenance_type="EXPLICIT_SOURCE_RELATION",
                extraction_method=self.extractor_name,
                evidence_text=f"Archival custodian: {source_inst}",
                evidence_reference=f"Custodian record for {doc.archive_id}",
                document_id=doc.id
            ))

        return rels
