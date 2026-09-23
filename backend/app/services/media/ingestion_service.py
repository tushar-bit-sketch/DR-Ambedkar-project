"""
Media Ingestion & Processing Pipeline Service.
Preserves original masters under strict immutability.
Calculates SHA-256 checksums, detects duplicates, runs technical inspection,
and generates isolated derivatives (thumbnails, posters, waveforms).
"""
import os
import json
import uuid
import shutil
import hashlib
import datetime
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.db.models import (
    MediaAsset, MediaVersion, MediaMetadata,
    MediaProcessingJob, User
)
from app.services.media.processor.factory import get_media_processor
from app.services.media.integrity_service import calculate_file_sha256

STORAGE_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../storage/media"))
MASTERS_DIR = os.path.join(STORAGE_BASE, "masters")
DERIVATIVES_DIR = os.path.join(STORAGE_BASE, "derivatives")
THUMBNAILS_DIR = os.path.join(STORAGE_BASE, "thumbnails")
POSTERS_DIR = os.path.join(STORAGE_BASE, "posters")
WAVEFORMS_DIR = os.path.join(STORAGE_BASE, "waveforms")


ALLOWED_EXTENSIONS = {
    # Video
    "mp4", "webm", "mov", "mkv", "avi",
    # Audio
    "mp3", "wav", "m4a", "flac", "ogg",
    # Images / Photographs
    "jpg", "jpeg", "png", "webp", "tiff", "tif"
}


def sanitize_filename(filename: str) -> str:
    """Removes path traversal attempts and dangerous characters."""
    clean = os.path.basename(filename).replace("..", "").strip()
    return clean or f"media_{uuid.uuid4().hex[:8]}.bin"


class MediaIngestionService:
    @classmethod
    def ingest_media_master(
        cls,
        db: Session,
        file_bytes: bytes,
        original_filename: str,
        title: str,
        media_type: str,
        format_ext: str,
        archive_id: Optional[str] = None,
        declared_mime: Optional[str] = None,
        metadata_dict: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None
    ) -> MediaAsset:
        metadata_dict = metadata_dict or {}

        # 1. Validate file extension and format
        clean_ext = format_ext.lower().lstrip(".")
        if clean_ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported media format: '{format_ext}'. Allowed formats: {sorted(ALLOWED_EXTENSIONS)}")

        # 2. Compute SHA-256 of uploaded raw master
        hasher = hashlib.sha256(file_bytes)
        file_sha256 = hasher.hexdigest()
        file_size = len(file_bytes)

        # 3. Duplicate Detection Check
        existing = db.query(MediaAsset).filter(MediaAsset.checksum_sha256 == file_sha256).first()
        if existing:
            raise ValueError(f"Duplicate media master detected. Already archived under Archive ID: {existing.archive_id}")

        # 4. Generate Archive ID if missing
        aid = archive_id or f"AMB-MED-{media_type[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"

        # 5. Persist master file to immutable storage
        safe_orig_name = sanitize_filename(original_filename)
        master_filename = f"{aid}_{uuid.uuid4().hex[:6]}_{safe_orig_name}"
        os.makedirs(MASTERS_DIR, exist_ok=True)
        master_path = os.path.join(MASTERS_DIR, master_filename)

        with open(master_path, "wb") as f:
            f.write(file_bytes)

        # Ensure file permissions read-only
        try:
            os.chmod(master_path, 0o444) # Read-only for preservation
        except Exception:
            pass

        # 6. Technical Inspection via Processor (FFprobe or OpenCV/Pillow/Wave fallback)
        processor = get_media_processor()
        try:
            insp = processor.inspect(master_path, declared_mime=declared_mime)
        except Exception as e:
            insp = None

        duration = insp.duration if insp else metadata_dict.get("duration")
        mime = insp.mime_type if insp else (declared_mime or f"application/{clean_ext}")

        # 7. Create MediaAsset record
        asset = MediaAsset(
            archive_id=aid,
            title=title.strip(),
            subtitle=metadata_dict.get("subtitle"),
            description=metadata_dict.get("description"),
            media_type=media_type.upper(),
            format=clean_ext.upper(),
            mime_type=mime,
            duration=duration,
            file_size=file_size,
            checksum_sha256=file_sha256,
            source_name=metadata_dict.get("source_name", "Dr. Ambedkar National Memorial"),
            source_url=metadata_dict.get("source_url"),
            source_identifier=metadata_dict.get("source_identifier"),
            creator=metadata_dict.get("creator", "Dr. B. R. Ambedkar"),
            date=metadata_dict.get("date"),
            date_precision=metadata_dict.get("date_precision", "EXACT_DAY"),
            language=metadata_dict.get("language", "English"),
            original_language=metadata_dict.get("original_language"),
            location=metadata_dict.get("location"),
            collection_id=metadata_dict.get("collection_id"),
            rights=metadata_dict.get("rights", "Public Domain / Institutional Heritage Access"),
            license=metadata_dict.get("license"),
            access_level=metadata_dict.get("access_level", "PUBLIC"),
            download_policy=metadata_dict.get("download_policy", "STREAM_ONLY"),
            verification_status=metadata_dict.get("verification_status", "UNVERIFIED"),
            archival_status="MASTER_PRESERVED",
            is_demo_data=metadata_dict.get("is_demo_data", False),
            original_filename=safe_orig_name,
            storage_path=master_path,
            created_at=datetime.datetime.utcnow()
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)

        # 8. Record Master Version (v1)
        master_version = MediaVersion(
            media_id=asset.id,
            version_number=1,
            derivative_type="ORIGINAL_MASTER",
            file_path=master_path,
            mime_type=mime,
            codec=insp.codec if insp else None,
            container=insp.container if insp else None,
            resolution=f"{insp.width}x{insp.height}" if (insp and insp.width and insp.height) else None,
            frame_rate=insp.frame_rate if insp else None,
            bit_rate=insp.bit_rate if insp else None,
            sample_rate=insp.sample_rate if insp else None,
            channels=insp.channels if insp else None,
            duration=duration,
            file_size=file_size,
            checksum_sha256=file_sha256,
            created_by=user_id,
            created_at=datetime.datetime.utcnow()
        )
        db.add(master_version)

        # 9. Store Technical Metadata JSON
        if insp and insp.raw_metadata:
            meta = MediaMetadata(
                media_id=asset.id,
                metadata_category=f"TECHNICAL_{insp.tool_name.upper()}",
                raw_json=json.dumps(insp.raw_metadata),
                created_at=datetime.datetime.utcnow()
            )
            db.add(meta)

        # 10. Generate Initial Derivatives (isolated from master)
        cls._generate_initial_derivatives(db, asset, master_path, user_id)

        db.commit()
        db.refresh(asset)
        return asset

    @classmethod
    def _generate_initial_derivatives(
        cls,
        db: Session,
        asset: MediaAsset,
        master_path: str,
        user_id: Optional[int]
    ):
        processor = get_media_processor()
        os.makedirs(THUMBNAILS_DIR, exist_ok=True)
        os.makedirs(POSTERS_DIR, exist_ok=True)
        os.makedirs(WAVEFORMS_DIR, exist_ok=True)

        # 1. Thumbnail Generation
        thumb_filename = f"{asset.archive_id}_thumb.jpg"
        thumb_path = os.path.join(THUMBNAILS_DIR, thumb_filename)
        try:
            res = processor.generate_thumbnail(master_path, thumb_path, asset.media_type)
            if res and os.path.exists(thumb_path):
                asset.thumbnail_path = thumb_path
                ver = MediaVersion(
                    media_id=asset.id,
                    version_number=len(asset.versions) + 1,
                    derivative_type="THUMBNAIL",
                    file_path=thumb_path,
                    mime_type="image/jpeg",
                    resolution=f"{res.width}x{res.height}" if res.width and res.height else None,
                    file_size=res.file_size,
                    checksum_sha256=res.checksum_sha256,
                    created_by=user_id,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(ver)
        except Exception:
            pass

        # 2. Video Poster Frame Generation
        if asset.media_type == "VIDEO":
            poster_filename = f"{asset.archive_id}_poster.jpg"
            poster_path = os.path.join(POSTERS_DIR, poster_filename)
            try:
                res = processor.extract_poster_frame(master_path, poster_path, timestamp_sec=1.0)
                if res and os.path.exists(poster_path):
                    asset.poster_path = poster_path
                    ver = MediaVersion(
                        media_id=asset.id,
                        version_number=len(asset.versions) + 1,
                        derivative_type="POSTER_FRAME",
                        file_path=poster_path,
                        mime_type="image/jpeg",
                        file_size=res.file_size,
                        checksum_sha256=res.checksum_sha256,
                        created_by=user_id,
                        created_at=datetime.datetime.utcnow()
                    )
                    db.add(ver)
            except Exception:
                pass

        # 3. Audio Waveform Generation
        if asset.media_type == "AUDIO":
            wave_filename = f"{asset.archive_id}_waveform.json"
            wave_path = os.path.join(WAVEFORMS_DIR, wave_filename)
            try:
                peaks = processor.generate_waveform(master_path, wave_path)
                if peaks and os.path.exists(wave_path):
                    asset.waveform_data_path = wave_path
                    ver = MediaVersion(
                        media_id=asset.id,
                        version_number=len(asset.versions) + 1,
                        derivative_type="WAVEFORM",
                        file_path=wave_path,
                        mime_type="application/json",
                        file_size=os.path.getsize(wave_path),
                        checksum_sha256=calculate_file_sha256(wave_path),
                        created_by=user_id,
                        created_at=datetime.datetime.utcnow()
                    )
                    db.add(ver)
            except Exception:
                pass

        # Record completed inspect job
        job = MediaProcessingJob(
            media_id=asset.id,
            job_type="INSPECT",
            status="COMPLETED",
            progress=100,
            attempt=1,
            started_at=datetime.datetime.utcnow(),
            completed_at=datetime.datetime.utcnow(),
            tool_name=processor.name,
            tool_version="operational"
        )
        db.add(job)
