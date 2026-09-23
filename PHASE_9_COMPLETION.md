# Phase 9 Completion Report: Kiosk Hardware, Deployment & Security

**Project**: SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar  
**Phase**: PHASE 9 — KIOSK HARDWARE + DEPLOYMENT + SECURITY  
**Date**: September 23, 2026  
**Status**: **COMPLETED & VERIFIED** (Zero Regressions, 148 Tests Passing, 25/25 Phase 9 Tests Passing, Clean Frontend Build)

---

## 1. Verified Real-World Environment Audit

In strict accordance with the **Radical Transparency & Hardware Honesty Invariant**, all integrations report real-world host status without simulation or synthetic fabrication:

| Subsystem / Capability | Reported Status | Verification Mechanism / Technical Details |
| :--- | :--- | :--- |
| **Primary Display** | `OPERATIONAL` | Native Windows `SM_CXSCREEN`/`SM_CYSCREEN` query via `user32.dll`. |
| **Touchscreen Digitizer** | `NOT_DETECTED` | Windows `GetSystemMetrics(94)` explicitly returned 0; mouse pointer active. |
| **Keyboard & Pointer (Mouse)** | `OPERATIONAL` | Windows `GetSystemMetrics(19)` = 1 (pointer active); HID devices present. |
| **Audio Output (Speaker)** | `OPERATIONAL` | Python standard `wave` + Windows audio subsystem active. |
| **Microphone Input** | `OPERATIONAL` | Standard audio input drivers detected. |
| **Camera / Scanner** | `OPERATIONAL` | DirectShow/MediaFoundation driver detected. |
| **Printer / RFID / NFC** | `NOT_CONFIGURED` | No external receipt/RFID hardware attached. |
| **PostgreSQL Windows Service** | `UNAVAILABLE` | Local Windows service not running; SQLite dev db verified. |
| **SQLite Fallback** | `OPERATIONAL (FALLBACK)` | `archive_phase1.db` at Alembic migration head `c8f2910d5403`. |
| **Docker / Docker Compose** | `UNAVAILABLE` | Production Compose manifest generated; Docker daemon not on PATH. |
| **Nginx / Caddy Proxy** | `UNAVAILABLE` | Reverse proxy configuration generated; direct ASGI active on dev host. |
| **TLS / HTTPS Termination** | `NOT_CONFIGURED` | Local dev server running HTTP; production Nginx TLS config ready. |
| **FFmpeg / FFprobe** | `UNAVAILABLE` | Native Python media processor (`wave`, `PIL`, `cv2`) active. |
| **Whisper Transcription** | `UNAVAILABLE` | Reports `TRANSCRIPTION_PROVIDER_UNAVAILABLE`; no synthetic transcripts. |

---

## 2. Completed Architecture Deliverables

### 2.1 Backend Services & Database Models
1. **Database Schema & Models** (`backend/app/db/models.py` & migration `c8f2910d5403`):
   - `KioskDevice`: Physical terminal registration, location, device key SHA-256 hash, status.
   - `KioskHeartbeatRecord`: CPU, RAM, Disk, App Health, DB Health telemetry history.
   - `KioskConfiguration`: Idle timeout, warning timeout, home route, language, accessibility, maintenance notices.
   - `KioskAuditLog`: Immutable institutional audit trail of key rotations, registrations, and maintenance toggles.
   - `OfflinePackage`: Package manifest versions and cryptographic fingerprints.
2. **Hardware Abstraction Layer**:
   - `backend/app/services/kiosk/hardware/base.py`: Enums (`HardwareType`, `DeviceStatus`), `HardwareDevice` dataclass.
   - `backend/app/services/kiosk/hardware/system_hardware.py`: Genuine system inspection using Windows APIs.
   - `backend/app/services/kiosk/hardware/capability_reporter.py`: Structured capability report generator.
3. **Authentication & Fleet Services**:
   - `backend/app/services/kiosk/auth_service.py`: High-entropy key generation (`kiosk_live_<uuid>_<hex>`), SHA-256 hashing, rotation, revocation, and `get_current_kiosk_device` dependency.
   - `backend/app/services/kiosk/heartbeat_service.py`: Telemetry ingestion, state calculation (`ONLINE` $\le 90\text{s}$, `STALE` $90\text{--}300\text{s}$, `OFFLINE` $> 300\text{s}$, `MAINTENANCE`), and server directives.
   - `backend/app/services/kiosk/offline_service.py`: Read-only offline package manifest generation and SHA-256 verification.
4. **Security Hardening Middleware** (`backend/app/core/security_middleware.py` & `main.py`):
   - Injected headers: CSP, X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, Referrer-Policy, Permissions-Policy, conditional HSTS.
   - In-memory sliding window rate limiter (Auth: 15/m, Kiosk: 120/m, Search: 60/m, Research: 40/m, Default: 300/m).
   - Payload size limits (413 on >2MB for non-upload endpoints).
   - Production error sanitization (500 errors masked to prevent credential/trace leakage).
5. **System Probes & Endpoints**:
   - Top-level & API probes: `/health/live`, `/health/ready`, `/health/dependencies`, `/api/system/version`.
   - Fleet API: `/api/v1/admin/kiosks` (list, register, detail, update config, rotate key, toggle maintenance, disable).
   - Security Audit API: `/api/v1/admin/kiosks/security/status`.
   - Terminal API: `/api/v1/kiosk/heartbeat`, `/api/v1/kiosk/config`, `/api/v1/kiosk/status`, `/api/v1/kiosk/offline-manifest`.

### 2.2 Frontend Touchscreen & Admin Interface
1. **Ephemeral Visitor Privacy & Inactivity Reset** (`frontend/src/context/KioskContext.tsx` & `KioskInactivityModal.tsx`):
   - Touch/pointer activity detection across `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`.
   - Inactivity countdown: At $120\text{s} - 15\text{s} = 105\text{s}$ idle, modal appears with a 15-second countdown circle.
   - Session Reset: Clears search queries, RAG temporary context, halts media playback, resets font/contrast, and returns to home screen.
   - Invariant: Never deletes or touches archival master records or audit logs.
2. **Terminal Maintenance Overlay** (`frontend/src/components/kiosk/KioskMaintenanceOverlay.tsx`):
   - Displays full-screen non-dismissible notice when remote maintenance is active.
3. **Offline Cache Notification** (`frontend/src/components/layout/KioskBar.tsx`):
   - Real-time online/offline banner indicating local verified package serving.
4. **Admin Kiosk Fleet Portal** (`frontend/src/pages/admin/AdminKiosksPage.tsx`):
   - Summary metric cards (Total, Online, Stale, Offline, Maintenance, Disabled).
   - Terminal registration modal displaying raw device API key once with copy button and security notice.
   - Remote maintenance switch and navigation to detailed telemetry.
5. **Admin Kiosk Detail Portal** (`frontend/src/pages/admin/AdminKioskDetailPage.tsx`):
   - Detailed hardware capability breakdown, CPU/RAM/Disk telemetry timeline.
   - Policy configuration editor (idle timeout, warning window, default language, maintenance message).
   - Instant device key rotation modal and terminal disabling.
6. **Institutional Security Dashboard** (`frontend/src/pages/admin/AdminSecurityPage.tsx`):
   - Live audit of HTTP security headers, rate limiting rules, master vault permissions (`0o444`), and host capability honesty.
7. **Frontend Routing & Navigation**:
   - Mounted `/admin/kiosks`, `/admin/kiosks/:id`, `/admin/security` in `App.tsx` and added sidebar links in `AdminLayout.tsx`.
   - Verified clean production build with Vite (`npm run build` passed in 10.83s).

### 2.3 Production Deployment & Operational Artifacts
1. `docker-compose.production.yml`: Complete multi-container architecture (PostgreSQL 16, Redis 7, FastAPI, Nginx reverse proxy, read-only master volume mount `:ro`).
2. `nginx/nginx.conf` & `nginx/conf.d/archive.conf`: Production reverse proxy configuration with rate limiting zones, gzip, static caching, and security headers.
3. `.env.example`: Full production environment configuration template.
4. `scripts/kiosk/windows_kiosk_launch.bat` & `scripts/kiosk/linux_kiosk_launch.sh`: Dedicated locked-down kiosk workstation startup scripts.
5. `scripts/backup/backup_archive.py` & `scripts/backup/restore_verification.py`: Cryptographically verified backup creation and non-destructive restore validation tools (both tested and verified).

---

## 3. Verification & Test Evidence

### 3.1 Phase 9 Test Suite (`pytest tests/test_phase9.py`)
All **25 tests passed cleanly** in 3.08s:
- `test_system_hardware_detection_honest` (PASSED)
- `test_capability_reporter_structure` (PASSED)
- `test_kiosk_device_registration` (PASSED)
- `test_kiosk_device_key_verification` (PASSED)
- `test_kiosk_key_rotation` (PASSED)
- `test_kiosk_device_revocation` (PASSED)
- `test_kiosk_heartbeat_recording` (PASSED)
- `test_kiosk_status_transitions` (PASSED)
- `test_offline_package_manifest_generation` (PASSED)
- `test_offline_package_manifest_integrity` (PASSED)
- `test_security_headers_middleware` (PASSED)
- `test_rate_limiter_enforcement` (PASSED)
- `test_payload_size_limit` (PASSED)
- `test_health_live_probe` (PASSED)
- `test_health_ready_probe` (PASSED)
- `test_health_dependencies_probe` (PASSED)
- `test_system_version_endpoint` (PASSED)
- `test_admin_kiosks_list_endpoint` (PASSED)
- `test_admin_kiosk_register_endpoint` (PASSED)
- `test_admin_kiosk_detail_and_config_update` (PASSED)
- `test_admin_kiosk_maintenance_toggle` (PASSED)
- `test_admin_security_status_endpoint` (PASSED)
- `test_ephemeral_privacy_and_master_immutability` (PASSED)
- `test_kiosk_device_key_cannot_access_admin_routes` (PASSED)
- `test_unauthenticated_and_visitor_access_to_admin_denied` (PASSED)

### 3.2 Full Regression Suite Across All Phases
Full project test execution (`pytest -v`):
- **148 tests passing cleanly** across Phases 1 through 9.
- Zero regressions in Document Ingestion, Provenance, OCR, Hybrid Search, Grounded RAG, Multilingual, Speech/Audio, Knowledge Graph, or Timeline Curation.

### 3.3 Frontend Build Verification
- `npm run build` (`tsc -b && vite build`): **0 TypeScript errors**, compiled in 10.83s.

---

## 4. Summary of Files Created / Modified

### Backend Files
- `backend/app/db/models.py` (Added `KioskDevice`, `KioskHeartbeatRecord`, `KioskConfiguration`, `KioskAuditLog`, `OfflinePackage`)
- `backend/alembic/versions/c8f2910d5403_phase9_kiosk_deployment_security_models.py` (Alembic migration)
- `backend/app/core/config.py` (Phase 9 configuration parameters)
- `backend/app/core/security_middleware.py` (Security headers, rate limiting, payload size defense)
- `backend/app/services/kiosk/hardware/base.py` (Hardware enums and base classes)
- `backend/app/services/kiosk/hardware/system_hardware.py` (Genuine system hardware detection)
- `backend/app/services/kiosk/hardware/capability_reporter.py` (Capability audit report generator)
- `backend/app/services/kiosk/auth_service.py` (Device key generation, hashing, rotation, revocation)
- `backend/app/services/kiosk/heartbeat_service.py` (Telemetry processing and state calculation)
- `backend/app/services/kiosk/offline_service.py` (Offline package manifest generation & verification)
- `backend/app/api/v1/endpoints/health.py` (Probes: `/health/live`, `/health/ready`, `/health/dependencies`, `/system/version`)
- `backend/app/api/v1/endpoints/kiosk.py` (Kiosk heartbeat, config, status, offline manifest)
- `backend/app/api/v1/endpoints/admin_kiosks.py` (Admin fleet management & security status)
- `backend/app/api/v1/api.py` (Mounted kiosk and admin kiosk routers)
- `backend/app/main.py` (Registered `SecurityHeadersMiddleware` and top-level health probes)
- `backend/tests/test_phase9.py` (25 automated test cases)

### Frontend Files
- `frontend/src/services/kioskApi.ts` (API client for kiosk fleet and security endpoints)
- `frontend/src/components/kiosk/KioskInactivityModal.tsx` (Visual 15-second countdown modal)
- `frontend/src/components/kiosk/KioskMaintenanceOverlay.tsx` (Full-screen maintenance overlay)
- `frontend/src/context/KioskContext.tsx` (Enhanced inactivity tracking, session reset, and offline detection)
- `frontend/src/components/layout/KioskBar.tsx` (Added offline cache badge and immediate session reset)
- `frontend/src/pages/admin/AdminKiosksPage.tsx` (Fleet monitoring and registration portal)
- `frontend/src/pages/admin/AdminKioskDetailPage.tsx` (Detailed telemetry, policy editor, key rotation)
- `frontend/src/pages/admin/AdminSecurityPage.tsx` (Institutional security posture & capability audit)
- `frontend/src/pages/admin/AdminLayout.tsx` (Added Kiosk Fleet & Security navigation items)
- `frontend/src/App.tsx` (Mounted `/admin/kiosks`, `/admin/kiosks/:id`, `/admin/security` routes)

### Deployment, Documentation & Operational Files
- `docker-compose.production.yml`
- `nginx/nginx.conf` & `nginx/conf.d/archive.conf`
- `.env.example`
- `scripts/kiosk/windows_kiosk_launch.bat`
- `scripts/kiosk/linux_kiosk_launch.sh`
- `scripts/backup/backup_archive.py`
- `scripts/backup/restore_verification.py`
- `docs/PHASE_9_KIOSK_DEPLOYMENT.md`
- `docs/SECURITY_MODEL.md`
- `docs/KIOSK_OPERATIONS_RUNBOOK.md`
- `PHASE_9_COMPLETION.md`
