import hashlib
import re
from typing import List, Dict, Any, Optional
from app.db.models import Document, DocumentVersion, OCRPage, OCRTextVersion, OCRBlock

class ArchivalChunker:
    """
    Deterministic archival chunker preserving unbroken provenance:
    Document -> DocumentVersion -> OCRTextVersion -> OCRPage -> OCRBlock -> SearchChunk.
    """

    TARGET_CHUNK_WORDS = 350
    CHUNK_OVERLAP_WORDS = 50

    @classmethod
    def chunk_document_folios(
        cls,
        document: Document,
        document_version: Optional[DocumentVersion],
        pages: List[OCRPage],
        approved_version_map: Optional[Dict[int, OCRTextVersion]] = None
    ) -> List[Dict[str, Any]]:
        """
        Chunks all folios for an archival document.
        Preserves page/folio numbers, character boundaries, content hashes, and verification metadata.
        """
        chunks: List[Dict[str, Any]] = []
        chunk_seq = 0

        # Sort pages in folio sequence
        sorted_pages = sorted(pages, key=lambda p: p.page_number)

        for page in sorted_pages:
            # Check for approved or latest human-corrected text version
            text_ver = approved_version_map.get(page.id) if approved_version_map else None
            if not text_ver and page.versions:
                # Get latest version
                text_ver = sorted(page.versions, key=lambda v: v.version_number, reverse=True)[0]

            raw_text = text_ver.text if text_ver else (page.cleaned_text or page.raw_text or "")
            clean_text = raw_text.strip()
            if not clean_text:
                continue

            # Determine verification layer
            is_approved = (page.status == "APPROVED" or document.verification_status == "VERIFIED")
            layer_label = "HUMAN_REVIEWED" if (text_ver and text_ver.version_number > 1) or is_approved else "MACHINE_UNVERIFIED"

            page_chunks = cls._chunk_single_page(
                text=clean_text,
                page_number=page.page_number,
                document=document,
                document_version=document_version,
                ocr_page=page,
                ocr_text_version=text_ver,
                is_verified=is_approved,
                layer_label=layer_label,
                start_seq=chunk_seq
            )
            chunks.extend(page_chunks)
            chunk_seq += len(page_chunks)

        return chunks

    @classmethod
    def _chunk_single_page(
        cls,
        text: str,
        page_number: int,
        document: Document,
        document_version: Optional[DocumentVersion],
        ocr_page: Optional[OCRPage],
        ocr_text_version: Optional[OCRTextVersion],
        is_verified: bool,
        layer_label: str,
        start_seq: int
    ) -> List[Dict[str, Any]]:
        """Splits page text into coherent semantic passages with overlap."""
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [text.strip()]

        # Combine paragraphs into chunks up to TARGET_CHUNK_WORDS
        chunk_list: List[Dict[str, Any]] = []
        current_paragraphs: List[str] = []
        current_word_count = 0
        current_char_start = 0

        for para in paragraphs:
            words = para.split()
            para_word_count = len(words)

            if current_word_count + para_word_count > cls.TARGET_CHUNK_WORDS and current_paragraphs:
                # Flush chunk
                chunk_str = "\n\n".join(current_paragraphs)
                content_hash = hashlib.sha256(chunk_str.strip().encode("utf-8")).hexdigest()
                char_end = current_char_start + len(chunk_str)

                chunk_list.append({
                    "document_id": document.id,
                    "document_version_id": document_version.id if document_version else None,
                    "ocr_text_version_id": ocr_text_version.id if ocr_text_version else None,
                    "ocr_page_id": ocr_page.id if ocr_page else None,
                    "ocr_block_id": None,
                    "chunk_sequence": start_seq + len(chunk_list),
                    "page_number": page_number,
                    "folio_number": f"Folio #{page_number}",
                    "chunk_text": chunk_str,
                    "char_start": current_char_start,
                    "char_end": char_end,
                    "token_count": len(chunk_str.split()),
                    "content_hash": content_hash,
                    "is_verified": is_verified,
                    "transcription_layer": layer_label
                })

                # Maintain semantic overlap
                overlap_text = current_paragraphs[-1] if len(current_paragraphs) > 1 else ""
                current_paragraphs = [overlap_text, para] if overlap_text else [para]
                current_word_count = len(" ".join(current_paragraphs).split())
                current_char_start = max(0, char_end - len(overlap_text))
            else:
                current_paragraphs.append(para)
                current_word_count += para_word_count

        # Final trailing chunk
        if current_paragraphs:
            chunk_str = "\n\n".join(current_paragraphs)
            content_hash = hashlib.sha256(chunk_str.strip().encode("utf-8")).hexdigest()
            char_end = current_char_start + len(chunk_str)

            chunk_list.append({
                "document_id": document.id,
                "document_version_id": document_version.id if document_version else None,
                "ocr_text_version_id": ocr_text_version.id if ocr_text_version else None,
                "ocr_page_id": ocr_page.id if ocr_page else None,
                "ocr_block_id": None,
                "chunk_sequence": start_seq + len(chunk_list),
                "page_number": page_number,
                "folio_number": f"Folio #{page_number}",
                "chunk_text": chunk_str,
                "char_start": current_char_start,
                "char_end": char_end,
                "token_count": len(chunk_str.split()),
                "content_hash": content_hash,
                "is_verified": is_verified,
                "transcription_layer": layer_label
            })

        return chunk_list
