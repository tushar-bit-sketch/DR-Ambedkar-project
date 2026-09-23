"""
Rule-Based Historical Entity and Relationship Extractor.
Scans OCR text and search chunks using curated gazetteers and context rules.
Outputs MACHINE_EXTRACTED_RELATION marked PENDING_REVIEW with exact evidence quotes.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
import logging

from app.services.graph.extraction.base import (
    BaseEntityExtractor, BaseRelationshipExtractor,
    ExtractedEntity, ExtractedRelationship
)

logger = logging.getLogger("archive.graph.extraction.rule_based")

# Curated Historical Gazetteers
HISTORICAL_PEOPLE = {
    "Dr. B. R. Ambedkar": ["ambedkar", "b.r. ambedkar", "bhimrao", "babasaheb ambedkar"],
    "Jawaharlal Nehru": ["jawaharlal nehru", "pandit nehru", "nehru"],
    "Sardar Vallabhbhai Patel": ["sardar patel", "vallabhbhai patel", "sardar vallabhbhai"],
    "Dr. Rajendra Prasad": ["rajendra prasad", "dr. rajendra prasad"],
    "Mahatma Gandhi": ["mahatma gandhi", "m.k. gandhi", "gandhiji"],
    "Alladi Krishnaswamy Iyer": ["alladi krishnaswamy", "krishnaswamy iyer"],
    "K. M. Munshi": ["k.m. munshi", "munshi"],
    "B. N. Rau": ["b.n. rau", "sir b.n. rau", "constitutional adviser"]
}

HISTORICAL_INSTITUTIONS = {
    "Constituent Assembly of India": ["constituent assembly", "cad", "constituent assembly of india"],
    "Drafting Committee": ["drafting committee", "constitution drafting committee"],
    "Columbia University": ["columbia university", "columbia"],
    "London School of Economics": ["london school of economics", "lse"],
    "National Archives of India": ["national archives of india", "nai"],
    "Independent Labour Party": ["independent labour party", "ilp"],
    "Scheduled Castes Federation": ["scheduled castes federation", "scf"]
}

HISTORICAL_CONCEPTS = {
    "Constitutional Morality": ["constitutional morality"],
    "Social Democracy": ["social democracy"],
    "Fundamental Rights": ["fundamental rights", "article 32", "remedies"],
    "Annihilation of Caste": ["annihilation of caste"],
    "Fraternity": ["liberty, equality, and fraternity", "fraternity"]
}

HISTORICAL_EVENTS = {
    "Grammar of Anarchy Address": ["grammar of anarchy", "third reading", "25th november 1949"],
    "Mahad Satyagraha": ["mahad satyagraha", "chavdar tale", "mahad water satyagraha"],
    "Poona Pact": ["poona pact", "communal award"],
    "Round Table Conferences": ["round table conference", "first round table conference", "second round table"]
}

class RuleBasedArchivalExtractor(BaseEntityExtractor, BaseRelationshipExtractor):
    """
    Regex and gazetteer-driven historical entity extraction pipeline.
    All relationships output are labeled MACHINE_EXTRACTED_RELATION with confidence <= 0.85.
    """

    @property
    def extractor_name(self) -> str:
        return "rule_based_historical_ner"

    @property
    def is_available(self) -> bool:
        return True

    def _extract_gazetteer(self, text: str, gazetteer: Dict[str, List[str]], entity_type: str) -> List[Tuple[str, str, str]]:
        """Finds entity mentions and extracts a 100-character evidence snippet."""
        results = []
        lower_text = text.lower()
        for canonical, patterns in gazetteer.items():
            for pat in patterns:
                idx = lower_text.find(pat)
                if idx != -1:
                    start = max(0, idx - 40)
                    end = min(len(text), idx + len(pat) + 60)
                    snippet = text[start:end].strip()
                    results.append((canonical, entity_type, snippet))
                    break # One pattern match is enough for this entity
        return results

    def extract_entities(self, text: str, context: Optional[Dict[str, Any]] = None) -> List[ExtractedEntity]:
        if not text:
            return []

        context = context or {}
        doc_id = context.get("document_id")
        page_id = context.get("page_id")
        chunk_id = context.get("chunk_id")

        entities: List[ExtractedEntity] = []

        # Scan people, institutions, concepts, events
        for cat_dict, ent_type in [
            (HISTORICAL_PEOPLE, "Person"),
            (HISTORICAL_INSTITUTIONS, "Institution"),
            (HISTORICAL_CONCEPTS, "Concept"),
            (HISTORICAL_EVENTS, "Event")
        ]:
            matches = self._extract_gazetteer(text, cat_dict, ent_type)
            for canon, etype, snippet in matches:
                entities.append(ExtractedEntity(
                    canonical_name=canon,
                    entity_type=etype,
                    confidence=0.85,
                    extraction_method=self.extractor_name,
                    source_text=snippet,
                    document_id=doc_id,
                    page_id=page_id,
                    chunk_id=chunk_id
                ))

        return entities

    def extract_relationships(
        self,
        text: str,
        entities: List[ExtractedEntity],
        context: Optional[Dict[str, Any]] = None
    ) -> List[ExtractedRelationship]:
        if not text or not entities:
            return []

        context = context or {}
        doc_id = context.get("document_id")
        doc_title = context.get("document_title", "Archival Document")
        doc_ver_id = context.get("document_version_id")
        ocr_ver_id = context.get("ocr_text_version_id")
        page_id = context.get("page_id")
        chunk_id = context.get("chunk_id")

        rels: List[ExtractedRelationship] = []

        # Find mentions of institutions, events, concepts connected to document
        for ent in entities:
            if ent.canonical_name == doc_title:
                continue

            rel_type = "DISCUSSES"
            if ent.entity_type == "Person":
                rel_type = "REFERENCES"
            elif ent.entity_type == "Event":
                rel_type = "RELATED_TO"
            elif ent.entity_type == "Institution":
                rel_type = "REFERENCES"

            rels.append(ExtractedRelationship(
                source_entity_name=doc_title,
                source_entity_type="Document",
                relationship_type=rel_type,
                target_entity_name=ent.canonical_name,
                target_entity_type=ent.entity_type,
                confidence=0.85,
                provenance_type="MACHINE_EXTRACTED_RELATION",
                extraction_method=self.extractor_name,
                evidence_text=ent.source_text or f"Mentions '{ent.canonical_name}' in archival passage.",
                document_id=doc_id,
                document_version_id=doc_ver_id,
                ocr_text_version_id=ocr_ver_id,
                page_id=page_id,
                chunk_id=chunk_id
            ))

        return rels
