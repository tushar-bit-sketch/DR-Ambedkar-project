"""
Media & Timestamped Transcript Search Service.
Supports catalog search, full-text transcript search, and timestamp navigation.
Strictly enforces server-side RBAC access control.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.models import MediaAsset, MediaTranscript, TranscriptSegment


class MediaSearchService:
    @classmethod
    def search_media(
        cls,
        db: Session,
        query: Optional[str] = None,
        media_type: Optional[str] = None,
        collection_id: Optional[int] = None,
        access_level: str = "PUBLIC",
        limit: int = 20,
        include_unverified: bool = False
    ) -> List[MediaAsset]:
        q = db.query(MediaAsset)

        # 1. RBAC access control
        if access_level == "PUBLIC":
            q = q.filter(MediaAsset.access_level == "PUBLIC")
        elif access_level == "RESEARCH_ONLY":
            q = q.filter(MediaAsset.access_level.in_(["PUBLIC", "RESEARCH_ONLY"]))
        # ALL or ADMIN allows unrestricted

        # 2. Verification status
        if not include_unverified:
            q = q.filter(MediaAsset.verification_status.in_(["VERIFIED", "APPROVED"]))

        # 3. Media type filter
        if media_type and media_type.upper() != "ALL":
            q = q.filter(MediaAsset.media_type == media_type.upper())

        # 4. Collection filter
        if collection_id is not None:
            q = q.filter(MediaAsset.collection_id == collection_id)

        # 5. Text query across archival metadata
        if query and query.strip():
            clean_q = f"%{query.strip()}%"
            q = q.filter(
                or_(
                    MediaAsset.title.ilike(clean_q),
                    MediaAsset.subtitle.ilike(clean_q),
                    MediaAsset.description.ilike(clean_q),
                    MediaAsset.creator.ilike(clean_q),
                    MediaAsset.location.ilike(clean_q),
                    MediaAsset.archive_id.ilike(clean_q)
                )
            )

        return q.order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc()).limit(limit).all()

    @classmethod
    def search_media_transcript_segments(
        cls,
        db: Session,
        query: str,
        limit: int = 20,
        access_level: str = "PUBLIC"
    ) -> List[Dict[str, Any]]:
        """
        Searches transcript segments for text matches.
        Returns matching segments with exact start/end timestamps and media asset titles.
        """
        if not query or not query.strip():
            return []

        clean_q = f"%{query.strip()}%"
        q = (
            db.query(TranscriptSegment, MediaTranscript, MediaAsset)
            .join(MediaTranscript, TranscriptSegment.transcript_id == MediaTranscript.id)
            .join(MediaAsset, MediaTranscript.media_id == MediaAsset.id)
            .filter(TranscriptSegment.text.ilike(clean_q))
        )

        # RBAC
        if access_level == "PUBLIC":
            q = q.filter(MediaAsset.access_level == "PUBLIC")
        elif access_level == "RESEARCH_ONLY":
            q = q.filter(MediaAsset.access_level.in_(["PUBLIC", "RESEARCH_ONLY"]))

        results = q.order_by(TranscriptSegment.confidence.desc(), TranscriptSegment.id.asc()).limit(limit).all()

        output = []
        for seg, trans, asset in results:
            snippet = seg.text
            output.append({
                "media_id": asset.id,
                "archive_id": asset.archive_id,
                "media_title": asset.title,
                "media_type": asset.media_type,
                "segment_id": seg.id,
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "start_timestamp_str": seg.start_timestamp_str,
                "end_timestamp_str": seg.end_timestamp_str,
                "speaker_label": seg.speaker_label,
                "confidence": seg.confidence,
                "snippet": snippet,
                "matching_text": seg.text
            })

        return output
