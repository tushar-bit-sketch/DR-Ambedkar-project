"""
Media Integrity Verification Service.
Computes genuine SHA-256 hashes, detects file tampering, missing files, and corruption.
Strictly refuses to silently replace or overwrite corrupted archival masters.
"""
import os
import hashlib
import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.db.models import MediaAsset, MediaVersion, MediaIntegrityRecord


def calculate_file_sha256(file_path: str) -> str:
    """Calculates SHA-256 checksum of a file on disk."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class MediaIntegrityService:
    @classmethod
    def verify_media_asset_integrity(cls, db: Session, media_id: int) -> Dict[str, Any]:
        asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
        if not asset:
            raise ValueError(f"Media asset #{media_id} not found.")

        master_path = asset.storage_path
        details = []
        overall_status = "INTEGRITY_VERIFIED"

        # 1. Verify Master File
        if not os.path.exists(master_path):
            overall_status = "FILE_MISSING"
            actual_sha = "MISSING"
            details.append(f"Master file missing at path: {master_path}")
            asset.archival_status = "QUARANTINED"
        else:
            actual_sha = calculate_file_sha256(master_path)
            if actual_sha == asset.checksum_sha256:
                details.append("Master file SHA-256 matches catalog record exactly.")
            else:
                overall_status = "INTEGRITY_FAILED"
                details.append(f"Master file checksum mismatch! Expected: {asset.checksum_sha256}, Actual: {actual_sha}")
                asset.archival_status = "CORRUPTED"

        # Record audit log for master
        master_rec = MediaIntegrityRecord(
            media_id=asset.id,
            media_version_id=None,
            expected_sha256=asset.checksum_sha256,
            actual_sha256=actual_sha,
            status=overall_status,
            verified_at=datetime.datetime.utcnow(),
            details=" | ".join(details)
        )
        db.add(master_rec)

        # 2. Verify all version derivatives
        version_results = []
        for ver in asset.versions:
            v_status = "INTEGRITY_VERIFIED"
            if not os.path.exists(ver.file_path):
                v_status = "FILE_MISSING"
                v_act_sha = "MISSING"
            else:
                v_act_sha = calculate_file_sha256(ver.file_path)
                if ver.checksum_sha256 and v_act_sha != ver.checksum_sha256:
                    v_status = "INTEGRITY_FAILED"

            v_rec = MediaIntegrityRecord(
                media_id=asset.id,
                media_version_id=ver.id,
                expected_sha256=ver.checksum_sha256 or v_act_sha,
                actual_sha256=v_act_sha,
                status=v_status,
                verified_at=datetime.datetime.utcnow(),
                details=f"Derivative {ver.derivative_type} version #{ver.version_number}"
            )
            db.add(v_rec)
            version_results.append({
                "version_id": ver.id,
                "derivative_type": ver.derivative_type,
                "status": v_status,
                "actual_sha256": v_act_sha
            })

        db.commit()

        return {
            "media_id": asset.id,
            "archive_id": asset.archive_id,
            "is_valid": overall_status == "INTEGRITY_VERIFIED",
            "status": overall_status,
            "expected_sha256": asset.checksum_sha256,
            "actual_sha256": actual_sha,
            "details": details,
            "derivative_results": version_results
        }

    @classmethod
    def run_bulk_integrity_audit(cls, db: Session) -> Dict[str, Any]:
        assets = db.query(MediaAsset).all()
        total = len(assets)
        verified = 0
        failed = 0
        missing = 0

        for a in assets:
            res = cls.verify_media_asset_integrity(db, a.id)
            st = res["status"]
            if st == "INTEGRITY_VERIFIED":
                verified += 1
            elif st == "INTEGRITY_FAILED":
                failed += 1
            elif st == "FILE_MISSING":
                missing += 1

        return {
            "total_assets": total,
            "total_assets_checked": total,
            "intact_count": verified,
            "verified_intact": verified,
            "tampered_count": failed,
            "integrity_failed": failed,
            "missing_count": missing,
            "files_missing": missing,
            "audit_timestamp": datetime.datetime.utcnow().isoformat()
        }
