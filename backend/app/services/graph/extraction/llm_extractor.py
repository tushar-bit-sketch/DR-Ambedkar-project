"""
LLM-Powered Historical Entity and Relationship Extractor.
Uses the active local instruction LLM (Ollama gemma-3:1b) for structured extraction.
Transparently reports ENTITY_EXTRACTION_UNAVAILABLE if LLM service is offline.
Never generates synthetic/hallucinated extractions.
"""

import json
import logging
from typing import List, Dict, Any, Optional
import httpx

from app.core.config import settings
from app.services.graph.extraction.base import (
    BaseEntityExtractor, BaseRelationshipExtractor,
    ExtractedEntity, ExtractedRelationship
)

logger = logging.getLogger("archive.graph.extraction.llm")

class LLMArchivalExtractor(BaseEntityExtractor, BaseRelationshipExtractor):
    """
    LLM extraction engine with honest unavailability reporting and strict JSON schema prompts.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None
    ):
        self._base_url = (base_url or settings.LLM_BASE_URL or "http://localhost:11434").rstrip("/")
        self._model_name = model_name or settings.LLM_MODEL or "gemma-3:1b"
        self._is_available = False
        self._status = "UNINITIALIZED"
        self._check_availability()

    def _check_availability(self):
        try:
            resp = httpx.get(f"{self._base_url}/api/tags", timeout=2.0)
            if resp.status_code == 200:
                self._is_available = True
                self._status = "READY"
            else:
                self._is_available = False
                self._status = "ENTITY_EXTRACTION_UNAVAILABLE"
        except Exception:
            self._is_available = False
            self._status = "ENTITY_EXTRACTION_UNAVAILABLE"

    @property
    def extractor_name(self) -> str:
        return "local_llm_structured_ner"

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def extract_entities(self, text: str, context: Optional[Dict[str, Any]] = None) -> List[ExtractedEntity]:
        if not self._is_available:
            logger.info("LLM extraction unavailable: service offline. Returning empty extraction.")
            return []

        # Strict JSON prompting
        prompt = (
            "You are a scholarly archival entity extraction system. Given the archival text, extract real historical "
            "entities (Person, Institution, Event, Concept, Place, Topic) mentioned in the text.\n"
            "CRITICAL: Do NOT invent entities. Output ONLY valid JSON: [{\"canonical_name\": \"...\", \"entity_type\": \"...\", \"evidence_text\": \"...\"}]\n\n"
            f"Archival Text:\n\"\"\"\n{text[:1500]}\n\"\"\""
        )
        try:
            resp = httpx.post(
                f"{self._base_url}/api/chat",
                json={
                    "model": self._model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"temperature": 0.0}
                },
                timeout=15.0
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                # Parse JSON block
                start = content.find("[")
                end = content.rfind("]")
                if start != -1 and end != -1:
                    raw_list = json.loads(content[start:end+1])
                    entities = []
                    context = context or {}
                    for item in raw_list:
                        if isinstance(item, dict) and item.get("canonical_name"):
                            entities.append(ExtractedEntity(
                                canonical_name=item["canonical_name"].strip(),
                                entity_type=item.get("entity_type", "Concept"),
                                confidence=0.75,
                                extraction_method=self.extractor_name,
                                source_text=item.get("evidence_text"),
                                document_id=context.get("document_id"),
                                page_id=context.get("page_id"),
                                chunk_id=context.get("chunk_id")
                            ))
                    return entities
        except Exception as e:
            logger.warning(f"LLM entity extraction failed: {e}")

        return []

    def extract_relationships(
        self,
        text: str,
        entities: List[ExtractedEntity],
        context: Optional[Dict[str, Any]] = None
    ) -> List[ExtractedRelationship]:
        if not self._is_available or not entities:
            return []

        # Formulate relationship extraction prompt
        entity_names = [e.canonical_name for e in entities[:8]]
        prompt = (
            "Given the archival text and known entities, identify genuine relationships between them.\n"
            f"Known Entities: {entity_names}\n"
            "Supported Relationships: AUTHORED, PARTICIPATED_IN, DISCUSSES, REFERENCES, RELATED_TO, MEMBER_OF, OCCURRED_AT\n"
            "CRITICAL: Output ONLY a JSON array: [{\"source\": \"...\", \"relation\": \"...\", \"target\": \"...\", \"evidence\": \"...\"}]\n\n"
            f"Text:\n\"\"\"\n{text[:1500]}\n\"\"\""
        )
        try:
            resp = httpx.post(
                f"{self._base_url}/api/chat",
                json={
                    "model": self._model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"temperature": 0.0}
                },
                timeout=15.0
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                start = content.find("[")
                end = content.rfind("]")
                if start != -1 and end != -1:
                    raw_list = json.loads(content[start:end+1])
                    rels = []
                    context = context or {}
                    for item in raw_list:
                        if isinstance(item, dict) and item.get("source") and item.get("target") and item.get("relation"):
                            rels.append(ExtractedRelationship(
                                source_entity_name=item["source"].strip(),
                                source_entity_type="Concept",
                                relationship_type=item["relation"].strip().upper(),
                                target_entity_name=item["target"].strip(),
                                target_entity_type="Concept",
                                confidence=0.70,
                                provenance_type="MACHINE_INFERRED_RELATION",
                                extraction_method=self.extractor_name,
                                evidence_text=item.get("evidence"),
                                document_id=context.get("document_id"),
                                document_version_id=context.get("document_version_id"),
                                page_id=context.get("page_id"),
                                chunk_id=context.get("chunk_id")
                            ))
                    return rels
        except Exception as e:
            logger.warning(f"LLM relationship extraction failed: {e}")

        return []
