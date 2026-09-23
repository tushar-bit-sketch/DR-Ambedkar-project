"""
Provenance Verification and Chain Resolution API.
Resolves full unbroken provenance pathways from Graph Entities/Relationships
back to Document -> Version -> OCR -> Page -> Chunk -> Physical Archival Repository.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    GraphRelationship, GraphEntity, Document, DocumentVersion,
    OCRPage, OCRTextVersion, SearchChunk, ArchivalFile, Collection
)
from app.schemas.graph import ProvenanceChainOut, GraphRelationshipOut
from app.services.graph.repository.factory import get_graph_repository

router = APIRouter()

@router.get("/relationship/{rel_id}", response_model=ProvenanceChainOut)
def get_relationship_provenance(
    rel_id: int,
    db: Session = Depends(get_db)
):
    repo = get_graph_repository(db)
    rel_dict = repo.get_relationship(rel_id)
    if not rel_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relationship #{rel_id} not found.")

    doc_info = None
    doc_ver_info = None
    ocr_page_info = None
    ocr_text_ver_info = None
    chunk_info = None
    source_info = None

    # Resolve document
    doc_id = rel_dict.get("source_document_id")
    if doc_id:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc_info = {
                "id": doc.id,
                "archive_id": doc.archive_id,
                "title": doc.title,
                "document_type": doc.document_type,
                "verification_status": doc.verification_status,
                "source_institution": getattr(doc, "source_name", None)
            }
            if doc.collection:
                source_info = {
                    "collection_name": doc.collection.name,
                    "source": doc.collection.source,
                    "archive_reference": doc.archive_id
                }

    # Resolve document version
    doc_ver_id = rel_dict.get("document_version_id")
    if doc_ver_id:
        dver = db.query(DocumentVersion).filter(DocumentVersion.id == doc_ver_id).first()
        if dver:
            doc_ver_info = {
                "id": dver.id,
                "version_number": dver.version_number,
                "change_summary": getattr(dver, "change_description", None)
            }

    # Resolve OCR page
    page_id = rel_dict.get("page_id")
    if page_id:
        opage = db.query(OCRPage).filter(OCRPage.id == page_id).first()
        if opage:
            ocr_page_info = {
                "id": opage.id,
                "page_number": opage.page_number,
                "review_status": getattr(opage, "status", None),
                "confidence_score": getattr(opage, "confidence", 0.0)
            }

    # Resolve OCR text version
    ocr_tver_id = rel_dict.get("ocr_text_version_id")
    if ocr_tver_id:
        tver = db.query(OCRTextVersion).filter(OCRTextVersion.id == ocr_tver_id).first()
        if tver:
            ocr_text_ver_info = {
                "id": tver.id,
                "version_number": tver.version_number,
                "engine": tver.engine,
                "language": tver.language
            }

    # Resolve search chunk
    chunk_id = rel_dict.get("chunk_id")
    if chunk_id:
        chunk = db.query(SearchChunk).filter(SearchChunk.id == chunk_id).first()
        if chunk:
            chunk_info = {
                "id": chunk.id,
                "chunk_index": getattr(chunk, "chunk_sequence", 0),
                "token_count": chunk.token_count
            }

    return ProvenanceChainOut(
        claim_id=rel_id,
        relationship=rel_dict,
        document=doc_info,
        document_version=doc_ver_info,
        ocr_page=ocr_page_info,
        ocr_text_version=ocr_text_ver_info,
        search_chunk=chunk_info,
        physical_source=source_info,
        verification_status=rel_dict.get("verification_status", "APPROVED"),
        provenance_classification=rel_dict.get("provenance_type", "EXPLICIT_SOURCE_RELATION")
    )
