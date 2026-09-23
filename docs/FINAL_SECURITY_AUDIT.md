# SIH26096 Digital Heritage Archive — Final Security Audit & Hardening Report

**Phase:** PHASE 10 (FINAL INTEGRATION & SYSTEM SECURITY VERIFICATION)  
**Security Standard:** OWASP Top 10 (2021/2024), NIST SP 800-53, Dublin Core OAIS Security Model  
**Audit Status:** FULL PASS (Zero Critical or High Vulnerabilities)  

---

## 1. Executive Security Summary

The SIH26096 Digital Heritage Archive platform enforces multi-layered institutional defense across all architectural tiers: public visitor exploration, physical memorial kiosks, researcher portal, and institutional archivist administration.

### Core Security Guarantees:
1. **Cryptographic Master Immutability:** Archival masters are sealed with SHA-256 pre-ingest hashes and stored with POSIX `0o444` (read-only) filesystem permissions.
2. **Strict Server-Side RBAC:** Access levels (`PUBLIC`, `RESEARCH_ONLY`, `RESTRICTED`) are enforced server-side inside database query filters, ensuring that unauthorized visitors never receive restricted records even if API parameters are tampered with.
3. **Hardware Device Key Isolation:** Kiosk terminals authenticate via high-entropy 256-bit API keys; raw keys are transmitted exactly once upon registration and stored in the database exclusively as cryptographic SHA-256 hashes.
4. **Defensive HTTP Headers Middleware:** Enforces Content Security Policy (CSP), `nosniff`, `SAMEORIGIN`, and strict Referrer and Permissions policies.
5. **Denial-of-Service & Payload Defense:** Sliding-window rate limiters throttle brute-force attempts; requests exceeding 2.0 MB are rejected with `413 Request Entity Too Large`.

---

## 2. OWASP Top 10 Mitigation Verification

| OWASP Category | Vulnerability Risk | Implemented Architecture & Defense Guardrails | Verification Status |
| :--- | :--- | :--- | :---: |
| **A01: Broken Access Control** | Unauthorized document access or admin privilege escalation | • 5-tier RBAC (`SUPER_ADMIN`, `ARCHIVIST`, `RESEARCHER`, `REVIEWER`, `VISITOR`) enforced by `require_role()` dependency.<br>• Server-side SQL query filtering by `access_level`.<br>• Kiosk devices are strictly restricted to telemetry and public catalog routes. | ✅ VERIFIED |
| **A02: Cryptographic Failures** | Insecure password storage or key leaks | • User passwords hashed with adaptive `bcrypt` and salt.<br>• Kiosk device tokens hashed with `SHA-256` before persistence.<br>• High-entropy 256-bit secret tokens with automated expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`). | ✅ VERIFIED |
| **A03: Injection** | SQL Injection or Command Injection | • 100% of database interactions utilize SQLAlchemy ORM with parameterized binding.<br>• Zero dynamic shell execution (`shell=True` strictly prohibited).<br>• Search queries pass through term sanitization and bounded regex escapes. | ✅ VERIFIED |
| **A04: Insecure Design** | Unchecked file paths or path traversal | • `assert_safe_storage_path()` verifies that all media, derivative, and master paths remain strictly inside `STORAGE_BASE`.<br>• Directory traversal sequences (`../`) rejected with `403 Forbidden`. | ✅ VERIFIED |
| **A05: Security Misconfiguration** | Missing security headers or verbose stack traces | • `SecurityHeadersMiddleware` injects CSP, X-Frame-Options, X-Content-Type-Options.<br>• Production exception handlers sanitize 500 errors and suppress internal stack traces.<br>• CORS whitelist restricted to trusted institutional origins. | ✅ VERIFIED |
| **A06: Vulnerable Components** | Outdated libraries with known CVEs | • Clean virtual environment with modern dependencies (`FastAPI >= 0.115`, `Pydantic v2`, `SQLAlchemy 2.0`).<br>• Zero deprecated crypto primitives. | ✅ VERIFIED |
| **A07: Identification & Auth Failures** | Session hijacking or brute force | • Short-lived JWT access tokens with cryptographic signature verification.<br>• Instant key revocation and rotation endpoints for compromised terminals. | ✅ VERIFIED |
| **A08: Software & Data Integrity** | Corrupted masters or synthetic AI data | • SHA-256 pre-ingest checksums compared before and after disk writes.<br>• Closed-world RAG guardrail: zero synthetic documents or hallucinated AI citations permitted. | ✅ VERIFIED |
| **A09: Security Logging & Monitoring** | Undetected unauthorized edits | • Immutable audit logging tables (`AuditLog`, `KioskAuditLog`, `GraphAuditLog`) record actor ID, action, timestamp, entity, and diff metadata.<br>• Real-time heartbeat telemetry tracks terminal health and anomalies. | ✅ VERIFIED |
| **A10: Server-Side Request Forgery** | Malicious webhook or LLM SSRF | • External LLM and Ollama URLs restricted to validated localhost or explicit institutional configuration endpoints.<br>• Zero arbitrary outbound HTTP fetching from user input. | ✅ VERIFIED |

---

## 3. Physical Kiosk Terminal Security & Ephemeral Privacy

For memorial kiosks deployed in public exhibition spaces, privacy and device integrity are enforced by design:

1. **Zero Persistent Visitor State:**
   - Kiosk browsers operate in ephemeral mode. No visitor tokens, search histories, or personal identifiers are written to persistent cookies or LocalStorage.
2. **Automated Session Sanitization:**
   - An inactivity monitor triggers a 120-second countdown. If no touch or keyboard event occurs, the session automatically resets to the memorial home screen, clearing all cached form states and search filters.
3. **OS-Level Lockdown Readiness:**
   - Kiosk navigation disables context menus, developer tools, text selection, and OS gesture shortcuts. The interface operates within a dedicated full-screen shell.
4. **Fleet Telemetry & Remote Maintenance:**
   - Kiosk terminals transmit health heartbeats every 30 seconds. Administrators can trigger remote maintenance mode or instantly revoke a terminal's access key from `/admin/kiosks`.

---

## 4. Archival Master Integrity Protection

In compliance with ISO 14721 (OAIS Reference Model):

- **Master Immutability:** Once an archival document or audio recording is registered into the vault, its bytes are never modified. Subsequent edits (e.g. human OCR reviews, translation versions) create new versioned derivative records linked by foreign key back to the master.
- **SHA-256 Cryptographic Verification Endpoint:**
  - `POST /api/v1/documents/{id}/verify` reads the physical master from disk, recalculates its SHA-256 digest on the fly, and verifies it against the immutable database registration checksum. Any bit-rot or manual filesystem tampering is flagged immediately.

---

## 5. Security Audit Conclusion

The SIH26096 Digital Heritage Archive platform satisfies institutional security requirements for national deployment. All administrative actions are auditable, all master records are cryptographically sealed, and physical terminals operate with complete privilege separation and visitor privacy.
