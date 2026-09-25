"""
Media Archive & Intelligence API Endpoints.
Supports media cataloging, range-request streaming, download policies,
timestamped transcripts, WebVTT/SRT captions, integrity audits, and provenance.
"""
import os
import re
import json
import datetime
from typing import List, Optional, Dict, Any
from fastapi import (
    APIRouter, Depends, HTTPException, status, Query,
    UploadFile, File, Form, Request, Response
)
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.db.models import (
    MediaAsset, MediaVersion, MediaMetadata,
    MediaTranscript, TranscriptSegment, MediaCaption,
    MediaCollection, MediaCollectionItem, MediaProcessingJob,
    MediaIntegrityRecord, User
)
from app.schemas.media_asset import (
    MediaAssetOut, MediaAssetListItem, MediaAssetCreate, MediaAssetUpdate,
    MediaDiagnosticsOut, MediaProvenanceOut, MediaCollectionOut, MediaCollectionCreate,
    MediaTranscriptOut, MediaTranscriptCreate, TranscriptReviewRequest,
    MediaCaptionOut, MediaIntegrityRecordOut, TranscriptSearchResult
)
from app.api.v1.endpoints.auth import get_current_user_optional, require_role
from app.services.media.provider_status import get_media_diagnostics
from app.services.media.ingestion_service import MediaIngestionService, STORAGE_BASE
from app.services.media.search_service import MediaSearchService
from app.services.media.integrity_service import MediaIntegrityService
from app.services.media.caption_service import CaptionService, seconds_to_timestamp_str

router = APIRouter()


def assert_safe_storage_path(file_path: str):
    real_path = os.path.realpath(file_path)
    real_storage = os.path.realpath(STORAGE_BASE)
    if not real_path.startswith(real_storage):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Path traversal detected.")


def range_requests_response(
    request: Request,
    file_path: str,
    content_type: str,
    as_attachment: bool = False,
    filename: Optional[str] = None
):
    assert_safe_storage_path(file_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found.")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if range_header:
        range_match = re.match(r"bytes=(\d+)-(\d+)?", range_header)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
            if start >= file_size or end >= file_size or start > end:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})

            chunk_length = end - start + 1
            def file_chunk_generator():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    bytes_left = chunk_length
                    while bytes_left > 0:
                        read_size = min(bytes_left, 65536)
                        data = f.read(read_size)
                        if not data:
                            break
                        bytes_left -= len(data)
                        yield data

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_length),
                "Content-Type": content_type,
                "Content-Disposition": f'{"attachment" if as_attachment else "inline"}; filename="{filename or os.path.basename(file_path)}"'
            }
            return StreamingResponse(file_chunk_generator(), status_code=206, headers=headers)

    def full_file_generator():
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                yield chunk

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": content_type,
        "Content-Disposition": f'{"attachment" if as_attachment else "inline"}; filename="{filename or os.path.basename(file_path)}"'
    }
    return StreamingResponse(full_file_generator(), status_code=200, headers=headers)


# ---------------------------------------------------------------------------
# Diagnostics & Search Endpoints
# ---------------------------------------------------------------------------

@router.get("/diagnostics", response_model=MediaDiagnosticsOut)
def media_diagnostics():
    """Returns verified operational status of FFmpeg, FFprobe, Whisper, and native fallbacks."""
    return get_media_diagnostics()


@router.get("/search", response_model=List[MediaAssetListItem])
def search_media_assets(
    q: Optional[str] = Query(None, description="Search query across media metadata"),
    media_type: Optional[str] = Query(None, description="AUDIO, VIDEO, PHOTOGRAPH, or ALL"),
    collection_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    access_level = "ALL" if (current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]) else (
        "RESEARCH_ONLY" if (current_user and current_user.role and current_user.role.name == "RESEARCHER") else "PUBLIC"
    )
    assets = MediaSearchService.search_media(
        db=db,
        query=q,
        media_type=media_type,
        collection_id=collection_id,
        access_level=access_level,
        limit=limit
    )
    return [
        MediaAssetListItem(
            id=a.id,
            archive_id=a.archive_id,
            title=a.title,
            subtitle=a.subtitle,
            media_type=a.media_type,
            format=a.format,
            mime_type=a.mime_type,
            duration=a.duration,
            file_size=a.file_size,
            checksum_sha256=a.checksum_sha256,
            source_name=a.source_name,
            creator=a.creator,
            date=a.date,
            date_precision=a.date_precision,
            language=a.language,
            access_level=a.access_level,
            download_policy=a.download_policy,
            verification_status=a.verification_status,
            archival_status=a.archival_status,
            is_demo_data=a.is_demo_data,
            thumbnail_path=a.thumbnail_path,
            poster_path=a.poster_path,
            has_transcript=len(a.transcripts) > 0,
            has_captions=len(a.captions) > 0,
            created_at=a.created_at
        )
        for a in assets
    ]


@router.get("/transcript-search", response_model=List[TranscriptSearchResult])
def search_transcripts(
    q: str = Query(..., min_length=2, description="Text pattern to search within verified audio/video transcripts"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    access_level = "ALL" if (current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]) else (
        "RESEARCH_ONLY" if (current_user and current_user.role and current_user.role.name == "RESEARCHER") else "PUBLIC"
    )
    return MediaSearchService.search_media_transcript_segments(
        db=db,
        query=q,
        limit=limit,
        access_level=access_level
    )



# ---------------------------------------------------------------------------
# Collections Endpoints
# ---------------------------------------------------------------------------

@router.get("/collections", response_model=List[MediaCollectionOut])
def list_media_collections(db: Session = Depends(get_db)):
    collections = db.query(MediaCollection).order_by(MediaCollection.name.asc()).all()
    out = []
    for c in collections:
        item = MediaCollectionOut.model_validate(c)
        item.asset_count = len(c.assets)
        out.append(item)
    return out


@router.post("/collections", response_model=MediaCollectionOut)
def create_media_collection(
    payload: MediaCollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    slug = payload.slug or re.sub(r'[^a-zA-Z0-9]+', '-', payload.name.lower()).strip('-')
    coll = MediaCollection(
        name=payload.name.strip(),
        slug=slug,
        description=payload.description,
        access_level=payload.access_level or "PUBLIC",
        source=payload.source,
        verification_status="VERIFIED",
        created_at=datetime.datetime.utcnow()
    )
    db.add(coll)
    db.commit()
    db.refresh(coll)
    out = MediaCollectionOut.model_validate(coll)
    out.asset_count = 0
    return out


# ---------------------------------------------------------------------------
# Kiosk Feed Endpoint
# ---------------------------------------------------------------------------

@router.get("/kiosk/feed", response_model=List[MediaAssetListItem])
def get_kiosk_media_feed(
    media_type: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Returns verified public media assets curated for museum touch kiosk terminals."""
    q = db.query(MediaAsset).filter(
        MediaAsset.access_level == "PUBLIC",
        MediaAsset.verification_status.in_(["VERIFIED", "APPROVED"])
    )
    if media_type and media_type.upper() != "ALL":
        q = q.filter(MediaAsset.media_type == media_type.upper())

    assets = q.order_by(MediaAsset.id.desc()).limit(limit).all()
    return [
        MediaAssetListItem(
            id=a.id,
            archive_id=a.archive_id,
            title=a.title,
            subtitle=a.subtitle,
            media_type=a.media_type,
            format=a.format,
            mime_type=a.mime_type,
            duration=a.duration,
            file_size=a.file_size,
            checksum_sha256=a.checksum_sha256,
            source_name=a.source_name,
            creator=a.creator,
            date=a.date,
            date_precision=a.date_precision,
            language=a.language,
            access_level=a.access_level,
            download_policy=a.download_policy,
            verification_status=a.verification_status,
            archival_status=a.archival_status,
            is_demo_data=a.is_demo_data,
            thumbnail_path=a.thumbnail_path,
            poster_path=a.poster_path,
            has_transcript=len(a.transcripts) > 0,
            has_captions=len(a.captions) > 0,
            created_at=a.created_at
        )
        for a in assets
    ]


# ---------------------------------------------------------------------------
# Media Asset Ingestion & Retrieval
# ---------------------------------------------------------------------------

@router.get("", response_model=List[MediaAssetListItem])
def list_media(
    media_type: Optional[str] = Query(None),
    collection_id: Optional[int] = Query(None),
    access_level: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    q = db.query(MediaAsset)

    # RBAC filtering
    is_admin = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]
    if not is_admin:
        if current_user and current_user.role and current_user.role.name == "RESEARCHER":
            q = q.filter(MediaAsset.access_level.in_(["PUBLIC", "RESEARCH_ONLY"]))
        else:
            q = q.filter(MediaAsset.access_level == "PUBLIC")

    if media_type and media_type.upper() != "ALL":
        q = q.filter(MediaAsset.media_type == media_type.upper())
    if collection_id is not None:
        q = q.filter(MediaAsset.collection_id == collection_id)
    if access_level and is_admin:
        q = q.filter(MediaAsset.access_level == access_level.upper())
    if verification_status:
        q = q.filter(MediaAsset.verification_status == verification_status.upper())

    assets = q.order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc()).offset(offset).limit(limit).all()
    return [
        MediaAssetListItem(
            id=a.id,
            archive_id=a.archive_id,
            title=a.title,
            subtitle=a.subtitle,
            media_type=a.media_type,
            format=a.format,
            mime_type=a.mime_type,
            duration=a.duration,
            file_size=a.file_size,
            checksum_sha256=a.checksum_sha256,
            source_name=a.source_name,
            creator=a.creator,
            date=a.date,
            date_precision=a.date_precision,
            language=a.language,
            access_level=a.access_level,
            download_policy=a.download_policy,
            verification_status=a.verification_status,
            archival_status=a.archival_status,
            is_demo_data=a.is_demo_data,
            thumbnail_path=a.thumbnail_path,
            poster_path=a.poster_path,
            has_transcript=len(a.transcripts) > 0,
            has_captions=len(a.captions) > 0,
            created_at=a.created_at
        )
        for a in assets
    ]


@router.post("", response_model=MediaAssetOut, status_code=status.HTTP_201_CREATED)
async def upload_media_master(
    file: UploadFile = File(...),
    title: str = Form(...),
    media_type: str = Form(...), # AUDIO, VIDEO, IMAGE, PHOTOGRAPH
    archive_id: Optional[str] = Form(None),
    subtitle: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    creator: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    date_precision: Optional[str] = Form("EXACT_DAY"),
    language: Optional[str] = Form("English"),
    original_language: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    collection_id: Optional[int] = Form(None),
    rights: Optional[str] = Form("Public Domain / Institutional Heritage Access"),
    license: Optional[str] = Form(None),
    access_level: Optional[str] = Form("PUBLIC"),
    download_policy: Optional[str] = Form("STREAM_ONLY"),
    verification_status: Optional[str] = Form("UNVERIFIED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """
    Ingests an immutable original master file into archival storage.
    Calculates SHA-256, verifies format/MIME, stores master, runs technical inspection,
    and creates initial derivative records without modifying the master.
    """
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    filename = file.filename or "unknown_media.bin"
    ext = os.path.splitext(filename)[1].lower().lstrip(".")

    metadata_dict = {
        "subtitle": subtitle,
        "description": description,
        "creator": creator,
        "date": date,
        "date_precision": date_precision,
        "language": language,
        "original_language": original_language,
        "location": location,
        "collection_id": collection_id,
        "rights": rights,
        "license": license,
        "access_level": access_level,
        "download_policy": download_policy,
        "verification_status": verification_status,
        "is_demo_data": False
    }

    try:
        asset = MediaIngestionService.ingest_media_master(
            db=db,
            file_bytes=file_bytes,
            original_filename=filename,
            title=title,
            media_type=media_type,
            format_ext=ext,
            archive_id=archive_id,
            declared_mime=file.content_type,
            metadata_dict=metadata_dict,
            user_id=current_user.id
        )
    except ValueError as e:
        if "Duplicate media master detected" in str(e):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ingestion failed: {e}")

    return asset


@router.get("/{media_id}", response_model=MediaAssetOut)
def get_media_asset(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")

    # Access control
    is_admin = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]
    if not is_admin:
        if asset.access_level == "RESTRICTED":
            if not (current_user and current_user.role and current_user.role.name in ["RESEARCHER", "REVIEWER"]):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to RESTRICTED media asset.")
        elif asset.access_level == "PRIVATE":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to PRIVATE media asset.")

    return asset


@router.patch("/{media_id}", response_model=MediaAssetOut)
def update_media_asset(
    media_id: int,
    payload: MediaAssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(asset, k, v)

    asset.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(asset)
    return asset


# ---------------------------------------------------------------------------
# Streaming, Download & Derivative Access
# ---------------------------------------------------------------------------

@router.get("/{media_id}/stream")
def stream_media(
    media_id: int,
    request: Request,
    version_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")

    # Access Control Check
    is_admin = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]
    if not is_admin:
        if asset.access_level == "RESTRICTED":
            if not (current_user and current_user.role and current_user.role.name in ["RESEARCHER", "REVIEWER"]):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to RESTRICTED media stream.")
        elif asset.access_level == "PRIVATE":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to PRIVATE media stream.")

    target_path = asset.storage_path
    mime_type = asset.mime_type

    if version_id:
        ver = db.query(MediaVersion).filter(MediaVersion.id == version_id, MediaVersion.media_id == media_id).first()
        if ver and os.path.exists(ver.file_path):
            target_path = ver.file_path
            mime_type = ver.mime_type

    return range_requests_response(
        request=request,
        file_path=target_path,
        content_type=mime_type,
        as_attachment=False,
        filename=asset.original_filename
    )


@router.get("/{media_id}/download")
def download_media(
    media_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")

    is_admin = current_user and current_user.role and current_user.role.name in ["SUPER_ADMIN", "ARCHIVIST"]
    if asset.download_policy == "ADMIN_ONLY" and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Direct media download is restricted to administrators.")
    elif asset.download_policy == "STREAM_ONLY" and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This media item is marked STREAM_ONLY. Download is not permitted.")

    return range_requests_response(
        request=request,
        file_path=asset.storage_path,
        content_type=asset.mime_type,
        as_attachment=True,
        filename=asset.original_filename
    )


@router.get("/{media_id}/thumbnail")
def get_thumbnail(media_id: int, db: Session = Depends(get_db)):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset or not asset.thumbnail_path or not os.path.exists(asset.thumbnail_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not available.")
    assert_safe_storage_path(asset.thumbnail_path)
    return FileResponse(asset.thumbnail_path, media_type="image/jpeg")


@router.get("/{media_id}/poster")
def get_poster_frame(media_id: int, db: Session = Depends(get_db)):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset or not asset.poster_path or not os.path.exists(asset.poster_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poster frame not available.")
    assert_safe_storage_path(asset.poster_path)
    return FileResponse(asset.poster_path, media_type="image/jpeg")


@router.get("/{media_id}/waveform")
def get_waveform(media_id: int, db: Session = Depends(get_db)):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")

    if asset.waveform_data_path and os.path.exists(asset.waveform_data_path):
        assert_safe_storage_path(asset.waveform_data_path)
        with open(asset.waveform_data_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Return default empty peaks
    return [0.0] * 100


# ---------------------------------------------------------------------------
# Transcripts & Captions Endpoints
# ---------------------------------------------------------------------------

@router.get("/{media_id}/transcripts", response_model=List[MediaTranscriptOut])
def get_media_transcripts(media_id: int, db: Session = Depends(get_db)):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")
    return asset.transcripts


@router.post("/{media_id}/transcripts", response_model=MediaTranscriptOut, status_code=status.HTTP_201_CREATED)
def create_or_import_transcript(
    media_id: int,
    payload: MediaTranscriptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")

    # Validate timing errors
    timing_errors = CaptionService.validate_segments(payload.segments)
    if timing_errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(timing_errors))

    next_version = len(asset.transcripts) + 1
    transcript = MediaTranscript(
        media_id=asset.id,
        version=next_version,
        language=payload.language,
        source_type=payload.source_type,
        status=payload.status,
        model=payload.model,
        model_version=payload.model_version,
        created_by=current_user.id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(transcript)
    db.commit()
    db.refresh(transcript)

    for i, seg in enumerate(payload.segments):
        s_obj = TranscriptSegment(
            transcript_id=transcript.id,
            sequence=i + 1,
            start_time=seg.start_time,
            end_time=seg.end_time,
            start_timestamp_str=seg.start_timestamp_str or seconds_to_timestamp_str(seg.start_time),
            end_timestamp_str=seg.end_timestamp_str or seconds_to_timestamp_str(seg.end_time),
            text=seg.text.strip(),
            speaker_label=seg.speaker_label or "UNKNOWN",
            confidence=seg.confidence or 1.0,
            verification_status=seg.verification_status or "PENDING_REVIEW",
            source_reference=seg.source_reference
        )
        db.add(s_obj)

    # Automatically generate captions if approved or human reviewed
    if transcript.status in ["APPROVED", "HUMAN_REVIEWED"]:
        vtt_text = CaptionService.generate_webvtt(payload.segments, title=asset.title)
        caption = MediaCaption(
            media_id=asset.id,
            transcript_id=transcript.id,
            format="WEBVTT",
            language=payload.language,
            caption_text=vtt_text,
            verification_status="APPROVED",
            created_at=datetime.datetime.utcnow()
        )
        db.add(caption)

    db.commit()
    db.refresh(transcript)
    return transcript


@router.post("/{media_id}/transcripts/{transcript_id}/review", response_model=MediaTranscriptOut)
def review_transcript(
    media_id: int,
    transcript_id: int,
    payload: TranscriptReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST", "REVIEWER"]))
):
    """
    Curator review workflow.
    If action is EDIT_AND_APPROVE, creates a new transcript version (v2+)
    preserving the original machine transcript intact for full auditability.
    """
    orig_transcript = db.query(MediaTranscript).filter(
        MediaTranscript.id == transcript_id,
        MediaTranscript.media_id == media_id
    ).first()
    if not orig_transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript record not found.")

    if payload.action == "APPROVE":
        orig_transcript.status = "APPROVED"
        orig_transcript.reviewed_by = current_user.id
        orig_transcript.approved_by = current_user.id
        orig_transcript.reviewed_at = datetime.datetime.utcnow()
        orig_transcript.approved_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(orig_transcript)
        return orig_transcript

    elif payload.action == "REJECT":
        orig_transcript.status = "REJECTED"
        orig_transcript.reviewed_by = current_user.id
        orig_transcript.reviewed_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(orig_transcript)
        return orig_transcript

    elif payload.action in ("EDIT_AND_APPROVE", "REVIEW", "EDIT"):
        if not payload.segments:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Edited segments are required for {payload.action}.")

        # Validate edited timings
        errors = CaptionService.validate_segments(payload.segments)
        if errors:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))

        # Create new version
        asset = orig_transcript.media_asset
        next_ver = len(asset.transcripts) + 1
        new_transcript = MediaTranscript(
            media_id=asset.id,
            version=next_ver,
            language=orig_transcript.language,
            source_type="CURATOR_CORRECTED",
            status="HUMAN_REVIEWED",
            model=orig_transcript.model,
            created_by=current_user.id,
            reviewed_by=current_user.id,
            approved_by=current_user.id,
            created_at=datetime.datetime.utcnow(),
            reviewed_at=datetime.datetime.utcnow(),
            approved_at=datetime.datetime.utcnow()
        )
        db.add(new_transcript)
        db.commit()
        db.refresh(new_transcript)

        for i, s in enumerate(payload.segments):
            seg_rec = TranscriptSegment(
                transcript_id=new_transcript.id,
                sequence=i + 1,
                start_time=s.start_time,
                end_time=s.end_time,
                start_timestamp_str=s.start_timestamp_str or seconds_to_timestamp_str(s.start_time),
                end_timestamp_str=s.end_timestamp_str or seconds_to_timestamp_str(s.end_time),
                text=s.text.strip(),
                speaker_label=s.speaker_label or "UNKNOWN",
                confidence=1.0,
                verification_status="APPROVED",
                source_reference=f"Curatorial correction of version #{orig_transcript.version}"
            )
            db.add(seg_rec)

        # Generate WebVTT caption
        vtt = CaptionService.generate_webvtt(payload.segments, title=asset.title)
        cap = MediaCaption(
            media_id=asset.id,
            transcript_id=new_transcript.id,
            format="WEBVTT",
            language=orig_transcript.language,
            caption_text=vtt,
            verification_status="APPROVED",
            created_at=datetime.datetime.utcnow()
        )
        db.add(cap)
        db.commit()
        db.refresh(new_transcript)
        return new_transcript

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid action: '{payload.action}'.")


@router.get("/{media_id}/captions", response_model=List[MediaCaptionOut])
def get_media_captions(media_id: int, db: Session = Depends(get_db)):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")
    return asset.captions


@router.get("/{media_id}/captions.vtt")
def download_webvtt_caption(media_id: int, db: Session = Depends(get_db)):
    caption = db.query(MediaCaption).filter(
        MediaCaption.media_id == media_id,
        MediaCaption.format == "WEBVTT"
    ).order_by(MediaCaption.id.desc()).first()

    if not caption:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WebVTT caption track not available.")

    return Response(content=caption.caption_text, media_type="text/vtt")


# ---------------------------------------------------------------------------
# Integrity & Provenance Endpoints
# ---------------------------------------------------------------------------

@router.post("/{media_id}/integrity-check", response_model=Dict[str, Any])
def run_integrity_check(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    try:
        return MediaIntegrityService.verify_media_asset_integrity(db, media_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/integrity/audit", response_model=Dict[str, Any])
def run_bulk_integrity_audit(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    return MediaIntegrityService.run_bulk_integrity_audit(db)


@router.get("/{media_id}/provenance", response_model=MediaProvenanceOut)
def get_media_provenance(media_id: int, db: Session = Depends(get_db)):
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media asset #{media_id} not found.")

    lineage = [
        {
            "tier": "PRIMARY_SOURCE",
            "name": asset.source_name,
            "url": asset.source_url,
            "identifier": asset.source_identifier or asset.archive_id,
            "rights": asset.rights
        },
        {
            "tier": "ORIGINAL_MASTER",
            "filename": asset.original_filename,
            "checksum_sha256": asset.checksum_sha256,
            "file_size": asset.file_size,
            "format": asset.format,
            "mime_type": asset.mime_type,
            "archival_status": asset.archival_status,
            "uploaded_at": asset.created_at.isoformat() if asset.created_at else None
        }
    ]

    for ver in asset.versions:
        lineage.append({
            "tier": f"DERIVATIVE_{ver.derivative_type}",
            "version_number": ver.version_number,
            "checksum_sha256": ver.checksum_sha256,
            "mime_type": ver.mime_type,
            "created_at": ver.created_at.isoformat() if ver.created_at else None
        })

    for trans in asset.transcripts:
        lineage.append({
            "tier": f"TRANSCRIPT_{trans.source_type}",
            "version": trans.version,
            "language": trans.language,
            "status": trans.status,
            "model": trans.model,
            "segments_count": len(trans.segments)
        })

    return MediaProvenanceOut(
        media_id=asset.id,
        archive_id=asset.archive_id,
        title=asset.title,
        original_filename=asset.original_filename,
        checksum_sha256=asset.checksum_sha256,
        file_size=asset.file_size,
        source_name=asset.source_name,
        source_url=asset.source_url,
        source_identifier=asset.source_identifier,
        rights=asset.rights,
        archival_lineage=lineage,
        verification_status=asset.verification_status
    )
