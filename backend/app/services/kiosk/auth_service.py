"""
Kiosk Device Authentication Service.
Handles device registration, secure credential generation, key rotation, and request authentication.
Stores only SHA-256 hashes of device keys; never stores or logs plaintext device secrets.
Enforces strict separation between visitor/admin user tokens and physical kiosk device credentials.
"""
import uuid
import secrets
import hashlib
import datetime
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Header, HTTPException, status, Depends

from app.db.models import KioskDevice, KioskConfiguration, KioskAuditLog
from app.db.session import get_db


def hash_device_key(raw_key: str) -> str:
    """Computes SHA-256 cryptographic hash of a raw device key."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_device_key() -> str:
    """Generates a high-entropy, cryptographically secure device key."""
    entropy = secrets.token_hex(24)
    return f"kiosk_live_{uuid.uuid4().hex[:12]}_{entropy}"


class KioskAuthService:
    @classmethod
    def register_device(
        cls,
        db: Session,
        device_name: str,
        institution: str = "Dr. Ambedkar National Memorial",
        location: str = "Exhibition Hall A",
        kiosk_type: str = "TOUCHSCREEN_PEDESTAL",
        hardware_fingerprint: Optional[str] = None,
        capabilities_json: Optional[str] = None,
        actor_user_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[KioskDevice, str]:
        """
        Registers a new kiosk terminal, initializes default configuration,
        and returns the newly created KioskDevice along with its raw plaintext key (shown once).
        """
        device_uuid = f"kiosk-{uuid.uuid4().hex[:12]}"
        raw_key = generate_device_key()
        key_hash = hash_device_key(raw_key)

        device = KioskDevice(
            device_uuid=device_uuid,
            device_name=device_name,
            institution=institution,
            location=location,
            kiosk_type=kiosk_type,
            status="REGISTERED",
            device_key_hash=key_hash,
            registered_at=datetime.datetime.utcnow(),
            software_version="1.9.0",
            configuration_version=1,
            hardware_fingerprint=hardware_fingerprint,
            capabilities_json=capabilities_json,
            enabled=True,
            created_at=datetime.datetime.utcnow()
        )
        db.add(device)
        db.commit()
        db.refresh(device)

        # Initialize default configuration
        config = KioskConfiguration(
            kiosk_id=device.id,
            version=1,
            idle_timeout_seconds=120,
            warning_timeout_seconds=15,
            home_route="/",
            default_language="en",
            available_languages_json='["en", "hi", "mr", "ta"]',
            accessibility_high_contrast=False,
            accessibility_font_scale="normal",
            maintenance_message="This exhibition terminal is currently undergoing scheduled maintenance.",
            updated_by=actor_user_id,
            updated_at=datetime.datetime.utcnow()
        )
        db.add(config)

        # Log audit entry
        audit = KioskAuditLog(
            kiosk_id=device.id,
            action="KIOSK_REGISTERED",
            actor_user_id=actor_user_id,
            timestamp=datetime.datetime.utcnow(),
            ip_address=ip_address,
            details_json=f'{{"device_name": "{device_name}", "institution": "{institution}", "location": "{location}"}}'
        )
        db.add(audit)
        db.commit()
        db.refresh(device)

        return device, raw_key

    @classmethod
    def rotate_device_key(
        cls,
        db: Session,
        kiosk_id: int,
        actor_user_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """Rotates a kiosk device key, invalidating the previous credential."""
        device = db.query(KioskDevice).filter(KioskDevice.id == kiosk_id).first()
        if not device:
            raise ValueError(f"Kiosk #{kiosk_id} not found.")

        new_raw_key = generate_device_key()
        device.device_key_hash = hash_device_key(new_raw_key)
        device.updated_at = datetime.datetime.utcnow()

        audit = KioskAuditLog(
            kiosk_id=device.id,
            action="DEVICE_KEY_ROTATED",
            actor_user_id=actor_user_id,
            timestamp=datetime.datetime.utcnow(),
            ip_address=ip_address,
            details_json='{"reason": "Administrative key rotation"}'
        )
        db.add(audit)
        db.commit()
        return new_raw_key

    @classmethod
    def revoke_device(
        cls,
        db: Session,
        kiosk_id: int,
        actor_user_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ):
        """Disables a kiosk and revokes all active credentials."""
        device = db.query(KioskDevice).filter(KioskDevice.id == kiosk_id).first()
        if not device:
            raise ValueError(f"Kiosk #{kiosk_id} not found.")

        device.enabled = False
        device.status = "DISABLED"
        # Scramble hash so old keys can never match
        device.device_key_hash = hash_device_key(f"revoked_{uuid.uuid4().hex}")
        device.updated_at = datetime.datetime.utcnow()

        audit = KioskAuditLog(
            kiosk_id=device.id,
            action="DEVICE_REVOKED",
            actor_user_id=actor_user_id,
            timestamp=datetime.datetime.utcnow(),
            ip_address=ip_address,
            details_json='{"status": "DISABLED"}'
        )
        db.add(audit)
        db.commit()

    @classmethod
    def authenticate_device(cls, db: Session, raw_key: str) -> Optional[KioskDevice]:
        """Validates a raw device key against the stored SHA-256 hash."""
        if not raw_key or not raw_key.startswith("kiosk_live_"):
            return None

        key_hash = hash_device_key(raw_key)
        device = db.query(KioskDevice).filter(
            KioskDevice.device_key_hash == key_hash,
            KioskDevice.enabled == True
        ).first()
        return device

    # Alias for verify_device_key
    verify_device_key = authenticate_device



def get_current_kiosk_device(
    authorization: Optional[str] = Header(None),
    x_kiosk_key: Optional[str] = Header(None, alias="X-Kiosk-Device-Key"),
    db: Session = Depends(get_db)
) -> KioskDevice:
    """
    FastAPI dependency for authenticating kiosk device API calls.
    Extracts key from 'Authorization: Bearer <key>' or 'X-Kiosk-Device-Key: <key>'.
    Rejects unauthorized or revoked devices.
    """
    raw_key = None
    if authorization and authorization.startswith("Bearer "):
        raw_key = authorization.replace("Bearer ", "").strip()
    elif x_kiosk_key:
        raw_key = x_kiosk_key.strip()

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kiosk device authentication required. Missing device key."
        )

    device = KioskAuthService.authenticate_device(db, raw_key)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked kiosk device key."
        )

    if not device.enabled or device.status == "DISABLED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This kiosk device terminal has been disabled by institutional administrators."
        )

    return device
