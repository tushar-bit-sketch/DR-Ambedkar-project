"""
Archival RAG Orchestration Engine.
Integrates Phase 4 ArchivalRetrievalEngine directly, enforces RBAC, constructs evidence context,
calls LLM provider with strict closed-world system prompt, validates citations,
and records auditable conversations and provenance logs.
"""

import json
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import (
    User, Document, SearchChunk,
    ResearchConversation, ResearchMessage, ResearchAuditLog
)
from app.services.search.retrieval_engine import ArchivalRetrievalEngine
from app.services.rag.llm.base import BaseLLMProvider, LLMUnavailableError
from app.services.rag.llm.factory import get_llm_provider
from app.services.rag.prompts import (
    ARCHIVAL_RAG_SYSTEM_PROMPT,
    USER_QUERY_TEMPLATE,
    MULTILINGUAL_USER_QUERY_TEMPLATE,
    NO_EVIDENCE_RESPONSE,
    INSUFFICIENT_EVIDENCE_RESPONSE,
    LLM_UNAVAILABLE_RESPONSE
)
from app.services.rag.context_builder import ContextBuilder
from app.services.rag.citation_validator import CitationValidator

logger = logging.getLogger("archive.rag.engine")

class ArchivalRAGEngine:
    """
    Production-grade Archival RAG Orchestration Engine.
    """

    def __init__(
        self,
        db: Session,
        retrieval_engine: Optional[ArchivalRetrievalEngine] = None,
        llm_provider: Optional[BaseLLMProvider] = None,
        context_builder: Optional[ContextBuilder] = None,
        citation_validator: Optional[CitationValidator] = None
    ):
        self.db = db
        self.retrieval_engine = retrieval_engine or ArchivalRetrievalEngine(db=db)
        self.llm_provider = llm_provider or get_llm_provider()
        self.context_builder = context_builder or ContextBuilder(
            max_context_tokens=settings.MAX_CONTEXT_TOKENS,
            max_evidence_chunks=settings.RAG_MAX_EVIDENCE_CHUNKS,
            min_score=settings.RAG_MIN_EVIDENCE_SCORE
        )
        self.citation_validator = citation_validator or CitationValidator()

    def _get_or_create_conversation(
        self,
        conversation_id: Optional[str],
        title_hint: str,
        user: Optional[User]
    ) -> ResearchConversation:
        """Retrieves an existing conversation or initializes a new one."""
        if conversation_id:
            conv = self.db.query(ResearchConversation).filter(
                ResearchConversation.conversation_id == conversation_id
            ).first()
            if conv:
                return conv

        new_conv_id = conversation_id or f"conv_{uuid.uuid4().hex[:16]}"
        conv = ResearchConversation(
            conversation_id=new_conv_id,
            user_id=user.id if user else None,
            title=title_hint[:120].strip() or "Archival Research Inquiry"
        )
        self.db.add(conv)
        self.db.flush()
        return conv

    def retrieve_candidates(
        self,
        query: str,
        user: Optional[User] = None,
        mode: str = "hybrid",
        filters: Optional[Dict[str, Any]] = None,
        max_candidates: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieves evidence candidates across:
        1. Phase 4 Hybrid Search (Document chunks)
        2. Phase 7 Knowledge Graph (Verified relationships & entities)
        3. Phase 8 Audio/Video Intelligence (Verified transcript segments with timestamps)
        """
        q_clean = (query or "").strip()
        if not q_clean:
            return []

        search_result = self.retrieval_engine.search(
            query=q_clean,
            mode=mode,
            filters=filters,
            user=user,
            page=1,
            page_size=max_candidates
        )
        candidates = search_result.get("items", [])

        # Phase 7 Graph Retrieval
        try:
            from app.services.graph.repository.factory import get_graph_repository
            graph_repo = get_graph_repository(self.db)
            matched_entities = graph_repo.search_entities(query=q_clean, limit=2)
            for ent in matched_entities:
                rels = graph_repo.get_relationships(entity_id=ent["id"], verification_status="APPROVED", limit=3)
                for r in rels:
                    if r.get("evidence_text"):
                        candidates.append({
                            "chunk_id": r.get("chunk_id"),
                            "document_id": r.get("source_document_id"),
                            "document_title": r.get("source_entity_name") or ent["canonical_name"],
                            "archive_id": f"KG-REL-{r['id']}",
                            "page_number": r.get("page_id") or 1,
                            "folio_number": None,
                            "text": f"Verified Archival Relation: {r['source_entity_name']} [{r['relationship_type']}] {r['target_entity_name']}. Evidence: {r['evidence_text']}",
                            "score": 0.85
                        })
        except Exception as ge:
            logger.debug(f"Graph context retrieval skipped: {ge}")

        # Phase 8 Media Transcript Retrieval: search verified transcript segments for timestamped citations
        try:
            from app.services.media.search_service import MediaSearchService
            user_access = "ALL" if (user and user.role and user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]) else (
                "RESEARCH_ONLY" if (user and user.role and user.role.name == "RESEARCHER") else "PUBLIC"
            )
            media_segments = MediaSearchService.search_media_transcript_segments(
                db=self.db,
                query=q_clean,
                limit=3,
                access_level=user_access
            )
            for seg in media_segments:
                candidates.append({
                    "chunk_id": None,
                    "document_id": None,
                    "media_id": seg["media_id"],
                    "document_title": f"Media Recording: {seg['media_title']}",
                    "archive_id": seg["archive_id"],
                    "page_number": None,
                    "folio_number": None,
                    "timestamp": f"{seg['start_timestamp_str']}–{seg['end_timestamp_str']}",
                    "text": f"Verified Archival Media Transcript [{seg['archive_id']} ({seg['start_timestamp_str']}–{seg['end_timestamp_str']}) - Speaker: {seg['speaker_label']}]: \"{seg['snippet']}\"",
                    "score": 0.88,
                    "is_media_evidence": True,
                    "candidate_type": "media_transcript",
                    "start_time": seg.get("start_time"),
                    "end_time": seg.get("end_time"),
                })
        except Exception as me:
            logger.debug(f"Media transcript retrieval skipped: {me}")

        return candidates

    def ask(
        self,
        query: str,
        conversation_id: Optional[str] = None,
        user: Optional[User] = None,
        filters: Optional[Dict[str, Any]] = None,
        mode: str = "hybrid",
        target_language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes complete RAG workflow:
        Query -> Hybrid + Graph + Media Search -> Context Construction -> LLM -> Citation Validation -> DB Persistence
        """
        q_clean = (query or "").strip()
        if not q_clean:
            return {
                "answer": "Please provide a valid research question.",
                "conversation_id": conversation_id or f"conv_{uuid.uuid4().hex[:16]}",
                "message_id": None,
                "status": "INVALID_QUERY",
                "grounded": False,
                "citations": [],
                "retrieved_evidence": [],
                "diagnostics": {"error": "Query string was empty or whitespace only"}
            }

        candidates = self.retrieve_candidates(
            query=q_clean,
            user=user,
            mode=mode,
            filters=filters,
            max_candidates=settings.SEARCH_TOP_K_RETRIEVAL
        )
        retrieval_diag = {}

        conversation = self._get_or_create_conversation(
            conversation_id=conversation_id,
            title_hint=q_clean,
            user=user
        )

        # 2. Check for zero retrieval
        if not candidates:
            logger.info(f"Zero archival candidates retrieved for query: '{q_clean}'")
            return self._record_and_return_response(
                conversation=conversation,
                user=user,
                query=q_clean,
                answer=NO_EVIDENCE_RESPONSE,
                status="NO_EVIDENCE",
                grounded=False,
                citations=[],
                selected_candidates=[],
                diagnostics=retrieval_diag
            )

        # 3. Context Construction and Score Thresholding
        context_text, source_map, selected_candidates = self.context_builder.build_context(
            candidates=candidates,
            query=q_clean
        )

        if not selected_candidates or not context_text:
            logger.info(f"Candidates retrieved but none passed relevance threshold for: '{q_clean}'")
            return self._record_and_return_response(
                conversation=conversation,
                user=user,
                query=q_clean,
                answer=INSUFFICIENT_EVIDENCE_RESPONSE,
                status="INSUFFICIENT_EVIDENCE",
                grounded=False,
                citations=[],
                selected_candidates=[],
                diagnostics=retrieval_diag
            )

        # 4. Check LLM Availability
        is_llm_avail = self.llm_provider.is_available() if callable(self.llm_provider.is_available) else bool(self.llm_provider.is_available)
        if not is_llm_avail:
            logger.warning(
                f"LLM Provider {self.llm_provider.provider_name} is unavailable. "
                "Returning LLM_UNAVAILABLE status without guessing."
            )
            return self._record_and_return_response(
                conversation=conversation,
                user=user,
                query=q_clean,
                answer=LLM_UNAVAILABLE_RESPONSE,
                status="LLM_UNAVAILABLE",
                grounded=False,
                citations=[],
                selected_candidates=selected_candidates,
                diagnostics={**retrieval_diag, "llm_status": "PROVIDER_UNAVAILABLE"}
            )

        # 5. Format prompt and call LLM
        if target_language and target_language.lower() not in ("en", "english"):
            user_prompt = MULTILINGUAL_USER_QUERY_TEMPLATE.format(
                evidence_context=context_text,
                query=q_clean,
                target_language=target_language
            )
        else:
            user_prompt = USER_QUERY_TEMPLATE.format(
                evidence_context=context_text,
                query=q_clean
            )

        try:
            llm_result = self.llm_provider.generate(
                system_prompt=ARCHIVAL_RAG_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=settings.TEMPERATURE,
                max_tokens=settings.MAX_OUTPUT_TOKENS
            )
            raw_answer = llm_result.get("content", "")
            tokens_used = llm_result.get("tokens_used", {})
        except LLMUnavailableError as e:
            logger.error(f"LLM provider error during generation: {e}")
            return self._record_and_return_response(
                conversation=conversation,
                user=user,
                query=q_clean,
                answer=LLM_UNAVAILABLE_RESPONSE,
                status="LLM_UNAVAILABLE",
                grounded=False,
                citations=[],
                selected_candidates=selected_candidates,
                diagnostics={**retrieval_diag, "llm_error": str(e)}
            )
        except Exception as e:
            logger.error(f"Unexpected error calling LLM: {e}")
            return self._record_and_return_response(
                conversation=conversation,
                user=user,
                query=q_clean,
                answer=LLM_UNAVAILABLE_RESPONSE,
                status="LLM_UNAVAILABLE",
                grounded=False,
                citations=[],
                selected_candidates=selected_candidates,
                diagnostics={**retrieval_diag, "llm_exception": str(e)}
            )

        # 6. Citation Validation and Provenance Resolution
        val_result = self.citation_validator.validate_and_resolve(
            answer_text=raw_answer,
            source_map=source_map
        )

        status = "SUCCESS" if val_result["is_grounded"] else "CITATION_VALIDATION_FAILED"

        combined_diag = {
            **retrieval_diag,
            "target_language": target_language or "en",
            "llm_provider": self.llm_provider.provider_name,
            "llm_model": self.llm_provider.model_name,
            "tokens_used": tokens_used,
            "validation_status": val_result["validation_status"],
            "quotation_checks": val_result["quotation_checks"],
            "invalid_citations": val_result["invalid_citations"]
        }

        return self._record_and_return_response(
            conversation=conversation,
            user=user,
            query=q_clean,
            answer=val_result["sanitized_answer"],
            status=status,
            grounded=val_result["is_grounded"],
            citations=val_result["citations"],
            selected_candidates=selected_candidates,
            diagnostics=combined_diag
        )

    def _record_and_return_response(
        self,
        conversation: ResearchConversation,
        user: Optional[User],
        query: str,
        answer: str,
        status: str,
        grounded: bool,
        citations: List[Dict[str, Any]],
        selected_candidates: List[Dict[str, Any]],
        diagnostics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Persists user inquiry, assistant response, and audit log to DB, then returns API dictionary.
        """
        chunk_ids = [c["chunk_id"] for c in selected_candidates if c.get("chunk_id")]
        doc_ids = list(set([c["document_id"] for c in selected_candidates if c.get("document_id")]))
        page_ids = [c.get("page_number") for c in selected_candidates if c.get("page_number")]

        # Record User Message
        user_msg = ResearchMessage(
            conversation_id=conversation.conversation_id,
            role="user",
            content=query,
            status="SUCCESS",
            grounded=True,
            evidence_count=0
        )
        self.db.add(user_msg)

        # Record Assistant Message
        assistant_msg = ResearchMessage(
            conversation_id=conversation.conversation_id,
            role="assistant",
            content=answer,
            status=status,
            grounded=grounded,
            evidence_count=len(citations),
            citations_json=json.dumps(citations),
            retrieved_chunk_ids=json.dumps(chunk_ids),
            retrieved_document_ids=json.dumps(doc_ids),
            retrieved_page_ids=json.dumps(page_ids)
        )
        self.db.add(assistant_msg)

        # Record Compliance Audit Log
        audit_log = ResearchAuditLog(
            user_id=user.id if user else None,
            conversation_id=conversation.conversation_id,
            query=query,
            retrieved_document_ids=json.dumps(doc_ids),
            retrieved_page_ids=json.dumps(page_ids),
            retrieved_chunk_ids=json.dumps(chunk_ids),
            generation_status=status,
            citation_validation_status=diagnostics.get("validation_status", status),
            llm_provider=self.llm_provider.provider_name,
            llm_model=self.llm_provider.model_name
        )
        self.db.add(audit_log)

        try:
            self.db.commit()
            self.db.refresh(assistant_msg)
            self.db.refresh(audit_log)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to persist research interaction: {e}")

        return {
            "answer": answer,
            "conversation_id": conversation.conversation_id,
            "message_id": assistant_msg.id if assistant_msg.id else None,
            "status": status,
            "grounded": grounded,
            "citations": citations,
            "retrieved_evidence": [
                {
                    "chunk_id": c.get("chunk_id"),
                    "document_id": c.get("document_id"),
                    "archive_id": c.get("archive_id"),
                    "title": c.get("document_title") or c.get("title"),
                    "page_number": c.get("page_number"),
                    "score": c.get("score"),
                    "snippet": (c.get("chunk_text") or "")[:200]
                }
                for c in selected_candidates
            ],
            "diagnostics": diagnostics,
            "audit_id": audit_log.id if audit_log.id else None
        }
