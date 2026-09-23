import logging
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    Document, DocumentVersion, OCRPage, OCRJob, OCRTextVersion, SearchChunk, SearchIndexJob
)
from app.core.config import settings
from app.services.search.chunker import ArchivalChunker
from app.services.search.embeddings.base import BaseEmbeddingProvider
from app.services.search.embeddings.bge_m3 import BGE_M3_EmbeddingProvider
from app.services.search.vector_store.base import BaseVectorStore
from app.services.search.vector_store.factory import get_vector_store

logger = logging.getLogger("archive.search.indexer")

class ArchivalIndexerService:
    """
    Archival Indexing Service responsible for:
    - Chunking archival documents & OCR text versions
    - Preserving exact folio/page boundaries and provenance
    - Generating BGE-M3 embeddings when model is available
    - Storing vectors in pgvector (production) or sqlite (development fallback)
    - Tracking indexing jobs with granular status and error reporting
    - Strictly preventing fake or random embeddings
    """

    def __init__(
        self,
        db: Session,
        embedding_provider: Optional[BaseEmbeddingProvider] = None,
        vector_store: Optional[BaseVectorStore] = None
    ):
        self.db = db
        self.embedding_provider = embedding_provider or BGE_M3_EmbeddingProvider()
        self.vector_store = vector_store or get_vector_store(db)

    def get_index_status(self) -> Dict[str, Any]:
        """Returns diagnostic metrics and health of the search index."""
        total_chunks = self.db.query(SearchChunk).count()
        indexed_chunks = self.db.query(SearchChunk).filter(SearchChunk.status == "INDEXED").count()
        vectorized_chunks = self.db.query(SearchChunk).filter(
            SearchChunk.status == "INDEXED",
            SearchChunk.embedding_vector.isnot(None)
        ).count()
        verified_chunks = self.db.query(SearchChunk).filter(
            SearchChunk.is_verified == True
        ).count()

        total_docs = self.db.query(Document).filter(Document.is_deleted == False).count()
        indexed_docs = self.db.query(SearchChunk.document_id).distinct().count()

        recent_jobs = (
            self.db.query(SearchIndexJob)
            .order_by(SearchIndexJob.created_at.desc())
            .limit(5)
            .all()
        )

        job_summaries = []
        for job in recent_jobs:
            job_summaries.append({
                "id": job.id,
                "job_type": job.job_type,
                "document_id": job.document_id,
                "status": job.status,
                "total_chunks": job.total_chunks,
                "indexed_chunks": job.indexed_chunks,
                "failed_chunks": job.failed_chunks,
                "embedding_model": job.embedding_model,
                "embedding_dim": job.embedding_dim,
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "error": job.error
            })

        return {
            "total_documents": total_docs,
            "indexed_documents": indexed_docs,
            "total_chunks": total_chunks,
            "indexed_chunks": indexed_chunks,
            "vectorized_chunks": vectorized_chunks,
            "verified_chunks": verified_chunks,
            "vector_backend": self.vector_store.backend_name,
            "is_vector_backend_production": self.vector_store.is_production_grade,
            "embedding_model_name": self.embedding_provider.model_name,
            "embedding_model_status": self.embedding_provider.status,
            "embedding_dimension": self.embedding_provider.dimension,
            "recent_jobs": job_summaries
        }

    def index_document(self, document_id: int) -> SearchIndexJob:
        """
        Extracts, chunks, and indexes a single archival document.
        Preserves provenance, checks content hashes, and tracks job status.
        """
        doc = self.db.query(Document).filter(Document.id == document_id, Document.is_deleted == False).first()
        if not doc:
            raise ValueError(f"Active Document #{document_id} not found.")

        # Create tracking job
        job = SearchIndexJob(
            document_id=doc.id,
            job_type="DOCUMENT_INDEX",
            status="RUNNING",
            embedding_model=self.embedding_provider.model_name,
            embedding_dim=self.embedding_provider.dimension or 0,
            created_at=datetime.datetime.utcnow()
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        try:
            # 1. Fetch document version and OCR pages
            doc_version = (
                self.db.query(DocumentVersion)
                .filter(DocumentVersion.document_id == doc.id)
                .order_by(DocumentVersion.version_number.desc())
                .first()
            )

            ocr_pages = (
                self.db.query(OCRPage)
                .join(OCRJob, OCRPage.ocr_job_id == OCRJob.id)
                .filter(OCRJob.document_id == doc.id)
                .order_by(OCRPage.page_number.asc())
                .all()
            )

            # Build map of approved/latest text versions
            approved_map: Dict[int, OCRTextVersion] = {}
            for p in ocr_pages:
                latest_ver = (
                    self.db.query(OCRTextVersion)
                    .filter(OCRTextVersion.ocr_page_id == p.id)
                    .order_by(OCRTextVersion.version_number.desc())
                    .first()
                )
                if latest_ver and (p.status == "APPROVED" or latest_ver.version_number > 1):
                    approved_map[p.id] = latest_ver

            # 2. Chunk folios
            chunk_dicts = ArchivalChunker.chunk_document_folios(
                document=doc,
                document_version=doc_version,
                pages=ocr_pages,
                approved_version_map=approved_map
            )

            # Fallback for documents with description/metadata only if no OCR pages exist
            if not chunk_dicts and doc.description:
                chunk_dicts = ArchivalChunker._chunk_single_page(
                    text=f"{doc.title}\n\n{doc.description}",
                    page_number=1,
                    document=doc,
                    document_version=doc_version,
                    ocr_page=None,
                    ocr_text_version=None,
                    is_verified=(doc.verification_status == "VERIFIED"),
                    layer_label="CATALOG_METADATA",
                    start_seq=0
                )

            job.total_chunks = len(chunk_dicts)
            indexed_count = 0
            failed_count = 0

            # 3. Process each chunk
            for c_data in chunk_dicts:
                # Deduplication check: check if chunk with exact content hash exists for this document & page
                existing_chunk = self.db.query(SearchChunk).filter(
                    SearchChunk.document_id == doc.id,
                    SearchChunk.content_hash == c_data["content_hash"],
                    SearchChunk.page_number == c_data["page_number"]
                ).first()

                if existing_chunk:
                    chunk_obj = existing_chunk
                    chunk_obj.status = "INDEXED"
                else:
                    chunk_obj = SearchChunk(
                        document_id=c_data["document_id"],
                        document_version_id=c_data["document_version_id"],
                        ocr_text_version_id=c_data["ocr_text_version_id"],
                        ocr_page_id=c_data["ocr_page_id"],
                        chunk_sequence=c_data["chunk_sequence"],
                        page_number=c_data["page_number"],
                        folio_number=c_data["folio_number"],
                        chunk_text=c_data["chunk_text"],
                        char_start=c_data["char_start"],
                        char_end=c_data["char_end"],
                        token_count=c_data["token_count"],
                        content_hash=c_data["content_hash"],
                        embedding_model=self.embedding_provider.model_name,
                        embedding_version=self.embedding_provider.model_version,
                        is_verified=c_data["is_verified"],
                        transcription_layer=c_data["transcription_layer"],
                        status="PENDING",
                        created_at=datetime.datetime.utcnow()
                    )
                    self.db.add(chunk_obj)
                    self.db.commit()
                    self.db.refresh(chunk_obj)

                # 4. Vector Embedding Generation
                if self.embedding_provider.is_available:
                    try:
                        vector = self.embedding_provider.embed_text(chunk_obj.chunk_text)
                        dim = self.embedding_provider.dimension or len(vector)
                        self.vector_store.store_vector(chunk_obj.id, vector, dim)
                        chunk_obj.embedding_dim = dim
                        chunk_obj.is_normalized = True
                        chunk_obj.status = "INDEXED"
                        indexed_count += 1
                    except Exception as e:
                        logger.error(f"Failed embedding chunk #{chunk_obj.id}: {e}")
                        chunk_obj.status = "FAILED"
                        chunk_obj.error_message = str(e)
                        failed_count += 1
                else:
                    # Model unavailable: mark indexed for keyword search, strictly no fake vector
                    chunk_obj.status = "INDEXED"
                    chunk_obj.embedding_vector = None
                    indexed_count += 1

                self.db.commit()

            job.indexed_chunks = indexed_count
            job.failed_chunks = failed_count
            job.status = "COMPLETED"
            if not self.embedding_provider.is_available:
                job.error = f"BGE-M3 weights unavailable ({self.embedding_provider.status}). Chunks indexed for keyword search only. Zero fake vectors generated."
            job.completed_at = datetime.datetime.utcnow()
            self.db.commit()
            return job

        except Exception as e:
            logger.error(f"Error indexing Document #{document_id}: {e}")
            job.status = "FAILED"
            job.error = str(e)
            job.completed_at = datetime.datetime.utcnow()
            self.db.commit()
            return job

    def reindex_document(self, document_id: int) -> SearchIndexJob:
        """
        Deletes obsolete search chunks for the document and re-indexes freshly.
        """
        # Delete old chunks for this document
        self.db.query(SearchChunk).filter(SearchChunk.document_id == document_id).delete()
        self.db.commit()

        return self.index_document(document_id)

    def rebuild_search_index(self) -> Dict[str, Any]:
        """
        Rebuilds search index across all active documents.
        """
        docs = self.db.query(Document).filter(Document.is_deleted == False).all()
        total = len(docs)
        completed = 0
        failed = 0

        for doc in docs:
            job = self.reindex_document(doc.id)
            if job.status == "COMPLETED":
                completed += 1
            else:
                failed += 1

        return {
            "status": "COMPLETED",
            "total_documents": total,
            "completed_documents": completed,
            "failed_documents": failed,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
