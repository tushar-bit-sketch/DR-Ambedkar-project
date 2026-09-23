"""
Context Builder for Archival RAG.
Constructs strictly structured, token-budgeted, provenance-tracked archival evidence blocks
to be supplied to the LLM.
"""

from typing import List, Dict, Any, Tuple
import logging
from app.core.config import settings

logger = logging.getLogger("archive.rag.context_builder")

class ContextBuilder:
    """
    Packs retrieved archival candidates into an immutable, structured evidence block.
    Guarantees:
    1. Deterministic 1-based indexing [Source 1], [Source 2] ...
    2. Strict token budgeting within MAX_CONTEXT_TOKENS
    3. Minimum evidence score threshold filtering
    4. Accurate provenance tracking in a lookup map for validation
    """

    def __init__(
        self,
        max_context_tokens: int = 4096,
        max_evidence_chunks: int = 5,
        min_score: float = 0.005
    ):
        self.max_context_tokens = max_context_tokens
        self.max_evidence_chunks = max_evidence_chunks
        self.min_score = min_score

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Rough token estimation (1 token ~ 4 chars for English/Latin, ~2 chars for Indic)."""
        if not text:
            return 0
        return max(1, len(text) // 4)

    def build_context(
        self,
        candidates: List[Dict[str, Any]],
        query: str
    ) -> Tuple[str, Dict[int, Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Builds the formatted evidence string and the source mapping.
        
        Returns:
            formatted_text: str (ready to be inserted into prompt)
            source_map: Dict[int, Dict[str, Any]] (1-based index -> chunk info)
            selected_candidates: List[Dict[str, Any]]
        """
        if not candidates:
            return "", {}, []

        # 1. Filter candidates below minimum score threshold
        filtered_candidates = [
            c for c in candidates
            if float(c.get("score", 0.0) or 0.0) >= self.min_score
        ]

        if not filtered_candidates:
            logger.info(
                f"No candidates passed minimum score threshold ({self.min_score}). "
                f"Candidate count before filter: {len(candidates)}"
            )
            return "", {}, []

        # 2. Limit to max_evidence_chunks
        selected = filtered_candidates[:self.max_evidence_chunks]

        # 3. Format each source and track token budget
        source_blocks = []
        source_map: Dict[int, Dict[str, Any]] = {}
        total_tokens = 0
        # Reserve ~500 tokens for system prompt and formatting wrapper
        budget_limit = max(500, self.max_context_tokens - 500)

        for idx, cand in enumerate(selected, start=1):
            chunk_id = cand.get("chunk_id")
            doc_id = cand.get("document_id")
            archive_id = cand.get("archive_id", "UNKNOWN")
            doc_title = cand.get("document_title") or cand.get("title") or "Untitled Document"
            creator = cand.get("creator") or "Dr. B.R. Ambedkar"
            year = cand.get("year") or "Undated"
            page_no = cand.get("page_number")
            folio_no = cand.get("folio_number")
            raw_text = (cand.get("chunk_text") or "").strip()
            layer = cand.get("transcription_layer") or "UNKNOWN"
            is_verified = cand.get("is_verified", False)

            page_label = f"Page {page_no}" if page_no else "Page N/A"
            if folio_no:
                page_label += f" [Folio {folio_no}]"

            layer_status = "APPROVED ARCHIVAL TEXT" if is_verified else f"MACHINE-GENERATED / UNVERIFIED OCR ({layer})"

            # Build source block
            block = (
                f"[Source {idx}]\n"
                f"Archive Reference: {archive_id} (Document ID: {doc_id})\n"
                f"Title: {doc_title}\n"
                f"Author/Creator: {creator}\n"
                f"Year: {year}\n"
                f"Location: {page_label}\n"
                f"Archival Status: {layer_status}\n"
                f"Citation Reference: {cand.get('citation', archive_id)}\n"
                f"Archival Text:\n"
                f"\"\"\"\n{raw_text}\n\"\"\"\n"
            )

            block_tokens = self.estimate_tokens(block)
            if total_tokens + block_tokens > budget_limit and source_blocks:
                # Exceeded context budget, stop adding more blocks
                logger.warning(
                    f"Context token limit reached ({total_tokens}/{budget_limit}). "
                    f"Stopping at source {idx-1}."
                )
                break

            total_tokens += block_tokens
            source_blocks.append(block)

            # Store in source_map with all metadata needed for citation & provenance
            source_map[idx] = {
                "source_index": idx,
                "chunk_id": chunk_id,
                "document_id": doc_id,
                "archive_id": archive_id,
                "document_title": doc_title,
                "creator": creator,
                "year": year,
                "page_number": page_no,
                "folio_number": folio_no,
                "document_version_id": cand.get("document_version_id"),
                "ocr_page_id": cand.get("ocr_page_id"),
                "ocr_text_version_id": cand.get("ocr_text_version_id"),
                "transcription_layer": layer,
                "is_verified": is_verified,
                "score": cand.get("score"),
                "citation": cand.get("citation"),
                "chunk_text": raw_text
            }

        formatted_context = "\n----------------------------------------\n".join(source_blocks)
        actually_selected = [cand for i, cand in enumerate(selected, start=1) if i in source_map]

        return formatted_context, source_map, actually_selected
