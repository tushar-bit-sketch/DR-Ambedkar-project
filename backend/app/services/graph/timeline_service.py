"""
Intelligent Archival Timeline Service.
Strictly evidence-driven timeline event extraction, date precision parsing,
curator review workflows, and bidirectional Knowledge Graph association.
Enforces: NEVER fabricate exact days from approximate years or dates.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db.models import (
    TimelineEvent, TimelineEventEntity, GraphEntity, Document,
    GraphAuditLog, User
)

logger = logging.getLogger("archive.graph.timeline")

MONTH_NAMES = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "october": 10, "oct": 10,
    "november": 11, "nov": 11, "december": 12, "dec": 12
}

class TimelineService:
    """
    Timeline management and candidate extraction service.
    """

    @classmethod
    def parse_date_precision(cls, raw_date_str: str) -> Tuple[int, Optional[str], str]:
        """
        Parses historical date string and determines strict date precision.
        Returns: (year: int, formatted_date_str: Optional[str], precision: str)

        Precision categories:
        - EXACT_DAY: Full day, month, and year (e.g. 1949-11-25)
        - MONTH: Month and year (e.g. 1949-11)
        - YEAR: Year only (e.g. 1949)
        - DECADE: Decade expression (e.g. 1940s)
        - APPROXIMATE: circa / approximate year (e.g. c. 1927)
        - UNKNOWN: No reliable date
        """
        if not raw_date_str or not raw_date_str.strip():
            return 1950, None, "UNKNOWN"

        s = raw_date_str.strip()

        # 1. Decade check: "1940s", "1930's"
        decade_m = re.search(r'\b(1[89]\d{2})s\b', s, re.IGNORECASE)
        if decade_m:
            yr = int(decade_m.group(1))
            return yr, f"{yr}s", "DECADE"

        # 2. Approximate check: "c. 1927", "circa 1927", "approx. 1927"
        approx_m = re.search(r'\b(?:c\.?|circa|approx\.?)\s*(1[89]\d{2})\b', s, re.IGNORECASE)
        if approx_m:
            yr = int(approx_m.group(1))
            return yr, f"c. {yr}", "APPROXIMATE"

        # 3. Exact Day check: e.g. "25th November 1949", "November 25, 1949", "1949-11-25"
        # ISO format: YYYY-MM-DD
        iso_m = re.search(r'\b(1[89]\d{2})-(\d{1,2})-(\d{1,2})\b', s)
        if iso_m:
            yr = int(iso_m.group(1))
            mo = int(iso_m.group(2))
            day = int(iso_m.group(3))
            return yr, f"{yr:04d}-{mo:02d}-{day:02d}", "EXACT_DAY"

        # Text format: "25th November 1949" or "25 November 1949"
        d_m_y = re.search(r'\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(1[89]\d{2})\b', s)
        if d_m_y:
            day = int(d_m_y.group(1))
            m_str = d_m_y.group(2).lower()
            yr = int(d_m_y.group(3))
            if m_str in MONTH_NAMES:
                mo = MONTH_NAMES[m_str]
                return yr, f"{yr:04d}-{mo:02d}-{day:02d}", "EXACT_DAY"

        # Text format: "November 25, 1949"
        m_d_y = re.search(r'\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(1[89]\d{2})\b', s)
        if m_d_y:
            m_str = m_d_y.group(1).lower()
            day = int(m_d_y.group(2))
            yr = int(m_d_y.group(3))
            if m_str in MONTH_NAMES:
                mo = MONTH_NAMES[m_str]
                return yr, f"{yr:04d}-{mo:02d}-{day:02d}", "EXACT_DAY"

        # 4. Month check: e.g. "November 1949"
        m_y = re.search(r'\b([A-Za-z]+)\s+(1[89]\d{2})\b', s)
        if m_y:
            m_str = m_y.group(1).lower()
            yr = int(m_y.group(2))
            if m_str in MONTH_NAMES:
                mo = MONTH_NAMES[m_str]
                return yr, f"{yr:04d}-{mo:02d}", "MONTH"

        # 5. Year only check: e.g. "1949"
        yr_m = re.search(r'\b(1[89]\d{2})\b', s)
        if yr_m:
            yr = int(yr_m.group(1))
            return yr, str(yr), "YEAR"

        return 1950, s, "UNKNOWN"

    @classmethod
    def list_events(
        cls,
        db: Session,
        category: Optional[str] = None,
        from_year: Optional[int] = None,
        to_year: Optional[int] = None,
        entity_id: Optional[int] = None,
        verification_status: Optional[str] = "VERIFIED",
        include_unverified: bool = False
    ) -> List[TimelineEvent]:
        q = db.query(TimelineEvent)

        if not include_unverified and verification_status:
            q = q.filter(TimelineEvent.verification_status == verification_status)

        if category and category.upper() != "ALL":
            q = q.filter(TimelineEvent.category.ilike(f"%{category}%"))

        if from_year is not None:
            q = q.filter(TimelineEvent.year >= from_year)

        if to_year is not None:
            q = q.filter(TimelineEvent.year <= to_year)

        if entity_id is not None:
            q = q.join(TimelineEventEntity, TimelineEvent.id == TimelineEventEntity.timeline_event_id).filter(
                TimelineEventEntity.entity_id == entity_id
            )

        return q.order_by(TimelineEvent.year.asc(), TimelineEvent.sort_order.asc(), TimelineEvent.id.asc()).all()

    @classmethod
    def create_event(
        cls,
        db: Session,
        title: str,
        description: str,
        date_str: str,
        category: Optional[str] = None,
        location: Optional[str] = None,
        document_id: Optional[int] = None,
        participant_entity_ids: Optional[List[int]] = None,
        provenance_type: str = "EXPLICIT_SOURCE_RELATION",
        verification_status: str = "VERIFIED",
        user_id: Optional[int] = None
    ) -> TimelineEvent:
        year, formatted_date, precision = cls.parse_date_precision(date_str)

        event = TimelineEvent(
            title=title.strip(),
            description=description.strip(),
            year=year,
            exact_date=formatted_date,
            date_precision=precision,
            category=category or "Historical Milestone",
            related_locations=location,
            document_id=document_id,
            provenance_type=provenance_type,
            verification_status=verification_status,
            confidence=1.0 if verification_status == "VERIFIED" else 0.85,
            created_at=datetime.utcnow()
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Link participant entities
        if participant_entity_ids:
            for ent_id in participant_entity_ids:
                assoc = TimelineEventEntity(
                    timeline_event_id=event.id,
                    entity_id=ent_id,
                    role="PARTICIPANT"
                )
                db.add(assoc)
            db.commit()
            db.refresh(event)

        # Audit
        audit = GraphAuditLog(
            action="CREATE_TIMELINE_EVENT",
            target_type="TIMELINE_EVENT",
            target_id=event.id,
            user_id=user_id,
            details_json=json.dumps({
                "title": event.title,
                "year": event.year,
                "precision": event.date_precision,
                "status": event.verification_status
            }),
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return event

    @classmethod
    def approve_event(cls, db: Session, event_id: int, reviewer_id: Optional[int] = None) -> TimelineEvent:
        event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
        if not event:
            raise ValueError(f"Timeline event #{event_id} not found.")

        event.verification_status = "VERIFIED"
        db.commit()
        db.refresh(event)

        audit = GraphAuditLog(
            action="APPROVE_TIMELINE_EVENT",
            target_type="TIMELINE_EVENT",
            target_id=event.id,
            user_id=reviewer_id,
            details_json=json.dumps({"action": "APPROVE", "status": "VERIFIED"}),
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return event

    @classmethod
    def reject_event(cls, db: Session, event_id: int, reviewer_id: Optional[int] = None) -> TimelineEvent:
        event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
        if not event:
            raise ValueError(f"Timeline event #{event_id} not found.")

        event.verification_status = "REJECTED"
        db.commit()
        db.refresh(event)

        audit = GraphAuditLog(
            action="REJECT_TIMELINE_EVENT",
            target_type="TIMELINE_EVENT",
            target_id=event.id,
            user_id=reviewer_id,
            details_json=json.dumps({"action": "REJECT", "status": "REJECTED"}),
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return event

    @classmethod
    def generate_candidates_from_document(
        cls,
        db: Session,
        document_id: int,
        user_id: Optional[int] = None
    ) -> List[TimelineEvent]:
        """
        Extracts candidate timeline events from verified document metadata and text.
        All candidates are marked verification_status="PENDING_REVIEW" and provenance_type="MACHINE_EXTRACTED".
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return []

        candidates = []
        # If document has a date or date_created
        date_cand = doc.date_created or str(doc.year or "")
        if date_cand:
            year, fmt_date, prec = cls.parse_date_precision(date_cand)
            cand = TimelineEvent(
                title=f"{doc.title} ({doc.document_type})",
                description=doc.description or f"Archival document {doc.archive_id} created or delivered.",
                year=year,
                exact_date=fmt_date,
                date_precision=prec,
                category=doc.document_type or "Document",
                document_id=doc.id,
                provenance_type="MACHINE_EXTRACTED_RELATION",
                verification_status="PENDING_REVIEW", # Condition 13: Never auto-published
                confidence=0.85,
                evidence_text=f"Derived from document date '{date_cand}' in {doc.archive_id}",
                created_at=datetime.utcnow()
            )
            db.add(cand)
            db.commit()
            db.refresh(cand)
            candidates.append(cand)

        return candidates

    # Alias for API backwards compatibility
    extract_candidates_from_document = generate_candidates_from_document

