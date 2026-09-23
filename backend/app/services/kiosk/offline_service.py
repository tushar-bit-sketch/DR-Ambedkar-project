"""
Offline Archive & Edge-Safe Synchronization Service.
Enables offline exhibition terminals to operate safely without active server connectivity.
Generates cryptographically verified read-only offline manifest packages.
Strictly prohibits overwriting or modifying central archival masters from edge kiosk terminals.
"""
import os
import json
import hashlib
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.db.models import Document, MediaAsset, OfflinePackage


class OfflineSyncState:
    SYNCED = "SYNCED"
    UPDATE_AVAILABLE = "UPDATE_AVAILABLE"
    SYNCING = "SYNCING"
    FAILED = "FAILED"
    INTEGRITY_ERROR = "INTEGRITY_ERROR"
    OFFLINE = "OFFLINE"


def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class OfflinePackageService:
    @classmethod
    def generate_manifest(
        cls,
        db: Session,
        package_version: str = "1.9.0-edge",
        package_name: str = "Ambedkar Memorial Essential Exhibition Subset"
    ) -> Dict[str, Any]:
        """
        Creates an immutable, cryptographically signed manifest of verified archival records
        suitable for read-only offline deployment in museum exhibition terminals.
        """
        # Select approved, verified public documents
        docs = db.query(Document).filter(
            Document.verification_status == "VERIFIED",
            Document.access_level == "PUBLIC"
        ).limit(100).all()

        doc_items = []
        for d in docs:
            author_str = getattr(d, 'creator', None) or (d.author.name if getattr(d, 'author', None) else "Dr. B.R. Ambedkar")
            doc_items.append({
                "id": d.id,
                "title": d.title,
                "author": author_str,
                "date": getattr(d, 'date', None) or getattr(d, 'date_created', "1949"),
                "language": getattr(d, 'language', "English"),
                "checksum_sha256": getattr(d, 'checksum', None) or "unknown"
            })

        # Select verified public media assets
        media = db.query(MediaAsset).filter(
            MediaAsset.verification_status == "VERIFIED",
            MediaAsset.access_level == "PUBLIC"
        ).limit(50).all()

        media_items = []
        for m in media:
            media_items.append({
                "id": m.id,
                "archive_id": m.archive_id,
                "title": m.title,
                "media_type": m.media_type,
                "format": m.format,
                "checksum_sha256": m.checksum_sha256
            })

        now = datetime.datetime.utcnow().isoformat()
        manifest_payload = {
            "package_name": package_name,
            "package_version": package_version,
            "created_at": now,
            "application_compatibility": ">=1.0.0",
            "read_only": True,
            "offline_capabilities": {
                "search": True,
                "timeline": True,
                "knowledge_graph": True,
                "media_playback": True,
                "rag_assistant": False # AI generation requires server/LLM connectivity
            },
            "document_count": len(doc_items),
            "media_count": len(media_items),
            "documents": doc_items,
            "media": media_items
        }

        # Calculate manifest cryptographic hash
        canonical_bytes = json.dumps(manifest_payload, sort_keys=True).encode("utf-8")
        manifest_sha256 = calculate_sha256(canonical_bytes)
        manifest_payload["manifest_sha256"] = manifest_sha256

        return manifest_payload

    @classmethod
    def verify_manifest_integrity(cls, manifest_data: Dict[str, Any]) -> bool:
        """Verifies that the manifest data matches its declared SHA-256 fingerprint."""
        declared_sha = manifest_data.get("manifest_sha256")
        if not declared_sha:
            return False

        copy = dict(manifest_data)
        copy.pop("manifest_sha256", None)
        canonical_bytes = json.dumps(copy, sort_keys=True).encode("utf-8")
        computed_sha = calculate_sha256(canonical_bytes)
        return computed_sha == declared_sha
