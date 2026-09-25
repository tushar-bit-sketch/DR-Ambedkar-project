import logging
import re
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text

from app.core.config import settings
from app.db.models import Document, DocumentVersion, OCRPage, OCRTextVersion, SearchChunk, Collection, User
from app.services.search.embeddings.base import BaseEmbeddingProvider
from app.services.search.embeddings.bge_m3 import BGE_M3_EmbeddingProvider
from app.services.search.reranker import BaseRerankerProvider, BGERerankerProvider
from app.services.search.vector_store.base import BaseVectorStore
from app.services.search.vector_store.factory import get_vector_store

logger = logging.getLogger("archive.search.retrieval_engine")

class ArchivalRetrievalEngine:
    """
    Multilingual Archival Retrieval Engine implementing:
    1. SQL Keyword Retrieval with exact phrase & term matching
    2. Dense Vector Semantic Retrieval via BGE-M3 & Vector Store
    3. Reciprocal Rank Fusion (RRF k=60)
    4. Cross-Encoder Reranking via BGE-Reranker-v2-m3
    5. Server-side RBAC and Archival Provenance Preservation
    """

    def __init__(
        self,
        db: Session,
        embedding_provider: Optional[BaseEmbeddingProvider] = None,
        reranker_provider: Optional[BaseRerankerProvider] = None,
        vector_store: Optional[BaseVectorStore] = None
    ):
        self.db = db
        self.embedding_provider = embedding_provider or BGE_M3_EmbeddingProvider()
        self.reranker_provider = reranker_provider or BGERerankerProvider()
        self.vector_store = vector_store or get_vector_store(db)

    @staticmethod
    def _is_staff_user(user: Optional[User]) -> bool:
        if not user or not user.role:
            return False
        return user.role.name in ["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]

    def _build_base_filters(self, user: Optional[User], filters: Optional[Dict[str, Any]] = None):
        """Constructs RBAC and metadata query filters."""
        filters = filters or {}
        clauses = [Document.is_deleted == False]

        is_staff = self._is_staff_user(user)
        if not is_staff:
            # Public/Visitor restriction: ONLY verified documents and public access
            clauses.append(Document.verification_status == "VERIFIED")
            clauses.append(Document.access_level == "PUBLIC")
        elif "access_level" in filters and filters["access_level"]:
            clauses.append(Document.access_level == filters["access_level"].upper())

        # Metadata filters
        if filters.get("document_type"):
            clauses.append(Document.document_type == filters["document_type"].upper())
        if filters.get("collection_id"):
            clauses.append(Document.collection_id == int(filters["collection_id"]))
        if filters.get("source_name"):
            clauses.append(Document.source_name.ilike(f"%{filters['source_name']}%"))
        if filters.get("language"):
            clauses.append(Document.language.ilike(f"%{filters['language']}%"))
        if filters.get("year"):
            clauses.append(Document.year == int(filters["year"]))
        if filters.get("year_from"):
            clauses.append(Document.year >= int(filters["year_from"]))
        if filters.get("year_to"):
            clauses.append(Document.year <= int(filters["year_to"]))

        return clauses

    def extract_evidence_snippet(self, text: str, query: str, max_chars: int = 240) -> Dict[str, Any]:
        """
        Extracts relevant passage window around query matches with <mark> tags.
        """
        if not text:
            return {"snippet": "", "matched_terms": [], "char_offset": 0}

        # Normalize search terms
        terms = [re.escape(w.lower()) for w in re.findall(r'\b\w+\b', query) if len(w) > 2]
        if not terms:
            snippet = text[:max_chars].strip() + ("..." if len(text) > max_chars else "")
            return {"snippet": snippet, "matched_terms": [], "char_offset": 0}

        pattern = re.compile(r'(' + '|'.join(terms) + r')', re.IGNORECASE)
        match = pattern.search(text)
        
        if not match:
            snippet = text[:max_chars].strip() + ("..." if len(text) > max_chars else "")
            return {"snippet": snippet, "matched_terms": [], "char_offset": 0}

        match_start = match.start()
        start_pos = max(0, match_start - (max_chars // 2))
        end_pos = min(len(text), start_pos + max_chars)

        raw_snippet = text[start_pos:end_pos].strip()
        highlighted = pattern.sub(r'<mark>\1</mark>', raw_snippet)

        prefix = "..." if start_pos > 0 else ""
        suffix = "..." if end_pos < len(text) else ""

        found_terms = list(set(pattern.findall(raw_snippet)))

        return {
            "snippet": f"{prefix}{highlighted}{suffix}",
            "matched_terms": found_terms,
            "char_offset": start_pos
        }

    def _assemble_candidate_provenance(
        self,
        chunk: SearchChunk,
        doc: Document,
        score: float,
        retrieval_type: str
    ) -> Dict[str, Any]:
        """Assembles standard provenanced search result item."""
        citation = f"Dr. B.R. Ambedkar Digital Heritage Archive, Document #{doc.id} ({doc.archive_id}): '{doc.title}'"
        if chunk.page_number:
            citation += f", Page {chunk.page_number}"
        if chunk.folio_number:
            citation += f" [{chunk.folio_number}]"

        return {
            "chunk_id": chunk.id,
            "chunk_sequence": chunk.chunk_sequence,
            "page_number": chunk.page_number,
            "folio_number": chunk.folio_number,
            "char_start": chunk.char_start,
            "char_end": chunk.char_end,
            "token_count": chunk.token_count,
            "chunk_text": chunk.chunk_text,
            "transcription_layer": chunk.transcription_layer or "MACHINE_UNVERIFIED",
            "is_verified": bool(chunk.is_verified),
            "document_id": doc.id,
            "archive_id": doc.archive_id,
            "title": doc.title,
            "document_title": doc.title,
            "document_type": doc.document_type,
            "creator": doc.creator or "Dr. B.R. Ambedkar",
            "year": doc.year,
            "language": doc.language,
            "collection_id": doc.collection_id,
            "collection_title": doc.collection.title if doc.collection else None,
            "source_id": doc.source_identifier,
            "source_name": doc.source_name or "Archival Repository",
            "document_version_id": chunk.document_version_id,
            "ocr_page_id": chunk.ocr_page_id,
            "ocr_text_version_id": chunk.ocr_text_version_id,
            "verification_status": doc.verification_status,
            "access_level": doc.access_level,
            "citation": citation,
            "retrieval_type": retrieval_type,
            "score": score
        }

    def keyword_search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Executes SQL-based keyword search across SearchChunks joined with Documents.
        Scores results by matching relevance (exact phrase > term frequency > document title).
        """
        filters = filters or {}
        q_clean = query.strip()
        doc_filters = self._build_base_filters(user, filters)
        is_staff = self._is_staff_user(user)

        # Build chunk clauses
        chunk_clauses = [SearchChunk.status == "INDEXED"]
        if not is_staff:
            # Public users: only verified chunks from verified documents
            chunk_clauses.append(SearchChunk.is_verified == True)

        if not q_clean:
            # Browse/Filter mode: return matching verified archival holdings
            rows = (
                self.db.query(SearchChunk, Document)
                .join(Document, SearchChunk.document_id == Document.id)
                .filter(*doc_filters)
                .filter(*chunk_clauses)
                .order_by(Document.year.desc(), SearchChunk.id.asc())
                .limit(limit)
                .all()
            )
            candidates = []
            for chunk, doc in rows:
                c = self._assemble_candidate_provenance(chunk, doc, score=1.0, retrieval_type="CATALOG")
                c["keyword_rank"] = len(candidates) + 1
                c["keyword_score"] = 1.0
                candidates.append(c)
            return candidates

        # Keyword matching pattern with stop-word filtering
        STOP_WORDS = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "as", "is", "are", "was", "were", "it", "its", "that", "this", "these", "those"}
        all_terms = [w.strip() for w in re.findall(r'\b\w+\b', q_clean) if len(w.strip()) > 1]
        content_terms = [t for t in all_terms if t.lower() not in STOP_WORDS]
        terms = content_terms if content_terms else all_terms
        
        # Build search expressions
        like_expressions = []
        for t in terms:
            pat = f"%{t}%"
            like_expressions.append(SearchChunk.chunk_text.ilike(pat))
            like_expressions.append(Document.title.ilike(pat))
            like_expressions.append(Document.keywords.ilike(pat))

        # Query chunks joined with Document
        sql_query = (
            self.db.query(SearchChunk, Document)
            .join(Document, SearchChunk.document_id == Document.id)
            .filter(*doc_filters)
            .filter(*chunk_clauses)
        )

        if like_expressions:
            sql_query = sql_query.filter(or_(*like_expressions))
        else:
            return []

        rows = sql_query.limit(limit * 3).all()

        scored_candidates = []
        q_lower = q_clean.lower()
        found_doc_ids = set()

        for chunk, doc in rows:
            found_doc_ids.add(doc.id)
            text_lower = (chunk.chunk_text or "").lower()
            title_lower = (doc.title or "").lower()

            # Relevance scoring
            score = 0.0
            if q_lower in text_lower:
                score += 5.0  # Exact phrase match in passage
            if q_lower in title_lower:
                score += 3.0  # Exact phrase match in title

            # Term overlap (requiring word boundary for short terms)
            term_matches = sum(1 for t in terms if re.search(rf'\b{re.escape(t.lower())}\b', text_lower))
            score += term_matches * 1.0

            # If multi-term query (>= 3 terms) without phrase match, require at least 2 matching terms or >= 35% overlap
            if len(terms) >= 3 and q_lower not in text_lower and q_lower not in title_lower:
                if term_matches < 2 and (term_matches / len(terms)) < 0.35:
                    score = 0.0

            if score > 0:
                cand = self._assemble_candidate_provenance(chunk, doc, score, "KEYWORD")
                cand["keyword_score"] = round(score, 4)
                scored_candidates.append(cand)

        # Also support matching catalog documents that do not have separate SearchChunk rows yet
        doc_pat_exprs = []
        for t in terms:
            pat = f"%{t}%"
            doc_pat_exprs.append(Document.title.ilike(pat))
            doc_pat_exprs.append(Document.keywords.ilike(pat))
            doc_pat_exprs.append(Document.description.ilike(pat))
            doc_pat_exprs.append(Document.creator.ilike(pat))
            doc_pat_exprs.append(Document.archive_id.ilike(pat))

        if doc_pat_exprs:
            doc_query = self.db.query(Document).filter(*doc_filters).filter(or_(*doc_pat_exprs))
            if found_doc_ids:
                doc_query = doc_query.filter(~Document.id.in_(found_doc_ids))
            
            fallback_docs = doc_query.limit(limit).all()
            for fdoc in fallback_docs:
                desc_text = fdoc.description or fdoc.title
                title_lower = (fdoc.title or "").lower()
                desc_lower = desc_text.lower()
                
                score = 0.0
                if q_lower in title_lower:
                    score += 4.0
                if q_lower in desc_lower:
                    score += 2.0
                term_matches = sum(1 for t in terms if re.search(rf'\b{re.escape(t.lower())}\b', desc_lower) or re.search(rf'\b{re.escape(t.lower())}\b', title_lower))
                score += term_matches * 1.0

                if len(terms) >= 3 and q_lower not in title_lower and q_lower not in desc_lower:
                    if term_matches < 2 and (term_matches / len(terms)) < 0.35:
                        score = 0.0

                if score <= 0:
                    continue

                cand = {
                    "chunk_id": -(fdoc.id),
                    "chunk_sequence": 1,
                    "page_number": 1,
                    "folio_number": "Folio #1",
                    "char_start": 0,
                    "char_end": len(desc_text),
                    "token_count": len(desc_text.split()),
                    "chunk_text": desc_text,
                    "transcription_layer": "CATALOG_METADATA",
                    "is_verified": (fdoc.verification_status == "VERIFIED"),
                    "document_id": fdoc.id,
                    "archive_id": fdoc.archive_id,
                    "title": fdoc.title,
                    "document_title": fdoc.title,
                    "document_type": fdoc.document_type,
                    "creator": fdoc.creator or "Dr. B.R. Ambedkar",
                    "year": fdoc.year,
                    "language": fdoc.language,
                    "collection_id": fdoc.collection_id,
                    "collection_title": fdoc.collection.title if fdoc.collection else None,
                    "source_id": fdoc.source_identifier,
                    "source_name": fdoc.source_name or "Archival Repository",
                    "document_version_id": None,
                    "ocr_page_id": None,
                    "ocr_text_version_id": None,
                    "verification_status": fdoc.verification_status,
                    "access_level": fdoc.access_level,
                    "citation": f"Dr. B.R. Ambedkar Digital Heritage Archive, Document #{fdoc.id} ({fdoc.archive_id}): '{fdoc.title}'",
                    "retrieval_type": "KEYWORD",
                    "score": round(score, 4),
                    "keyword_score": round(score, 4)
                }
                scored_candidates.append(cand)

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x["keyword_score"], reverse=True)
        
        # Assign 1-based keyword ranks
        for rank_idx, cand in enumerate(scored_candidates[:limit], start=1):
            cand["keyword_rank"] = rank_idx

        return scored_candidates[:limit]

    def semantic_search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        limit: int = 20
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Executes dense vector similarity search using BGE-M3 and the configured vector store.
        If BGE-M3 is unavailable, reports MODEL_UNAVAILABLE without fake embeddings.
        """
        filters = filters or {}
        q_clean = query.strip()
        
        diagnostics = {
            "backend": self.vector_store.backend_name,
            "is_production": self.vector_store.is_production_grade,
            "model_name": self.embedding_provider.model_name,
            "model_status": self.embedding_provider.status,
            "model_dimension": self.embedding_provider.dimension
        }

        if not self.embedding_provider.is_available:
            diagnostics["status"] = "MODEL_UNAVAILABLE"
            diagnostics["error"] = self.embedding_provider.get_diagnostics()
            logger.warning("Semantic search requested but embedding provider is unavailable.")
            return [], diagnostics

        try:
            # Generate query embedding vector
            q_vector = self.embedding_provider.embed_query(q_clean)
        except Exception as e:
            diagnostics["status"] = "EMBEDDING_ERROR"
            diagnostics["error"] = str(e)
            logger.error(f"Failed to embed search query: {e}")
            return [], diagnostics

        # Pre-filter candidate chunk IDs based on RBAC and metadata
        doc_filters = self._build_base_filters(user, filters)
        is_staff = self._is_staff_user(user)

        chunk_query = (
            self.db.query(SearchChunk.id)
            .join(Document, SearchChunk.document_id == Document.id)
            .filter(*doc_filters)
            .filter(SearchChunk.status == "INDEXED")
        )
        if not is_staff:
            chunk_query = chunk_query.filter(SearchChunk.is_verified == True)

        eligible_chunk_ids = [row[0] for row in chunk_query.all()]
        if not eligible_chunk_ids:
            diagnostics["status"] = "NO_ELIGIBLE_CHUNKS"
            return [], diagnostics

        # Query vector store
        similarity_results = self.vector_store.search_similarity(
            query_vector=q_vector,
            top_k=limit,
            candidate_chunk_ids=eligible_chunk_ids
        )

        if not similarity_results:
            diagnostics["status"] = "ZERO_VECTOR_MATCHES"
            return [], diagnostics

        # Fetch chunk details for matching vectors
        chunk_id_map = {cid: score for cid, score in similarity_results}
        matched_chunks = (
            self.db.query(SearchChunk, Document)
            .join(Document, SearchChunk.document_id == Document.id)
            .filter(SearchChunk.id.in_(list(chunk_id_map.keys())))
            .all()
        )

        candidates = []
        for chunk, doc in matched_chunks:
            cos_score = chunk_id_map.get(chunk.id, 0.0)
            cand = self._assemble_candidate_provenance(chunk, doc, cos_score, "SEMANTIC")
            cand["semantic_score"] = round(cos_score, 5)
            candidates.append(cand)

        # Sort descending by semantic similarity score
        candidates.sort(key=lambda x: x["semantic_score"], reverse=True)

        for rank_idx, cand in enumerate(candidates, start=1):
            cand["semantic_rank"] = rank_idx

        diagnostics["status"] = "OPERATIONAL"
        diagnostics["candidates_retrieved"] = len(candidates)
        return candidates, diagnostics

    def reciprocal_rank_fusion(
        self,
        keyword_candidates: List[Dict[str, Any]],
        semantic_candidates: List[Dict[str, Any]],
        k: int = 60,
        weight_kw: float = 1.0,
        weight_sem: float = 1.0
    ) -> List[Dict[str, Any]]:
        """
        Merges keyword and semantic candidate lists using Reciprocal Rank Fusion:
        RRF(d) = weight_kw / (k + rank_kw(d)) + weight_sem / (k + rank_sem(d))
        """
        combined: Dict[int, Dict[str, Any]] = {}

        # Process keyword candidates
        for cand in keyword_candidates:
            cid = cand.get("chunk_id")
            combined[cid] = dict(cand)
            combined[cid]["semantic_rank"] = None
            combined[cid]["semantic_score"] = None
            kw_rank = cand.get("keyword_rank", 1)
            rrf = weight_kw / (k + kw_rank)
            combined[cid]["rrf_score"] = rrf
            combined[cid]["retrieval_type"] = "KEYWORD"

        # Process semantic candidates
        for cand in semantic_candidates:
            cid = cand.get("chunk_id")
            sem_rank = cand.get("semantic_rank", 1)
            if cid in combined:
                # Candidate present in both retrieval channels
                existing = combined[cid]
                existing["semantic_rank"] = sem_rank
                existing["semantic_score"] = cand.get("semantic_score")
                existing["rrf_score"] += weight_sem / (k + sem_rank)
                existing["retrieval_type"] = "HYBRID"
            else:
                new_cand = dict(cand)
                new_cand["keyword_rank"] = None
                new_cand["keyword_score"] = None
                rrf = weight_sem / (k + sem_rank)
                new_cand["rrf_score"] = rrf
                new_cand["retrieval_type"] = "SEMANTIC"
                combined[cid] = new_cand

        fused = list(combined.values())
        fused.sort(key=lambda x: x["rrf_score"], reverse=True)

        for idx, item in enumerate(fused, start=1):
            item["fusion_rank"] = idx
            item["score"] = round(item["rrf_score"], 6)

        return fused

    def rerank_candidates(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 10
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Cross-encoder reranker stage via BGE Reranker v2-m3.
        If reranker is unavailable, maintains RRF fusion order with clear diagnostics.
        """
        diagnostics = self.reranker_provider.get_diagnostics()

        if not candidates:
            return [], diagnostics

        # Send candidates to reranker
        reranked = self.reranker_provider.rerank(query, candidates, top_k=top_k)
        return reranked, diagnostics

    def search(
        self,
        query: str,
        mode: str = "hybrid",
        filters: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        Orchestrates full archival search pipeline:
        mode: "hybrid" | "keyword" | "semantic"
        """
        filters = filters or {}
        q_clean = query.strip() if query else ""

        retrieval_diagnostics = {
            "mode": mode,
            "query": q_clean,
            "page": page,
            "page_size": page_size,
            "applied_filters": filters,
            "vector_backend": self.vector_store.backend_name,
            "is_vector_production": self.vector_store.is_production_grade
        }

        if not q_clean:
            candidates = self.keyword_search(query="", filters=filters, user=user, limit=max(page * page_size * 2, 60))
            for item in candidates:
                snip_info = self.extract_evidence_snippet(item["chunk_text"], "")
                item["highlighted_snippet"] = snip_info["snippet"]
                item["matched_terms"] = []

            total = len(candidates)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paged_items = candidates[start_idx:end_idx]
            facets = self._compute_facets(candidates)

            return {
                "query": "",
                "mode": mode,
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": paged_items,
                "facets": facets,
                "diagnostics": retrieval_diagnostics
            }

        top_k_retrieval = settings.SEARCH_TOP_K_RETRIEVAL or 20
        top_k_rerank = settings.SEARCH_TOP_K_RERANK or 10

        keyword_candidates: List[Dict[str, Any]] = []
        semantic_candidates: List[Dict[str, Any]] = []

        if mode in ["keyword", "hybrid"]:
            keyword_candidates = self.keyword_search(
                query=q_clean,
                filters=filters,
                user=user,
                limit=top_k_retrieval
            )
            retrieval_diagnostics["keyword_count"] = len(keyword_candidates)

        if mode in ["semantic", "hybrid"]:
            semantic_candidates, sem_diag = self.semantic_search(
                query=q_clean,
                filters=filters,
                user=user,
                limit=top_k_retrieval
            )
            retrieval_diagnostics["semantic_diagnostics"] = sem_diag
            retrieval_diagnostics["semantic_count"] = len(semantic_candidates)

        # FUSION & RANKING
        if mode == "keyword":
            fused_candidates = keyword_candidates
        elif mode == "semantic":
            fused_candidates = semantic_candidates
        else: # Hybrid
            fused_candidates = self.reciprocal_rank_fusion(
                keyword_candidates=keyword_candidates,
                semantic_candidates=semantic_candidates,
                k=settings.RRF_K
            )

        # RERANKING STAGE
        reranked_candidates, rerank_diag = self.rerank_candidates(
            query=q_clean,
            candidates=fused_candidates[:top_k_rerank],
            top_k=top_k_rerank
        )
        retrieval_diagnostics["reranker_diagnostics"] = rerank_diag

        # Remaining candidates past reranker limit keep their fused rank
        remaining_candidates = fused_candidates[top_k_rerank:]
        all_ordered_candidates = reranked_candidates + remaining_candidates

        # Compute Evidence Snippets and Highlighting for final results
        for item in all_ordered_candidates:
            snip_info = self.extract_evidence_snippet(item["chunk_text"], q_clean)
            item["highlighted_snippet"] = snip_info["snippet"]
            item["matched_terms"] = snip_info["matched_terms"]

        # Pagination
        total = len(all_ordered_candidates)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paged_items = all_ordered_candidates[start_idx:end_idx]

        # Compute archival facets
        facets = self._compute_facets(all_ordered_candidates)

        return {
            "query": q_clean,
            "mode": mode,
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": paged_items,
            "facets": facets,
            "diagnostics": retrieval_diagnostics
        }

    @staticmethod
    def _compute_facets(candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Computes aggregate distribution facets for search refinement."""
        doc_types: Dict[str, int] = {}
        collections: Dict[str, int] = {}
        languages: Dict[str, int] = {}
        years: Dict[str, int] = {}
        transcription_layers: Dict[str, int] = {}

        for c in candidates:
            dt = c.get("document_type") or "UNKNOWN"
            doc_types[dt] = doc_types.get(dt, 0) + 1

            col = c.get("collection_title") or "General"
            collections[col] = collections.get(col, 0) + 1

            lang = c.get("language") or "English"
            languages[lang] = languages.get(lang, 0) + 1

            if c.get("year"):
                y_str = str(c["year"])
                years[y_str] = years.get(y_str, 0) + 1

            layer = c.get("transcription_layer") or "UNKNOWN"
            transcription_layers[layer] = transcription_layers.get(layer, 0) + 1

        return {
            "document_types": doc_types,
            "collections": collections,
            "languages": languages,
            "years": years,
            "transcription_layers": transcription_layers
        }
