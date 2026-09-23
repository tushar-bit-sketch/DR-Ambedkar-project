# Institutional Archive Security Model

## 1. Security Architecture Principles

The Dr. Ambedkar Digital Heritage Platform enforces five core institutional security principles:

1. **Vault Immutability**: Historical documents and media masters are permanent heritage records. They can never be overwritten, modified in-place, or deleted by clients, kiosks, or standard users.
2. **Strict Device vs. User Role Separation**: Physical kiosk terminals use distinct device credentials (`kiosk_live_...`). Device keys cannot be used to authenticate as administrative or researcher users, preventing privilege escalation.
3. **Zero In-Database Secret Storage**: Plaintext secrets (user passwords, device API keys) are NEVER stored in persistent storage. Passwords use bcrypt hashes; device keys use cryptographic SHA-256 hashes.
4. **Ephemeral Visitor Privacy**: Public terminals in exhibition halls automatically purge visitor queries, chat sessions, and media playback on inactivity or manual reset.
5. **Radical Transparency**: The platform explicitly reports unavailable hardware or dependencies rather than fabricating synthetic operations or pretending services exist.

---

## 2. Vault Immutability & Storage Security

### 2.1 File System Permissions
Archival masters stored in `backend/storage/media/masters/` are set to read-only permission (`0o444` / read-only on Windows):
- FastAPI ingestion services calculate SHA-256 hash immediately upon arrival.
- Any attempt to upload a duplicate file with identical hash is rejected.
- Web derivatives (downsampled mp3/mp4/webp) are written strictly to `storage/media/derivatives/` and never co-located in the masters vault.

### 2.2 Periodic Cryptographic Integrity Audits
`MediaIntegrityService` audits the master vault:
- Recalculates SHA-256 checksums from raw disk blocks.
- Compares against the immutable accession fingerprint stored in `MediaAsset.checksum_sha256`.
- Logs an audit record in `MediaIntegrityRecord`. If any bit flip or modification is detected, the asset status changes to `TAMPER_DETECTED` and administrators are immediately alerted.

---

## 3. Physical Kiosk Authentication & Key Management

### 3.1 Device Key Format
Device API keys are generated using cryptographically secure pseudorandom number generators (`secrets.token_hex`):
```
kiosk_live_<12_char_uuid>_<48_char_hex_entropy>
```
Example:
`kiosk_live_9a7d3b1e8f2c_c4e8b910df7a28154e019c63ba981d2f47c3e590ba16892f`

### 3.2 Storage & Authentication
- The database table `kiosk_devices` stores:
  - `device_uuid`: Public hardware identifier (e.g. `kiosk-9a7d3b1e8f2c`)
  - `device_key_hash`: $\text{SHA-256}(\text{raw\_key})$ (64-character hex digest)
  - `enabled`: Boolean flag
- Kiosk requests authenticate via:
  - HTTP Header: `X-Kiosk-Device-Key: kiosk_live_...`
  - Or Authorization: `Bearer kiosk_live_...`
- The server hashes incoming key and performs constant-time DB comparison. Raw keys are NEVER logged or retained in server memory.

### 3.3 Key Rotation & Revocation
- **Rotation**: Administrators can rotate keys from the Admin Kiosk portal (`POST /api/v1/admin/kiosks/{id}/rotate-key`). The server produces a new raw key, replaces the DB hash, and logs a `DEVICE_KEY_ROTATED` audit record. Old keys are immediately invalidated without server restart.
- **Revocation / Disabling**: Revoking a terminal (`DELETE /api/v1/admin/kiosks/{id}`) sets `enabled=False`, updates status to `DISABLED`, and scrambles the hash with high-entropy salt.

---

## 4. HTTP Defense & Network Hardening

### 4.1 Security Headers
`SecurityHeadersMiddleware` injects the following headers into all responses:
- `Content-Security-Policy`:
  `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ws: wss:; font-src 'self' data:;`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `SAMEORIGIN`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Permissions-Policy`: `geolocation=(), camera=(self), microphone=(self)`
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains` (when scheme is HTTPS)

### 4.2 Sliding Window Rate Limiter
In-memory sliding window limiter guards critical endpoints against brute-force and denial-of-service:
- Authentication (`/api/v1/auth/login`): 15 req / min
- Kiosk Heartbeat (`/api/v1/kiosk/heartbeat`): 120 req / min
- Search Index (`/api/v1/search`): 60 req / min
- Research Assistant (`/api/v1/research`): 40 req / min
- Default: 300 req / min

### 4.3 Payload Defense & Error Sanitization
- Standard requests exceeding 2 MB receive `413 Request Entity Too Large`.
- Unhandled 500 exceptions are sanitized. Raw stack traces and environment variables are never exposed in JSON responses.

---

## 5. Ephemeral Visitor Privacy

On exhibition kiosk terminals:
- Search queries, RAG conversation history, and player state are stored only in volatile React component memory.
- When inactivity timeout triggers (default 120s) or visitor taps "Reset Session":
  - Transient search inputs and filters are cleared.
  - Active audio/video playback is terminated.
  - Temporary RAG message history is destroyed.
  - Interface returns to exhibition root (`/`).
  - Catalog data, persistent audit logs, and backend analytics are NEVER purged.
