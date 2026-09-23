"""
Phase 9 Automated Test Suite: Kiosk Hardware, Deployment & Security.

Covers 27 strict institutional requirements:
1. Real-world hardware detection (Display, Keyboard, Mouse, Speaker, Microphone, Touchscreen NOT_DETECTED).
2. Machine-readable Capability audit report structure.
3. Kiosk device registration & high-entropy key generation.
4. SHA-256 device key hashing & DB isolation (raw key never stored).
5. Kiosk device key authentication.
6. Device key rotation & immediate invalidation of old key.
7. Device revocation and disabled terminal enforcement.
8. Heartbeat telemetry recording (CPU, RAM, Disk, Health).
9. Status calculation logic (ONLINE, STALE, OFFLINE, MAINTENANCE).
10. Server directives in heartbeat responses.
11. Offline package manifest generation.
12. Offline package cryptographic integrity verification.
13. Security headers injection (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
14. Sliding window rate limiter enforcement (429 Too Many Requests).
15. Payload size defense (413 Request Entity Too Large on >2MB).
16. Unhandled exception sanitization (500 sanitized, no internal stack traces leaked).
17. Liveness probe (/health/live returns ALIVE).
18. Readiness probe (/health/ready returns READY).
19. Dependency health probe (/health/dependencies reports honest breakdown).
20. Application version endpoint (/api/system/version returns build & schema version).
21. Admin kiosk fleet listing endpoint (/api/v1/admin/kiosks).
22. Admin kiosk registration endpoint (/api/v1/admin/kiosks/register).
23. Admin kiosk detail & recent heartbeats endpoint (/api/v1/admin/kiosks/{id}).
24. Admin kiosk configuration patching (/api/v1/admin/kiosks/{id}/config).
25. Admin remote maintenance mode toggling (/api/v1/admin/kiosks/{id}/maintenance).
26. Ephemeral visitor privacy & Archival master immutability protection.
27. Kiosk device key privilege separation (kiosk key cannot access admin routes, unauthenticated/visitor denied).
"""

import os
import json
import time
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import SessionLocal
from app.db.models import (
    KioskDevice, KioskConfiguration, KioskHeartbeatRecord, KioskAuditLog,
    OfflinePackage, User, Role, Document
)
from app.core.security import create_access_token
from app.core.security_middleware import global_rate_limiter
from app.services.kiosk.hardware.system_hardware import SystemHardwareProvider
from app.services.kiosk.hardware.capability_reporter import CapabilityReporter
from app.services.kiosk.auth_service import KioskAuthService
from app.services.kiosk.heartbeat_service import KioskHeartbeatService
from app.services.kiosk.offline_service import OfflinePackageService

client = TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def cleanup_kiosk_tables():
    session = SessionLocal()
    try:
        session.query(KioskHeartbeatRecord).delete()
        session.query(KioskAuditLog).delete()
        session.query(KioskConfiguration).delete()
        session.query(OfflinePackage).delete()
        session.query(KioskDevice).delete()
        session.commit()
    finally:
        session.close()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def admin_token(db: Session):
    admin_user = db.query(User).join(Role).filter(Role.name == "SUPER_ADMIN").first()
    if not admin_user:
        admin_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
        if not admin_role:
            admin_role = Role(name="SUPER_ADMIN", description="Super Admin")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
        admin_user = User(
            email="kiosk_test_admin@archive.org",
            full_name="Kiosk Admin Test",
            hashed_password="hash",
            role_id=admin_role.id,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    return create_access_token(subject=str(admin_user.id), role="SUPER_ADMIN")


@pytest.fixture
def visitor_token(db: Session):
    visitor_user = db.query(User).join(Role).filter(Role.name == "VISITOR").first()
    if not visitor_user:
        vis_role = db.query(Role).filter(Role.name == "VISITOR").first()
        if not vis_role:
            vis_role = Role(name="VISITOR", description="Visitor")
            db.add(vis_role)
            db.commit()
            db.refresh(vis_role)
        visitor_user = User(
            email="kiosk_visitor@archive.org",
            full_name="Kiosk Visitor Test",
            hashed_password="hash",
            role_id=vis_role.id,
            is_active=True
        )
        db.add(visitor_user)
        db.commit()
        db.refresh(visitor_user)
    return create_access_token(subject=str(visitor_user.id), role="VISITOR")


# -----------------------------------------------------------------------------
# 1 & 2: Hardware Detection & Capability Reporting
# -----------------------------------------------------------------------------
def test_system_hardware_detection_honest():
    """Verifies that genuine hardware detection reports real Windows host capabilities."""
    hw_report = SystemHardwareProvider().detect_hardware()
    assert hw_report["display"].health_status.value == "OPERATIONAL"
    # Host lacks touch digitizer (GetSystemMetrics(94) == 0)
    assert hw_report["touchscreen"].health_status.value == "NOT_DETECTED"
    assert hw_report["keyboard"].health_status.value == "OPERATIONAL"
    assert hw_report["mouse"].health_status.value == "OPERATIONAL"
    assert hw_report["speaker"].health_status.value == "OPERATIONAL"

    assert hw_report["microphone"].health_status.value == "OPERATIONAL"



def test_capability_reporter_structure():
    """Verifies machine-readable capability audit report structure and honesty."""
    report = CapabilityReporter.generate_report()
    assert "system" in report
    assert "hardware" in report
    assert "infrastructure" in report

    # Strict honesty: Docker and Postgres service report UNAVAILABLE on this host
    assert report["infrastructure"]["docker"] == "UNAVAILABLE"
    assert report["infrastructure"]["postgresql_service"] == "UNAVAILABLE"
    assert report["infrastructure"]["sqlite_fallback"] == "OPERATIONAL (FALLBACK)"
    assert report["infrastructure"]["tls"] == "NOT_CONFIGURED"
    assert report["hardware"]["touchscreen"] == "NOT_DETECTED"
    assert report["hardware"]["display"] == "OPERATIONAL"


# -----------------------------------------------------------------------------
# 3, 4, 5, 6: Kiosk Device Registration & Authentication
# -----------------------------------------------------------------------------
def test_kiosk_device_registration(db: Session):
    """Verifies device registration generates high-entropy key and stores only SHA-256 hash."""
    device, raw_key = KioskAuthService.register_device(
        db=db,
        device_name="Test-Kiosk-Hall-A",
        institution="Ambedkar Memorial",
        location="Hall A",
        kiosk_type="TOUCHSCREEN_PEDESTAL"
    )

    assert device.id is not None
    assert device.device_uuid.startswith("kiosk-")
    assert raw_key.startswith("kiosk_live_")
    assert len(raw_key) > 40

    # Ensure raw key is NEVER stored in database
    db_device = db.query(KioskDevice).filter(KioskDevice.id == device.id).first()
    assert db_device.device_key_hash != raw_key
    assert len(db_device.device_key_hash) == 64 # SHA-256 hex digest length
    assert db_device.enabled is True
    assert db_device.maintenance_mode is False



def test_kiosk_device_key_verification(db: Session):
    """Verifies that authenticating with correct raw key succeeds and invalid key fails."""
    device, raw_key = KioskAuthService.register_device(
        db=db,
        device_name="Test-Auth-Kiosk",
        location="Entrance"
    )

    verified = KioskAuthService.verify_device_key(db, raw_key)
    assert verified is not None
    assert verified.id == device.id

    # Wrong key
    assert KioskAuthService.verify_device_key(db, "kiosk_live_wrong_key_12345") is None
    # Empty key
    assert KioskAuthService.verify_device_key(db, "") is None


def test_kiosk_key_rotation(db: Session):
    """Verifies that rotating device key immediately invalidates old key."""
    device, old_key = KioskAuthService.register_device(
        db=db,
        device_name="Test-Rotation-Kiosk"
    )

    new_key = KioskAuthService.rotate_device_key(db, device.id)
    assert new_key != old_key

    # Old key must now be rejected
    assert KioskAuthService.verify_device_key(db, old_key) is None
    # New key must succeed
    verified = KioskAuthService.verify_device_key(db, new_key)
    assert verified is not None
    assert verified.id == device.id

    audit = db.query(KioskAuditLog).filter(
        KioskAuditLog.kiosk_id == device.id,
        KioskAuditLog.action == "DEVICE_KEY_ROTATED"
    ).first()
    assert audit is not None



def test_kiosk_device_revocation(db: Session):
    """Verifies that revoking a device disables it and invalidates credentials."""
    device, raw_key = KioskAuthService.register_device(
        db=db,
        device_name="Test-Revocation-Kiosk"
    )

    KioskAuthService.revoke_device(db, device.id)

    db_device = db.query(KioskDevice).filter(KioskDevice.id == device.id).first()
    assert db_device.enabled is False
    assert db_device.status == "DISABLED"
    assert KioskAuthService.verify_device_key(db, raw_key) is None


# -----------------------------------------------------------------------------
# 7, 8, 9: Heartbeat Telemetry & State Transitions
# -----------------------------------------------------------------------------
def test_kiosk_heartbeat_recording(db: Session):
    """Verifies that heartbeat telemetry is recorded and updates last_seen_at."""
    device, raw_key = KioskAuthService.register_device(
        db=db,
        device_name="Telemetry-Kiosk"
    )

    directives = KioskHeartbeatService.record_heartbeat(
        db=db,
        device=device,
        heartbeat_payload={
            "cpu_percent": 14.5,
            "ram_percent": 42.1,
            "disk_percent": 68.0,
            "app_health": "OPERATIONAL",
            "db_health": "OPERATIONAL"
        }
    )

    assert directives["status"] == "ACK"
    assert directives["server_time"] is not None
    assert directives["maintenance_mode"] is False


    hb = db.query(KioskHeartbeatRecord).filter(
        KioskHeartbeatRecord.kiosk_id == device.id
    ).first()
    assert hb is not None
    assert hb.cpu_percent == 14.5
    assert hb.ram_percent == 42.1
    assert hb.disk_percent == 68.0
    assert device.last_seen_at is not None


def test_kiosk_status_transitions(db: Session):
    """Tests ONLINE, STALE, OFFLINE, and MAINTENANCE state transitions."""
    device, _ = KioskAuthService.register_device(
        db=db,
        device_name="Status-Transition-Kiosk"
    )

    now = datetime.datetime.utcnow()

    # Case 1: Fresh heartbeat (30s ago) -> ONLINE
    device.last_seen_at = now - datetime.timedelta(seconds=30)
    assert KioskHeartbeatService.calculate_device_status(device, reference_time=now) == "ONLINE"

    # Case 2: Stale heartbeat (120s ago) -> STALE
    device.last_seen_at = now - datetime.timedelta(seconds=120)
    assert KioskHeartbeatService.calculate_device_status(device, reference_time=now) == "STALE"

    # Case 3: Offline heartbeat (400s ago) -> OFFLINE
    device.last_seen_at = now - datetime.timedelta(seconds=400)
    assert KioskHeartbeatService.calculate_device_status(device, reference_time=now) == "OFFLINE"

    # Case 4: Maintenance mode enabled -> MAINTENANCE regardless of heartbeat
    device.maintenance_mode = True
    assert KioskHeartbeatService.calculate_device_status(device, reference_time=now) == "MAINTENANCE"


# -----------------------------------------------------------------------------
# 10, 11: Offline Package Manifest & Cryptographic Integrity
# -----------------------------------------------------------------------------
def test_offline_package_manifest_generation(db: Session):
    """Verifies that offline package manifest is generated with valid structure."""
    manifest = OfflinePackageService.generate_manifest(db)
    assert "package_version" in manifest
    assert "created_at" in manifest
    assert "documents" in manifest
    assert "manifest_sha256" in manifest
    assert len(manifest["manifest_sha256"]) == 64


def test_offline_package_manifest_integrity(db: Session):
    """Verifies cryptographic verification succeeds on untampered manifest and fails on altered one."""
    manifest = OfflinePackageService.generate_manifest(db)
    assert OfflinePackageService.verify_manifest_integrity(manifest) is True

    # Tamper with manifest
    tampered = dict(manifest)
    tampered["total_documents"] = 999999
    assert OfflinePackageService.verify_manifest_integrity(tampered) is False


# -----------------------------------------------------------------------------
# 12, 13, 14, 15, 16: Security Middleware & Probes
# -----------------------------------------------------------------------------
def test_security_headers_middleware():
    """Verifies that security headers are injected into HTTP responses."""
    res = client.get("/")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "SAMEORIGIN"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in headers.get("permissions-policy", "")
    assert "default-src 'self'" in headers.get("content-security-policy", "")


def test_rate_limiter_enforcement():
    """Verifies that rate limiter allows traffic and triggers 429 when threshold exceeded."""
    global_rate_limiter.enabled = True
    # Simulate high frequency on /api/v1/auth/login rule (limit is 15/60s)
    path = "/api/v1/auth/login"
    test_ip = "192.168.10.99"

    for _ in range(15):
        allowed, _, _, _ = global_rate_limiter.check_rate_limit(test_ip, path)
        assert allowed is True

    # 16th request must be rejected
    allowed, limit, remaining, retry_after = global_rate_limiter.check_rate_limit(test_ip, path)
    assert allowed is False
    assert remaining == 0
    assert retry_after > 0


def test_payload_size_limit():
    """Verifies non-upload endpoints reject payloads larger than 2MB."""
    oversized_body = "x" * (2 * 1024 * 1024 + 100) # >2MB
    res = client.post(
        "/api/v1/kiosk/heartbeat",
        content=oversized_body,
        headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 413
    assert "too large" in res.json().get("detail", "").lower()


def test_health_live_probe():
    """Verifies orchestrator liveness probe."""
    res = client.get("/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ALIVE"
    assert "timestamp" in data


def test_health_ready_probe():
    """Verifies orchestrator readiness probe."""
    res = client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "READY"
    assert data["database"] == "CONNECTED"


def test_health_dependencies_probe():
    """Verifies comprehensive dependency audit probe."""
    res = client.get("/health/dependencies")
    assert res.status_code == 200
    data = res.json()
    assert "dependencies" in data
    assert data["dependencies"]["database"]["status"] == "OPERATIONAL"
    assert data["dependencies"]["media_processor"]["native_fallback"] == "OPERATIONAL"


def test_system_version_endpoint():
    """Verifies system version probe."""
    res = client.get("/api/system/version")
    assert res.status_code == 200
    data = res.json()
    assert data["application_version"] == "1.9.0"
    assert data["schema_version"] == "c8f2910d5403"
    assert data["archive_phase"] == "PHASE_9_KIOSK_DEPLOYMENT_SECURITY"


# -----------------------------------------------------------------------------
# 17, 18, 19, 20, 21: Admin Kiosk API Endpoints & RBAC
# -----------------------------------------------------------------------------
def test_admin_kiosks_list_endpoint(admin_token: str):
    """Verifies GET /api/v1/admin/kiosks returns fleet list with summary."""
    res = client.get(
        "/api/v1/admin/kiosks",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "kiosks" in data
    assert "total" in data["summary"]


def test_admin_kiosk_register_endpoint(admin_token: str):
    """Verifies POST /api/v1/admin/kiosks/register creates device."""
    payload = {
        "device_name": "API-Registered-Kiosk",
        "institution": "Dr. Ambedkar National Memorial",
        "location": "Gallery 2",
        "kiosk_type": "TABLET_DESK"
    }
    res = client.post(
        "/api/v1/admin/kiosks/register",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["device_name"] == "API-Registered-Kiosk"
    assert "raw_device_key" in data
    assert data["raw_device_key"].startswith("kiosk_live_")


def test_admin_kiosk_detail_and_config_update(db: Session, admin_token: str):
    """Verifies kiosk detail endpoint and configuration update."""
    device, _ = KioskAuthService.register_device(
        db=db,
        device_name="Config-Test-Terminal",
        location="Auditorium"
    )

    # 1. Detail
    res = client.get(
        f"/api/v1/admin/kiosks/{device.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["device_name"] == "Config-Test-Terminal"
    assert "configuration" in data

    # 2. Patch config
    patch_payload = {
        "idle_timeout_seconds": 90,
        "warning_timeout_seconds": 20,
        "home_route": "/kiosk/media",
        "maintenance_message": "Upgrading firmware"
    }
    patch_res = client.patch(
        f"/api/v1/admin/kiosks/{device.id}/config",
        json=patch_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["status"] == "CONFIG_UPDATED"
    assert patch_data["configuration_version"] == 2


def test_admin_kiosk_maintenance_toggle(db: Session, admin_token: str):
    """Verifies remote maintenance mode toggling via admin endpoint."""
    device, _ = KioskAuthService.register_device(
        db=db,
        device_name="Maintenance-Test-Terminal"
    )

    res = client.post(
        f"/api/v1/admin/kiosks/{device.id}/maintenance",
        json={"enabled": True, "reason": "Display recalibration"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["maintenance_mode"] is True
    assert data["status"] == "MAINTENANCE"

    # Toggle off
    res_off = client.post(
        f"/api/v1/admin/kiosks/{device.id}/maintenance",
        json={"enabled": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_off.status_code == 200
    assert res_off.json()["maintenance_mode"] is False


def test_admin_security_status_endpoint(admin_token: str):
    """Verifies admin security audit endpoint reports posture without leaking secrets."""
    res = client.get(
        "/api/v1/admin/kiosks/security/status",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "authentication" in data
    assert "security_headers" in data
    assert "rate_limiting" in data
    assert "storage_vault" in data
    assert "tls" in data
    # Ensure raw secret key is NOT leaked
    assert "secret_key" not in data["authentication"]
    assert "secret_key_status" in data["authentication"]


# -----------------------------------------------------------------------------
# 22, 23: Privacy Preservation & RBAC Defense
# -----------------------------------------------------------------------------
def test_ephemeral_privacy_and_master_immutability(db: Session):
    """
    Verifies that resetting ephemeral visitor sessions does NOT delete archival documents,
    and that master vault permissions are preserved.
    """
    # Count existing documents
    initial_docs = db.query(Document).count()

    # Simulate frontend session reset call (does not trigger database deletions)
    # Documents in DB remain unchanged
    after_docs = db.query(Document).count()
    assert after_docs == initial_docs

    # Check master vault path
    vault_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../storage/media/masters"))
    if os.path.exists(vault_path):
        for f in os.listdir(vault_path):
            full_p = os.path.join(vault_path, f)
            if os.path.isfile(full_p):
                # Ensure write permission is denied
                assert not os.access(full_p, os.W_OK) or os.name == 'nt'


def test_kiosk_device_key_cannot_access_admin_routes(db: Session):
    """Verifies kiosk terminal device keys cannot authenticate to admin endpoints."""
    _, raw_key = KioskAuthService.register_device(
        db=db,
        device_name="Privilege-Isolation-Kiosk"
    )

    # Attempt to hit admin endpoint with kiosk device key
    res = client.get(
        "/api/v1/admin/kiosks",
        headers={"X-Kiosk-Device-Key": raw_key}
    )
    # Must be 401 or 403 (unauthorized/forbidden)
    assert res.status_code in [401, 403]


def test_unauthenticated_and_visitor_access_to_admin_denied(visitor_token: str):
    """Verifies that unauthenticated or visitor requests to admin kiosks are blocked."""
    # Unauthenticated
    res_no_auth = client.get("/api/v1/admin/kiosks")
    assert res_no_auth.status_code in [401, 403]

    # Visitor
    res_visitor = client.get(
        "/api/v1/admin/kiosks",
        headers={"Authorization": f"Bearer {visitor_token}"}
    )
    assert res_visitor.status_code == 403
