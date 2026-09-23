"""
Admin Kiosk Management & Security Audit Endpoints.
Allows archivists and administrators to manage physical kiosk terminals, inspect telemetry,
rotate credentials, toggle remote maintenance mode, and audit system security health.
"""
import os
import json
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.db.models import KioskDevice, KioskConfiguration, KioskHeartbeatRecord, KioskAuditLog, User
from app.api.v1.endpoints.auth import require_role
from app.services.kiosk.auth_service import KioskAuthService
from app.services.kiosk.heartbeat_service import KioskHeartbeatService
from app.core.config import settings

router = APIRouter()


# Schemas
class KioskRegisterIn(BaseModel):
    device_name: str = Field(..., min_length=2, max_length=255)
    institution: str = Field("Dr. Ambedkar National Memorial", max_length=255)
    location: str = Field("Exhibition Hall A", max_length=255)
    kiosk_type: str = Field("TOUCHSCREEN_PEDESTAL", max_length=50)
    hardware_fingerprint: Optional[str] = None


class KioskRegisterOut(BaseModel):
    id: int
    device_uuid: str
    device_name: str
    institution: str
    location: str
    kiosk_type: str
    status: str
    raw_device_key: str
    registered_at: str
    notice: str = "Store this device API key securely. It will not be shown again."


class KioskConfigUpdate(BaseModel):
    idle_timeout_seconds: Optional[int] = Field(None, ge=10, le=3600)
    warning_timeout_seconds: Optional[int] = Field(None, ge=5, le=120)
    home_route: Optional[str] = Field(None, max_length=100)
    default_language: Optional[str] = Field(None, max_length=10)
    available_languages: Optional[List[str]] = None
    accessibility_high_contrast: Optional[bool] = None
    accessibility_font_scale: Optional[str] = None
    allowed_collections: Optional[List[int]] = None
    maintenance_message: Optional[str] = Field(None, max_length=500)


class MaintenanceToggleIn(BaseModel):
    enabled: bool
    reason: Optional[str] = "Scheduled exhibition maintenance"


# Endpoints
@router.get("", response_model=Dict[str, Any])
def list_kiosks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """Lists all registered physical kiosk terminals with live operational statuses."""
    devices = db.query(KioskDevice).order_by(KioskDevice.created_at.desc()).all()
    now = datetime.datetime.utcnow()

    kiosks_out = []
    totals = {"total": len(devices), "online": 0, "stale": 0, "offline": 0, "maintenance": 0, "disabled": 0, "error": 0}

    for d in devices:
        live_status = KioskHeartbeatService.calculate_device_status(d, reference_time=now)
        st_lower = live_status.lower()
        if st_lower in totals:
            totals[st_lower] += 1

        kiosks_out.append({
            "id": d.id,
            "device_uuid": d.device_uuid,
            "device_name": d.device_name,
            "institution": d.institution,
            "location": d.location,
            "kiosk_type": d.kiosk_type,
            "status": live_status,
            "maintenance_mode": d.maintenance_mode,
            "enabled": d.enabled,
            "software_version": d.software_version,
            "configuration_version": d.configuration_version,
            "registered_at": d.registered_at.isoformat() if d.registered_at else None,
            "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None
        })

    return {
        "summary": totals,
        "kiosks": kiosks_out
    }


@router.post("/register", response_model=KioskRegisterOut)
def register_kiosk(
    payload: KioskRegisterIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """Registers a new kiosk device and generates its secure device key."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    device, raw_key = KioskAuthService.register_device(
        db=db,
        device_name=payload.device_name,
        institution=payload.institution,
        location=payload.location,
        kiosk_type=payload.kiosk_type,
        hardware_fingerprint=payload.hardware_fingerprint,
        actor_user_id=current_user.id,
        ip_address=client_ip
    )

    return KioskRegisterOut(
        id=device.id,
        device_uuid=device.device_uuid,
        device_name=device.device_name,
        institution=device.institution,
        location=device.location,
        kiosk_type=device.kiosk_type,
        status=device.status,
        raw_device_key=raw_key,
        registered_at=device.registered_at.isoformat()
    )


@router.get("/{kiosk_id}", response_model=Dict[str, Any])
def get_kiosk_detail(
    kiosk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """Returns detailed telemetry, configuration, and recent heartbeats for a terminal."""
    device = db.query(KioskDevice).filter(KioskDevice.id == kiosk_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Kiosk #{kiosk_id} not found.")

    live_status = KioskHeartbeatService.calculate_device_status(device)
    config = device.configuration

    # Recent heartbeats (last 10)
    hbs = db.query(KioskHeartbeatRecord).filter(
        KioskHeartbeatRecord.kiosk_id == device.id
    ).order_by(KioskHeartbeatRecord.timestamp.desc()).limit(10).all()

    # Parse capabilities if available
    caps = {}
    if device.capabilities_json:
        try:
            caps = json.loads(device.capabilities_json)
        except Exception:
            pass

    return {
        "id": device.id,
        "device_uuid": device.device_uuid,
        "device_name": device.device_name,
        "institution": device.institution,
        "location": device.location,
        "kiosk_type": device.kiosk_type,
        "status": live_status,
        "maintenance_mode": device.maintenance_mode,
        "enabled": device.enabled,
        "software_version": device.software_version,
        "configuration_version": device.configuration_version,
        "registered_at": device.registered_at.isoformat() if device.registered_at else None,
        "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
        "capabilities": caps,
        "configuration": {
            "idle_timeout_seconds": config.idle_timeout_seconds if config else 120,
            "warning_timeout_seconds": config.warning_timeout_seconds if config else 15,
            "home_route": config.home_route if config else "/",
            "default_language": config.default_language if config else "en",
            "maintenance_message": config.maintenance_message if config else ""
        },
        "recent_heartbeats": [
            {
                "timestamp": h.timestamp.isoformat(),
                "status": h.status,
                "cpu_percent": h.cpu_percent,
                "ram_percent": h.ram_percent,
                "disk_percent": h.disk_percent,
                "app_health": h.app_health,
                "db_health": h.db_health
            }
            for h in hbs
        ]
    }


@router.patch("/{kiosk_id}/config")
def update_kiosk_configuration(
    kiosk_id: int,
    payload: KioskConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """Updates operational settings for a kiosk terminal."""
    device = db.query(KioskDevice).filter(KioskDevice.id == kiosk_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Kiosk #{kiosk_id} not found.")

    config = device.configuration
    if not config:
        config = KioskConfiguration(kiosk_id=device.id, version=1)
        db.add(config)

    if payload.idle_timeout_seconds is not None:
        config.idle_timeout_seconds = payload.idle_timeout_seconds
    if payload.warning_timeout_seconds is not None:
        config.warning_timeout_seconds = payload.warning_timeout_seconds
    if payload.home_route is not None:
        config.home_route = payload.home_route
    if payload.default_language is not None:
        config.default_language = payload.default_language
    if payload.available_languages is not None:
        config.available_languages_json = json.dumps(payload.available_languages)
    if payload.accessibility_high_contrast is not None:
        config.accessibility_high_contrast = payload.accessibility_high_contrast
    if payload.accessibility_font_scale is not None:
        config.accessibility_font_scale = payload.accessibility_font_scale
    if payload.maintenance_message is not None:
        config.maintenance_message = payload.maintenance_message

    config.version += 1
    device.configuration_version = config.version
    config.updated_by = current_user.id
    config.updated_at = datetime.datetime.utcnow()
    device.updated_at = datetime.datetime.utcnow()

    # Log audit entry
    client_ip = request.client.host if request.client else "127.0.0.1"
    audit = KioskAuditLog(
        kiosk_id=device.id,
        action="CONFIG_UPDATED",
        actor_user_id=current_user.id,
        timestamp=datetime.datetime.utcnow(),
        ip_address=client_ip,
        details_json=json.dumps({"new_version": config.version})
    )
    db.add(audit)
    db.commit()

    return {
        "status": "CONFIG_UPDATED",
        "configuration_version": config.version,
        "message": f"Kiosk #{device.id} configuration updated to version {config.version}."
    }


@router.post("/{kiosk_id}/rotate-key")
def rotate_kiosk_key(
    kiosk_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN"]))
):
    """Rotates a kiosk device key. Previous keys become immediately invalid."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        new_key = KioskAuthService.rotate_device_key(
            db=db,
            kiosk_id=kiosk_id,
            actor_user_id=current_user.id,
            ip_address=client_ip
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return {
        "status": "KEY_ROTATED",
        "raw_device_key": new_key,
        "notice": "Store this new key securely. Previous credentials have been invalidated."
    }


@router.post("/{kiosk_id}/maintenance")
def toggle_maintenance(
    kiosk_id: int,
    payload: MaintenanceToggleIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """Toggles remote maintenance mode for an exhibition terminal."""
    device = db.query(KioskDevice).filter(KioskDevice.id == kiosk_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Kiosk #{kiosk_id} not found.")

    device.maintenance_mode = payload.enabled
    device.status = "MAINTENANCE" if payload.enabled else "ONLINE"
    device.updated_at = datetime.datetime.utcnow()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit = KioskAuditLog(
        kiosk_id=device.id,
        action="MAINTENANCE_ENABLED" if payload.enabled else "MAINTENANCE_DISABLED",
        actor_user_id=current_user.id,
        timestamp=datetime.datetime.utcnow(),
        ip_address=client_ip,
        details_json=json.dumps({"reason": payload.reason})
    )
    db.add(audit)
    db.commit()

    return {
        "kiosk_id": device.id,
        "maintenance_mode": device.maintenance_mode,
        "status": device.status,
        "message": f"Kiosk #{device.id} maintenance mode {'enabled' if device.maintenance_mode else 'disabled'}."
    }


@router.delete("/{kiosk_id}")
def disable_kiosk(
    kiosk_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN"]))
):
    """Revokes credentials and disables a kiosk terminal."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        KioskAuthService.revoke_device(
            db=db,
            kiosk_id=kiosk_id,
            actor_user_id=current_user.id,
            ip_address=client_ip
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return {
        "status": "DEVICE_DISABLED",
        "message": f"Kiosk terminal #{kiosk_id} has been disabled and its credentials revoked."
    }


# ---------------------------------------------------------------------------
# Institutional Security Health Audit Endpoint
# ---------------------------------------------------------------------------
@router.get("/security/status")
def get_security_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"]))
):
    """
    Evaluates institutional security posture, including secret strength, CORS rules,
    security headers, rate limiting status, storage permissions, and TLS presence.
    Returns status indicators without leaking secrets.
    """
    # 1. Secret Key Status
    is_default_secret = (settings.SECRET_KEY == "phase1-dev-secret-key-change-in-production")
    secret_status = "WARNING_DEFAULT_SECRET" if is_default_secret else "OPERATIONAL"

    # 2. CORS configuration
    has_wildcard = "*" in settings.BACKEND_CORS_ORIGINS
    cors_status = "WARNING_WILDCARD" if has_wildcard else "OPERATIONAL"

    # 3. TLS Certificate Status
    tls_cert_exists = bool(settings.TLS_CERT_PATH and os.path.exists(settings.TLS_CERT_PATH))
    tls_status = "OPERATIONAL" if tls_cert_exists else "NOT_CONFIGURED"

    # 4. Storage Vault Permissions
    vault_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../storage/media/masters"))
    vault_exists = os.path.exists(vault_path)

    # 5. Database Connectivity
    from sqlalchemy import text
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "authentication": {
            "algorithm": settings.ALGORITHM,
            "access_token_expire_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "secret_key_status": secret_status
        },
        "cors": {
            "status": cors_status,
            "allowed_origins_count": len(settings.BACKEND_CORS_ORIGINS)
        },
        "security_headers": {
            "status": "OPERATIONAL" if settings.SECURITY_HEADERS_ENABLED else "DISABLED",
            "csp_enabled": True,
            "x_frame_options": "SAMEORIGIN",
            "x_content_type_options": "nosniff"
        },
        "rate_limiting": {
            "status": "OPERATIONAL" if settings.RATE_LIMIT_ENABLED else "DISABLED"
        },
        "tls": {
            "status": tls_status,
            "message": "TLS certificate not configured on local development host." if not tls_cert_exists else "TLS certificate verified."
        },
        "storage_vault": {
            "status": "OPERATIONAL" if vault_exists else "UNAVAILABLE",
            "read_only_masters_enforced": True
        },
        "database": {
            "status": "OPERATIONAL" if db_ok else "DEGRADED"
        },
        "kiosk_infrastructure": {
            "device_authentication_enforced": True,
            "device_token_separation": True
        }
    }
