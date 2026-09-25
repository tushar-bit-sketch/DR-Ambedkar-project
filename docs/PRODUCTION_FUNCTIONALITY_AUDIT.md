# PRODUCTION FUNCTIONALITY AUDIT & ARCHITECTURAL GAP ANALYSIS
**Project**: Dr. B. R. Ambedkar Digital Heritage Archive (SIH26096)  
**Date of Audit**: September 25, 2026  
**Auditor**: Antigravity Autonomous Engineering Agent  
**Audit Target**: Full-Stack Architecture (FastAPI Backend + React 19 Frontend + SQLite/Postgres DB + AI/NLP Services)

---

## EXECUTIVE SUMMARY

An exhaustive, non-destructive code and runtime audit was conducted across the 24 core architectural subsystems of the Dr. B. R. Ambedkar Digital Heritage Archive repository. 

The audit reveals a **structurally advanced and domain-faithful digital heritage archive** featuring deep institutional compliance (OAIS framework, cryptographic provenance, multilingual Indic NLP, and verified RAG). However, several **critical blockers prevent immediate production deployment**:
1. **Database Schema Drift**: SQLite database (`archive_phase1.db`) was initialized prior to recent migration scripts, causing runtime query crashes (e.g. `timeline_events.date_precision` missing column exception).
2. **API Contract Mismatches**: Key frontend methods (e.g. `unifiedSearch()` calling `/api/v1/search/unified`) target non-existent or deprecated routes.
3. **Route Collision**: Duplicate route registrations exist in backend routers (e.g. `@router.get("/kiosk/feed")` defined twice in `media.py`).
4. **Security Vulnerabilities**: Plaintext administrative and researcher passwords are hardcoded in the frontend client (`AuthContext.tsx`), and User Management UI is backed by static mock arrays with no backend CRUD endpoints.
5. **Runtime Virtual Environment Misconfiguration**: `backend/venv/pyvenv.cfg` references a stale user directory path, breaking automated scripts unless invoked through active Python runtimes.

The findings below outline the subsystem-by-subsystem status, exact code references, failure modes, synthesis, and an actionable implementation roadmap (P0 through P5).

---

## SUBSYSTEM-BY-SUBSYSTEM AUDIT (1 TO 24)

### 1. Frontend Routes and Pages
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - Routing configuration: `frontend/src/App.tsx`
  - Pages: `frontend/src/pages/HomePage.tsx`, `SearchPage.tsx`, `DocumentDetailPage.tsx`, `ResearchAssistantPage.tsx`, `OcrCorrectionPage.tsx`, `TimelinePage.tsx`, `KnowledgeGraphPage.tsx`, `MediaArchivePage.tsx`, `ProvenanceVerificationPage.tsx`, `KioskModePage.tsx`, `AdminOverviewPage.tsx`, `AdminIngestionPage.tsx`, `AdminOcrQueuePage.tsx`, `AdminProvenancePage.tsx`, `AdminKiosksPage.tsx`, `AdminAnalyticsPage.tsx`, `AdminUsersPage.tsx`, `LoginPage.tsx`, `SystemStatusPage.tsx`, `DemoPage.tsx`.
- **API Endpoints Exposed/Connected**: Connects to all v1 endpoints via Axios client.
- **Database Tables Backing**: N/A (Frontend layer).
- **Specific Failure Modes / Missing Pieces**:
  - `AdminUsersPage.tsx` relies completely on static mock data (`usersList` array) because no backend user management endpoints exist.
  - `/documents/:documentId` is properly connected to canonical documents and viewer desks, but deep link param parsing requires active backend document responses.

### 2. Frontend API Calls
- **Status**: PARTIALLY IMPLEMENTED / BROKEN CONTRACTS
- **Files Implementing**:
  - `frontend/src/services/api.ts`
  - `frontend/src/services/kioskApi.ts`
  - `frontend/src/services/mediaApi.ts`
  - `frontend/src/services/demoApi.ts`
- **API Endpoints Connected**:
  - Targets 32+ backend endpoints across `/api/v1/*`.
- **Database Tables Backing**: N/A.
- **Specific Failure Modes / Missing Pieces**:
  - `unifiedSearch()` invokes `GET /api/v1/search/unified` which does NOT exist on the backend (Backend exposes `POST /api/v1/search` and `GET /api/v1/search/suggestions`).
  - `queryResearchAssistant()` invokes `POST /api/v1/research/query`, which the backend has retired under the Zero-Canned-Answer rule. (Components use `askResearchAssistant` -> `POST /api/v1/research/ask`).
  - Missing standardized TypeScript interfaces for some backend error payloads (`detail` vs `message`).

### 3. Backend API Endpoints
- **Status**: IMPLEMENTED (With Route Conflicts)
- **Files Implementing**:
  - `backend/app/api/v1/api.py` (Central router aggregator)
  - `backend/app/api/v1/endpoints/documents.py`
  - `backend/app/api/v1/endpoints/research.py`
  - `backend/app/api/v1/endpoints/search.py`
  - `backend/app/api/v1/endpoints/auth.py`
  - `backend/app/api/v1/endpoints/ocr.py`
  - `backend/app/api/v1/endpoints/files.py`
  - `backend/app/api/v1/endpoints/timeline.py`
  - `backend/app/api/v1/endpoints/media.py`
  - `backend/app/api/v1/endpoints/entities.py`
  - `backend/app/api/v1/endpoints/graph.py`
  - `backend/app/api/v1/endpoints/translations.py`
  - `backend/app/api/v1/endpoints/audio.py`
  - `backend/app/api/v1/endpoints/provenance.py`
  - `backend/app/api/v1/endpoints/admin.py`
  - `backend/app/api/v1/endpoints/kiosk.py`
  - `backend/app/api/v1/endpoints/admin_kiosks.py`
  - `backend/app/api/v1/endpoints/demo.py`
  - `backend/app/api/v1/endpoints/system_status.py`
- **Specific Failure Modes / Missing Pieces**:
  - **Route Collision**: In `backend/app/api/v1/endpoints/media.py`, `@router.get("/kiosk/feed")` is defined twice (lines 187 and 274). The second definition overrides the first and creates ambiguity.
  - **Missing Endpoint**: No `/api/v1/search/unified` endpoint exists, causing `api.ts`'s unified search to return 404.
  - **Missing CRUD**: No `/api/v1/admin/users` endpoints exist for administrative user management.

### 4. Database Models and Migrations
- **Status**: BROKEN (Schema Drift in SQLite File)
- **Files Implementing**:
  - Models: `backend/app/db/models.py`
  - Session/Base: `backend/app/db/session.py`, `backend/app/db/base.py`
  - Alembic Migrations: `backend/alembic/versions/` (Versions 1 through 9)
  - Local SQLite Store: `backend/archive_phase1.db`
- **Database Tables Backing**:
  - `users`, `documents`, `document_versions`, `document_pages`, `document_chunks`, `tags`, `document_tags`, `ocr_queue`, `ocr_corrections`, `timeline_eras`, `timeline_events`, `entities`, `entity_mentions`, `relationships`, `provenance_records`, `provenance_audit_log`, `provenance_verification_ledger`, `kiosks`, `kiosk_sessions`, `kiosk_telemetry`, `media_assets`, `media_collections`, `media_collection_items`.
- **Specific Failure Modes / Missing Pieces**:
  - The SQLite database file on disk (`archive_phase1.db`) was generated prior to Alembic migrations 005-009.
  - Querying `TimelineEvent` crashes immediately: `sqlite3.OperationalError: no such column: timeline_events.date_precision`.
  - Missing columns in SQLite file: `date_precision`, `start_date`, `end_date`, `verification_status`, `provenance_type`, `confidence`, `evidence_text`, `document_version_id`, `page_id`, `chunk_id`, `media_asset_id`.

### 5. Authentication and Authorization
- **Status**: PARTIALLY IMPLEMENTED / SECURITY VULNERABILITY
- **Files Implementing**:
  - Backend: `backend/app/core/security.py`, `backend/app/api/v1/endpoints/auth.py`, `backend/app/api/deps.py`
  - Frontend: `frontend/src/context/AuthContext.tsx`, `frontend/src/pages/LoginPage.tsx`
- **API Endpoints Exposed**:
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
  - `POST /api/v1/auth/refresh`
- **Database Tables Backing**: `users`
- **Specific Failure Modes / Missing Pieces**:
  - `frontend/src/context/AuthContext.tsx` contains hardcoded production passwords in `ROLE_CREDENTIALS`:
    - `admin`: `AmbedkarArchive2026!`
    - `archivist`: `Archivist2026!`
    - `reviewer`: `Reviewer2026!`
    - `researcher`: `Researcher2026!`
  - Role switcher in client transmits these hardcoded credentials directly across the wire.
  - Several admin API endpoints in `admin.py` check `current_user` but lack strict RBAC scope enforcement.

### 6. File/Object Storage
- **Status**: IMPLEMENTED (Development Fallback Active)
- **Files Implementing**:
  - `backend/app/services/storage.py`
  - `backend/app/api/v1/endpoints/files.py`
- **API Endpoints Exposed**:
  - `POST /api/v1/files/upload`
  - `GET /api/v1/files/{file_id}`
- **Database Tables Backing**: `documents`, `media_assets`
- **Specific Failure Modes / Missing Pieces**:
  - Local file storage defaults to `storage/uploads/` on local disk.
  - S3 backend driver is implemented via `boto3` but requires S3 credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`).
  - Deployments on stateless platforms (e.g. Render/Vercel) without persistent volumes or S3 will lose uploaded files on restart.

### 7. Document Ingestion
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - `backend/app/services/ingestion.py`
  - `backend/app/api/v1/endpoints/admin.py` (`/admin/ingestion/upload`, `/admin/ingestion/queue`)
- **API Endpoints Exposed**:
  - `POST /api/v1/admin/ingestion/upload`
  - `GET /api/v1/admin/ingestion/queue`
- **Database Tables Backing**: `documents`, `document_versions`, `document_pages`, `document_chunks`, `ocr_queue`
- **Specific Failure Modes / Missing Pieces**:
  - Large PDF uploads block the synchronous thread unless processed asynchronously via background workers.
  - Fallback error handling when PyPDF2/pdf2image encounters corrupted or non-standard PDFs needs defensive try-catch isolation.

### 8. OCR Pipeline
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - `backend/app/services/ocr.py`
  - `backend/app/api/v1/endpoints/ocr.py`
  - `frontend/src/pages/OcrCorrectionPage.tsx`
  - `frontend/src/pages/AdminOcrQueuePage.tsx`
- **API Endpoints Exposed**:
  - `GET /api/v1/ocr/queue`
  - `POST /api/v1/ocr/corrections`
  - `POST /api/v1/ocr/process/{id}`
- **Database Tables Backing**: `ocr_queue`, `ocr_corrections`, `document_pages`
- **Specific Failure Modes / Missing Pieces**:
  - Requires Tesseract binary installed in host OS (`tesseract-ocr`). Falls back to mock OCR when binary is absent.
  - Submitting corrections successfully updates `ocr_corrections` table, but re-indexing the corresponding `document_chunks` and vector embeddings upon approval is not yet automated.

### 9. Search/Indexing
- **Status**: PARTIALLY IMPLEMENTED
- **Files Implementing**:
  - Backend: `backend/app/services/search.py`, `backend/app/api/v1/endpoints/search.py`
  - Frontend: `frontend/src/pages/SearchPage.tsx`, `frontend/src/services/api.ts`
- **API Endpoints Exposed**:
  - `POST /api/v1/search`
  - `GET /api/v1/search/suggestions`
  - `GET /api/v1/search/facets`
- **Database Tables Backing**: `documents`, `document_chunks`, `tags`
- **Specific Failure Modes / Missing Pieces**:
  - Missing `GET /api/v1/search/unified` endpoint which `frontend/src/services/api.ts` attempts to call.
  - BM25 full-text indexing in SQLite uses `LIKE %term%` queries rather than SQLite FTS5 virtual tables.

### 10. Embeddings/Vector Retrieval
- **Status**: IMPLEMENTED (Development Fallback Active)
- **Files Implementing**:
  - `backend/app/services/vector_store.py`
  - `backend/app/services/embeddings.py`
- **API Endpoints Exposed**: Internal service invoked by `/search` and `/research/ask`.
- **Database Tables Backing**: `document_chunks` (vector embedding BLOB).
- **Specific Failure Modes / Missing Pieces**:
  - System defaults to `sqlite_dev_fallback` vector engine using NumPy float32 cosine similarity in RAM.
  - Does not support high-concurrency production retrieval without connecting to pgvector or Qdrant.

### 11. RAG/Research Assistant
- **Status**: IMPLEMENTED (Zero-Canned-Answer Compliant)
- **Files Implementing**:
  - `backend/app/services/rag.py`
  - `backend/app/api/v1/endpoints/research.py`
  - `frontend/src/pages/ResearchAssistantPage.tsx`
- **API Endpoints Exposed**:
  - `POST /api/v1/research/ask`
  - `POST /api/v1/research/verify-claim`
  - `POST /api/v1/research/query` (Explicitly retired with compliance disclaimer)
- **Database Tables Backing**: `document_chunks`, `documents`, `provenance_records`
- **Specific Failure Modes / Missing Pieces**:
  - When OpenAI/Gemini/Anthropic API keys are absent, RAG falls back to a deterministic local retrieval-summarizer.
  - Frontend components attempting to call legacy `/research/query` receive 400 Bad Request unless using `/research/ask`.

### 12. Citations/Evidence
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - `backend/app/services/rag.py`
  - `frontend/src/pages/DocumentDetailPage.tsx`
  - `frontend/src/components/research/EvidenceDrawer.tsx`
- **API Endpoints Exposed**: Embedded in `/research/ask` response payload.
- **Database Tables Backing**: `document_chunks`, `document_pages`, `documents`
- **Specific Failure Modes / Missing Pieces**:
  - Deep linking from citations (`/documents/:documentId?page=N&highlight=...`) operates smoothly on canonical documents, but lacks fallback UI when a cited chunk ID is orphaned in the database.

### 13. Provenance/Integrity
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - `backend/app/services/provenance.py`
  - `backend/app/api/v1/endpoints/provenance.py`
  - `frontend/src/pages/ProvenanceVerificationPage.tsx`
  - `frontend/src/pages/AdminProvenancePage.tsx`
- **API Endpoints Exposed**:
  - `GET /api/v1/provenance/verify/{doc_id}`
  - `GET /api/v1/provenance/audit/{doc_id}`
- **Database Tables Backing**: `provenance_records`, `provenance_audit_log`, `provenance_verification_ledger`
- **Specific Failure Modes / Missing Pieces**:
  - Cryptographic verification recalculates SHA256 hashes against original file storage. If local storage files are missing on disk, verification throws a 404/500 rather than returning a clean `VERIFICATION_FAILED_FILE_MISSING` status code.

### 14. Media/Audio/Video
- **Status**: PARTIALLY IMPLEMENTED (Route Collision)
- **Files Implementing**:
  - `backend/app/api/v1/endpoints/media.py`
  - `frontend/src/pages/MediaArchivePage.tsx`
  - `frontend/src/services/mediaApi.ts`
- **API Endpoints Exposed**:
  - `GET /api/v1/media`
  - `GET /api/v1/media/{id}`
  - `POST /api/v1/media/upload`
  - `GET /api/v1/media/collections`
  - `GET /api/v1/media/kiosk/feed`
- **Database Tables Backing**: `media_assets`, `media_collections`, `media_collection_items`
- **Specific Failure Modes / Missing Pieces**:
  - **Duplicate route**: In `media.py`, `@router.get("/kiosk/feed")` is defined twice (lines 187 and 274).
  - Media streaming does not implement HTTP Range headers (RFC 7233) for efficient video scrubbing.

### 15. Timeline
- **Status**: BROKEN (Schema Drift)
- **Files Implementing**:
  - Backend: `backend/app/api/v1/endpoints/timeline.py`, `backend/app/services/timeline.py`
  - Frontend: `frontend/src/pages/TimelinePage.tsx`
- **API Endpoints Exposed**:
  - `GET /api/v1/timeline`
  - `GET /api/v1/timeline/eras`
  - `GET /api/v1/timeline/{event_id}`
- **Database Tables Backing**: `timeline_eras`, `timeline_events`
- **Specific Failure Modes / Missing Pieces**:
  - Calling `GET /api/v1/timeline` crashes immediately with `sqlite3.OperationalError: no such column: timeline_events.date_precision`.
  - Frontend timeline falls back to empty or static state when backend endpoint errors out.

### 16. Knowledge Graph / Entities
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - `backend/app/api/v1/endpoints/entities.py`
  - `backend/app/api/v1/endpoints/graph.py`
  - `backend/app/services/knowledge_graph.py`
  - `frontend/src/pages/KnowledgeGraphPage.tsx`
- **API Endpoints Exposed**:
  - `GET /api/v1/entities`
  - `GET /api/v1/entities/{id}`
  - `GET /api/v1/graph`
  - `GET /api/v1/graph/neighbors/{entity_id}`
- **Database Tables Backing**: `entities`, `entity_mentions`, `relationships`
- **Specific Failure Modes / Missing Pieces**:
  - Graph rendering in D3/Canvas slows down noticeably if entity node count exceeds 500 without server-side depth limiting.

### 17. Multilingual Functionality
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - `backend/app/services/translation.py`
  - `backend/app/api/v1/endpoints/translations.py`
  - `frontend/src/components/research/BilingualViewer.tsx`
- **API Endpoints Exposed**:
  - `POST /api/v1/translations/translate`
  - `GET /api/v1/translations/supported-languages`
- **Database Tables Backing**: Cached translations in document versions.
- **Specific Failure Modes / Missing Pieces**:
  - Uses IndicTrans / MarianMT / Google Translate API fallbacks. In offline mode, unsupported language pairs return untranslated text.

### 18. TTS / STT
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - `backend/app/services/audio.py`
  - `backend/app/api/v1/endpoints/audio.py`
  - `frontend/src/components/audio/AudioPlayer.tsx`
- **API Endpoints Exposed**:
  - `POST /api/v1/audio/tts`
  - `POST /api/v1/audio/stt`
- **Database Tables Backing**: N/A
- **Specific Failure Modes / Missing Pieces**:
  - Relies on system `espeak` / `gTTS` or cloud speech services. Returns mock audio tone when TTS dependencies are not installed in the OS.

### 19. Background Jobs
- **Status**: PARTIALLY IMPLEMENTED
- **Files Implementing**:
  - `backend/app/core/celery_app.py`
  - FastAPI `BackgroundTasks` in endpoints
- **API Endpoints Exposed**: Internal processing
- **Database Tables Backing**: `ocr_queue`
- **Specific Failure Modes / Missing Pieces**:
  - Celery worker is configured for Redis/RabbitMQ, but local development relies on synchronous in-process execution. If Redis is unavailable, tasks fall back to synchronous execution or FastAPI background tasks.

### 20. Admin Workflows
- **Status**: PARTIALLY IMPLEMENTED
- **Files Implementing**:
  - Backend: `backend/app/api/v1/endpoints/admin.py`, `admin_kiosks.py`
  - Frontend: `frontend/src/pages/AdminOverviewPage.tsx`, `AdminIngestionPage.tsx`, `AdminOcrQueuePage.tsx`, `AdminProvenancePage.tsx`, `AdminKiosksPage.tsx`, `AdminAnalyticsPage.tsx`, `AdminUsersPage.tsx`
- **API Endpoints Exposed**:
  - `GET /api/v1/admin/analytics/summary`
  - `GET /api/v1/admin/ingestion/queue`
  - `POST /api/v1/admin/ingestion/upload`
  - `GET /api/v1/admin/kiosks`
  - `PUT /api/v1/admin/kiosks/{id}/status`
- **Database Tables Backing**: `users`, `kiosks`, `ocr_queue`, `documents`
- **Specific Failure Modes / Missing Pieces**:
  - **Missing User Management**: `AdminUsersPage.tsx` cannot perform real user operations because no `/api/v1/admin/users` endpoints exist in the backend.

### 21. Error Handling
- **Status**: IMPLEMENTED
- **Files Implementing**:
  - Backend: `backend/app/main.py` (custom HTTP and validation exception handlers)
  - Frontend: `frontend/src/services/api.ts` (Axios response interceptor)
- **API Endpoints Exposed**: N/A
- **Database Tables Backing**: N/A
- **Specific Failure Modes / Missing Pieces**:
  - Backend returns `{ "detail": ... }` for standard errors, but some endpoints return `{ "error": ..., "message": ... }`, creating frontend display inconsistencies.

### 22. Environment / Configuration
- **Status**: PARTIALLY IMPLEMENTED / CONFIGURATION DRIFT
- **Files Implementing**:
  - `backend/app/core/config.py`
  - `backend/.env.example`
  - `frontend/.env.example`
  - `backend/venv/pyvenv.cfg`
- **Specific Failure Modes / Missing Pieces**:
  - `backend/venv/pyvenv.cfg` points to `C:\Users\tusha\...`, which is an invalid path on the current system (`C:\Users\Tushar\...`), causing `python.exe` invocation failures unless invoked with absolute path.
  - Default `.env` values do not provide valid API keys, requiring fallback modes to be robust and deterministic.

### 23. Tests
- **Status**: BROKEN (Failing Due to Database Schema Drift)
- **Files Implementing**:
  - `backend/tests/` (Test suite with 45+ test cases)
- **Specific Failure Modes / Missing Pieces**:
  - Running pytest crashes immediately with database operational errors (`sqlite3.OperationalError: no such column: timeline_events.date_precision`).
  - Unit tests require an in-memory SQLite database initialized with `Base.metadata.create_all(bind=engine)` rather than binding to stale disk files.

### 24. Production Deployment Readiness
- **Status**: PARTIALLY IMPLEMENTED
- **Files Implementing**:
  - Frontend: Vercel deployment configuration (`frontend/vercel.json`)
  - Backend: Dockerfile (`backend/Dockerfile`), `docker-compose.yml`
- **Specific Failure Modes / Missing Pieces**:
  - Frontend is successfully deployed to Vercel (`https://frontend-kappa-six-80.vercel.app`), but currently points to localhost or fallback endpoints.
  - Production backend needs a publicly hosted URL with PostgreSQL + pgvector, S3 bucket storage, and environment variables configured.

---

## SYNTHESIS & ARCHITECTURAL GAP ANALYSIS

### A. Current Architecture
The system consists of:
1. **Frontend**: A React 19 single-page application built with TypeScript, Tailwind CSS, Lucide icons, and Axios. It features an archival research desk, canonical document viewer, interactive D3/vis-network knowledge graph, bilingual viewer, and multi-role admin portal.
2. **Backend**: A FastAPI asynchronous REST API structured under `/api/v1`, utilizing SQLAlchemy ORM, Pydantic schemas, and modular domain services.
3. **Database**: Dual-mode data persistence supporting SQLite (local development) and PostgreSQL + pgvector (production).
4. **Storage Layer**: Local disk fallback with S3-compatible object storage abstractions.

### B. Implemented Functionality
- Canonical 3-pane archival document viewer (`/documents/:documentId`) with deep-linked page folios, high-resolution zoom, and transcript overlays.
- Zero-Canned-Answer RAG research assistant (`/api/v1/research/ask`) returning verbatim evidence and chunk-level citations.
- Cryptographic provenance engine with SHA256 hashing and verification ledger (`/provenance`).
- Multi-tier OCR review queue with human-in-the-loop correction and confidence scoring.
- Museum kiosk telemetry, heartbeat monitoring, and session management.
- Indic multilingual translation and speech synthesis/recognition pipelines.

### C. Broken Functionality
1. **Timeline API Query**: Calling `GET /api/v1/timeline` fails with `sqlite3.OperationalError: no such column: timeline_events.date_precision`.
2. **Pytest Test Suite**: Automated test suite fails to execute due to schema drift between `models.py` and the SQLite file.
3. **Duplicate Route in `media.py`**: Router defines `@router.get("/kiosk/feed")` twice, creating a routing conflict in FastAPI.

### D. Missing Functionality
1. **Unified Search Route**: `frontend/src/services/api.ts` defines `unifiedSearch()` calling `/api/v1/search/unified`, but no such backend route exists.
2. **Admin User Management CRUD**: `AdminUsersPage.tsx` exists in the frontend but is completely disconnected from the backend. The backend lacks `/api/v1/admin/users` endpoints.

### E. Security Problems
1. **Hardcoded Credentials**: `frontend/src/context/AuthContext.tsx` contains hardcoded administrative and staff passwords in plaintext.
2. **Missing Scope Enforcement**: Several admin endpoints in `backend/app/api/v1/endpoints/admin.py` check authentication but do not enforce role-based access control (RBAC) scopes.

### F. Data Persistence Problems
1. **SQLite Database Drift**: Migration scripts in `backend/alembic/versions/` were not applied to `archive_phase1.db`, leading to missing columns.
2. **In-Memory Vector Search**: Vector search defaults to in-memory NumPy cosine similarity, which will not scale or persist across process restarts.
3. **Local Ephemeral File Storage**: Uploaded files in `storage/uploads/` are lost when containerized instances recycle without persistent volumes.

### G. API Mismatches Matrix
| Frontend Call | Target Endpoint | Backend Reality | Status |
| :--- | :--- | :--- | :--- |
| `unifiedSearch()` | `GET /api/v1/search/unified` | Not defined in `search.py` | ❌ 404 Not Found |
| `queryResearchAssistant()` | `POST /api/v1/research/query` | Retired with 400 disclaimer | ⚠️ Use `/research/ask` |
| `fetchKioskFeed()` | `GET /api/v1/kiosk/feed` | Defined in `kiosk.py` & duplicate in `media.py` | ⚠️ Route Ambiguity |
| `fetchTimeline()` | `GET /api/v1/timeline` | Defined in `timeline.py` but DB query crashes | ❌ 500 SQLite Error |
| Admin User List | `GET /api/v1/admin/users` | Not defined in `admin.py` | ❌ Mock Array in UI |

### H. End-to-End Workflow Gaps
1. **OCR Correction -> Vector Reindexing**: Submitting an OCR correction updates `ocr_corrections` in the database, but does not trigger re-chunking and re-embedding of the corrected text in the vector store.
2. **Document Ingestion -> Search Availability**: When a document is ingested via `/admin/ingestion/upload`, it is added to the database and OCR queue, but background indexing into the full-text search index must be explicitly monitored and verified.

### I. Production Blockers
1. **Database Schema Out of Sync**: The application crashes when fetching timeline events or running tests.
2. **Client Credential Leak**: Plaintext passwords stored in compiled frontend JavaScript bundles.
3. **Stateless Storage Dependency**: Lack of persistent S3 storage configuration for hosted environments.

---

## RECOMMENDED IMPLEMENTATION ORDER & ROADMAP (P0 THROUGH P5)

### Phase P0: Core Stability & Database Repair (IMMEDIATE)
- [ ] **Fix Database Schema Drift**: Apply all Alembic migrations to `archive_phase1.db` or regenerate the schema using SQLAlchemy `Base.metadata.create_all()` to ensure all columns (e.g. `timeline_events.date_precision`) exist.
- [ ] **Resolve Route Conflicts**: Remove duplicate `@router.get("/kiosk/feed")` definition from `backend/app/api/v1/endpoints/media.py`.
- [ ] **Fix API Mismatches**: Implement `GET /api/v1/search/unified` in `backend/app/api/v1/endpoints/search.py` mapping to the search service.
- [ ] **Sanitize Frontend Auth**: Remove hardcoded passwords from `frontend/src/context/AuthContext.tsx` and implement secure token storage.
- [ ] **Verify Test Suite**: Ensure `pytest backend/tests` runs cleanly and passes 100%.

### Phase P1: Archival Search & Vector Retrieval Hardening
- [ ] Connect hybrid search (BM25 + Dense Retrieval) with standardized facet filtering across date, collection, language, and author.
- [ ] Add FTS5 virtual table or robust SQL fallback for fast full-text querying.
- [ ] Ensure vector store fallback persists embeddings to SQLite BLOBs consistently.

### Phase P2: Research Assistant (RAG) & Citation Integrity
- [ ] Wire `/api/v1/research/ask` directly to evidence drawer with click-to-highlight navigation to `/documents/:documentId`.
- [ ] Ensure all responses include exact folio page numbers, chunk IDs, and confidence scores.
- [ ] Implement robust local fallback summarizer when cloud LLM APIs are offline.

### Phase P3: Document Ingestion, OCR & Provenance Pipeline
- [ ] Automate re-chunking and vector re-indexing upon human approval of OCR corrections.
- [ ] Implement complete cryptographic verification with Merkle root ledger checks in `/provenance`.
- [ ] Connect S3/MinIO persistent object storage driver with automatic local directory fallback.

### Phase P4: Admin Subsystems, Kiosk Telemetry & User Management
- [ ] Implement backend `/api/v1/admin/users` CRUD endpoints with RBAC role enforcement.
- [ ] Connect `AdminUsersPage.tsx` to real backend user management API.
- [ ] Secure museum kiosk telemetry and heartbeat ping endpoints.

### Phase P5: Production Deployment & Verification
- [ ] Deploy containerized backend with PostgreSQL + pgvector and S3 storage.
- [ ] Connect production Vercel frontend (`https://frontend-kappa-six-80.vercel.app`) to live backend API.
- [ ] Perform comprehensive end-to-end integration testing and publish final verification report.
