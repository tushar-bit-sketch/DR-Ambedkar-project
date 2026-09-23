"""
Kiosk Terminal Endpoints.
Handles authenticated device heartbeats, configuration polling, device status checks,
and offline package manifests.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.db.models import KioskDevice
from app.services.kiosk.auth_service import get_current_kiosk_device
from app.services.kiosk.heartbeat_service import KioskHeartbeatService
from app.services.kiosk.offline_service import OfflinePackageService
from app.services.kiosk.hardware.capability_reporter import CapabilityReporter

router = APIRouter()


class HeartbeatIn(BaseModel):
    cpu_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    ram_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    disk_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    app_health: str = "OPERATIONAL"
    db_health: str = "OPERATIONAL"
    search_health: str = "OPERATIONAL"
    rag_health: str = "OPERATIONAL"
    media_health: str = "OPERATIONAL"
    active_errors: list = Field(default_factory=list)
    capabilities: Optional[Dict[str, Any]] = None
    software_version: Optional[str] = "1.9.0"


class KioskConfigOut(BaseModel):
    kiosk_id: int
    device_uuid: str
    device_name: str
    institution: str
    location: str
    idle_timeout_seconds: int
    warning_timeout_seconds: int
    home_route: str
    default_language: str
    available_languages: list
    accessibility_high_contrast: bool
    accessibility_font_scale: str
    maintenance_mode: bool
    maintenance_message: str


@router.post("/heartbeat")
def kiosk_heartbeat(
    payload: HeartbeatIn,
    db: Session = Depends(get_db),
    device: KioskDevice = Depends(get_current_kiosk_device)
):
    """
    Authenticated kiosk heartbeat endpoint.
    Terminals periodically post telemetry here to maintain ONLINE status.
    """
    directives = KioskHeartbeatService.record_heartbeat(
        db=db,
        device=device,
        heartbeat_payload=payload.model_dump()
    )
    return directives


@router.get("/config", response_model=KioskConfigOut)
def get_kiosk_configuration(
    db: Session = Depends(get_db),
    device: KioskDevice = Depends(get_current_kiosk_device)
):
    """
    Returns current configuration for the authenticated kiosk terminal.
    """
    config = device.configuration
    import json
    available_langs = ["en", "hi", "mr", "ta"]
    if config and config.available_languages_json:
        try:
            available_langs = json.loads(config.available_languages_json)
        except Exception:
            pass

    return KioskConfigOut(
        kiosk_id=device.id,
        device_uuid=device.device_uuid,
        device_name=device.device_name,
        institution=device.institution,
        location=device.location,
        idle_timeout_seconds=config.idle_timeout_seconds if config else 120,
        warning_timeout_seconds=config.warning_timeout_seconds if config else 15,
        home_route=config.home_route if config else "/",
        default_language=config.default_language if config else "en",
        available_languages=available_langs,
        accessibility_high_contrast=config.accessibility_high_contrast if config else False,
        accessibility_font_scale=config.accessibility_font_scale if config else "normal",
        maintenance_mode=device.maintenance_mode,
        maintenance_message=config.maintenance_message if config else "Under maintenance."
    )


@router.get("/status")
def get_kiosk_status():
    """
    Generates a full machine-readable hardware and infrastructure capability report.
    """
    return CapabilityReporter.generate_report()


@router.get("/offline-manifest")
def get_offline_manifest(
    db: Session = Depends(get_db),
    device: KioskDevice = Depends(get_current_kiosk_device)
):
    """
    Returns the verified, cryptographically signed offline subset manifest for edge terminals.
    """
    manifest = OfflinePackageService.generate_manifest(db)
    return manifest
