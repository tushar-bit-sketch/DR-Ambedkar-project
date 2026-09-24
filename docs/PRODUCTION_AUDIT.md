# SIH26096 Production Archival Platform — Comprehensive Codebase Audit
**Date:** 2026-09-24  
**Audit Standard:** Zero-Demo / Zero-Canned-Answer / Operational Archival Integrity  
**Target Architecture:** Vercel (React 19 Frontend) → Production HTTPS FastAPI Backend → PostgreSQL + pgvector + S3 Object Storage → Real Hugging Face Inference

---

## 1. Executive Summary

This audit assesses the readiness of the Dr. B. R. Ambedkar Digital Heritage Archive for real institutional production deployment. The system contains an authentic primary archival foundation (33 catalogued BAWS/CAD historical documents, 105 indexed chunks, 31 timeline milestones, 35 knowledge graph entities, 5 media assets). However, multiple legacy demonstration shims, client-side fallback mocks, canned AI answer branches, and local storage workarounds remain embedded in the frontend and backend service code.

Under the **Zero-Fabrication / Absolute Honesty Rule**, all synthetic bypasses, canned responses, silent fallback data, and fake AI generators must be completely excised. If any backend subsystem is unavailable, the user interface must transparently declare **`UNAVAILABLE`** rather than feigning operational success.

---

## 2. Feature-by-Feature Production Audit Matrix

| Feature | Current Implementation | Real / Fake / Partial | Dependencies | What Must Be Fixed | Acceptance Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AI Research Assistant (Closed-World RAG)** | Backend has `ArchivalRAGEngine` connected to `HuggingFaceLLMProvider` and citation validator. Frontend `api.ts` contained `generateClientGroundedAnswer()` with keyword matching (`mahad`, `anarchy`, `caste`, `article 32`) returning canned strings. | **PARTIAL** (Backend RAG is real; Frontend had client-side fake RAG bypass) | `POST /api/v1/research/ask`, `HF_TOKEN`, `HF_MODEL`, `search_chunks` | Completely remove `generateClientGroundedAnswer()`. Eliminate `isDemoMode()` canned branch in `askResearchAssistant`. If backend is down, return visible `RESEARCH_SERVICE_UNAVAILABLE`. | Query with valid HF credentials returns grounded response citing DB chunk. Query for "quantum computing" returns `NO_EVIDENCE`. When backend stopped, UI displays `RESEARCH SERVICE UNAVAILABLE`. |
| **Legacy Research Query (`POST /research/query`)** | `backend/app/api/v1/endpoints/research.py:21` returns hardcoded `sample_answer` and `sample_sources`. | **FAKE** (Canned historical response) | `backend/app/api/v1/endpoints/research.py` | Retire endpoint with `HTTP 410 GONE` or redirect to `/ask`. Remove frontend call in `api.ts:queryResearch`. Never return canned text. | Direct HTTP POST to `/api/v1/research/query` returns `HTTP 410 GONE` with clear deprecation notice. |
| **Research Conversation Persistence** | Database has `ResearchConversation` and `ResearchMessage` tables. Frontend `api.ts` used `LOCAL_CONVERSATIONS_KEY` in `localStorage` when in demo mode. | **PARTIAL** (DB models real; Frontend had localStorage mock persistence) | `research_conversations`, `research_messages` tables in DB | Remove all `localStorage` conversation saving/loading. Conversations must strictly persist in database via `/research/conversations`. | New research thread created; browser refreshed with empty localStorage; thread history loads intact from backend DB. |
| **Document Catalog & Ledger (`/explore`, `/documents`)** | 33 authentic BAWS/CAD documents in DB. Frontend `api.ts` has `FALLBACK_DOCUMENTS` (8 items) silently returned by `fetchWithFallback` on network failure. | **PARTIAL** (Backend data is 100% authentic; Frontend silent fallback masks network errors) | Database `documents`, `collections` tables | Remove `FALLBACK_DOCUMENTS`. If backend is offline, fail visibly with `ARCHIVE BACKEND OFFLINE` banner. | Stop backend -> frontend displays `ARCHIVE BACKEND OFFLINE`. Start backend -> displays all 33 authentic primary records. |
| **Archival Collections (`/collections`, `/explore`)** | 8 authentic collections in DB. Frontend `api.ts` has `FALLBACK_COLLECTIONS` and silent fallback in `getCollections()`. | **PARTIAL** | Database `collections` table | Remove `FALLBACK_COLLECTIONS`. Propagate network failure to UI error banner. | Real collections load with exact DB document counts; network failure displays honest error message. |
| **Biographical Timeline (`/timeline`)** | 31 authentic historical milestones (1891–1956) in DB. Frontend `api.ts` has `FALLBACK_TIMELINE`. | **PARTIAL** | Database `timeline_events` table | Remove `FALLBACK_TIMELINE`. Timeline must load strictly from `GET /api/v1/timeline`. | Timeline loads all 31 authentic events with exact date precision (`EXACT`, `YEAR_MONTH`, `YEAR`, `APPROXIMATE`). |
| **Historical Knowledge Graph (`/knowledge-graph`)** | 35 canonical entities and 25 verified relationships in DB. Edge inspector has provenance viewer. | **REAL** | `graph_entities`, `graph_relationships` tables | Ensure no decorative/synthetic edges are ever added. Require evidence chunk or citation for every relationship. | Clicking any graph edge opens verified 6-step archival provenance chain linked to primary document. |
| **Audio-Visual Media Registry (`/media`)** | 3-5 media assets in DB. Storage paths point to `storage/media/`. Frontend `api.ts` has `FALLBACK_MEDIA`. | **PARTIAL** | Filesystem / S3 storage, RFC 7233 byte-range streaming | Remove `FALLBACK_MEDIA`. If master audio/video file is missing on storage host, report `MEDIA MASTER UNAVAILABLE`. If transcript missing, show `TRANSCRIPTION NOT AVAILABLE`. | Audio player streams HTTP 206 partial content when file exists, or displays explicit unavailable notice without fake waveforms. |
| **OCR & Facsimile Viewer (`/documents/:id`)** | 33 OCR jobs and pages in DB with confidence metrics (0.98). Master text files in `storage/uploads/`. | **REAL** | `ocr_jobs`, `ocr_pages`, `ocr_text_versions` tables | Label scans as `MACHINE OCR` vs `HUMAN REVIEWED TRANSCRIPTION`. Display exact `OCR MODEL CONFIDENCE: 0.98`. | Opening document displays dual-pane viewer with actual OCR text, confidence metric, and source attribution. |
| **Smart Hybrid Search (`/search`)** | SQLite FTS5 lexical + BGE-M3 dense embeddings + RRF fusion ($k=60$). Reranker falls back to RRF if cross-encoder absent. | **PARTIAL** (Lexical FTS5 is real; vector search depends on environment dependencies) | FTS5 / PostgreSQL full-text search, embedding provider | If reranker is absent, explicitly show `RERANKER UNAVAILABLE`. Never synthesize rerank scores. Ensure search result cards expose retrieval mode, score, and source. | Search query returns grounded matching passages with exact archive IDs and BM25/vector scores. |
| **Vector Embeddings Provider** | `BGE_M3_EmbeddingProvider` loads local sentence-transformers if present; reports `MODEL_UNAVAILABLE` otherwise without fake vectors. | **PARTIAL** (Honest degradation exists, but lacks cloud inference embedding support) | Local sentence-transformers / HF feature extraction | Add hosted Hugging Face embedding API support via `HF_TOKEN` so cloud deployments (Vercel/Render) generate real embeddings without 4GB local memory footprint. | Embedding diagnostics endpoint reports model name, dimension, indexed chunk count, and operational state. |
| **System Status Diagnostics (`/system-status`)** | `/api/v1/status` and `/api/v1/system/status` probe 14 subsystems. Frontend `demoApi.ts` had `FALLBACK_SYSTEM_STATUS`. | **PARTIAL** (Backend probes are real; frontend caught errors and showed static JSON) | `GET /api/v1/status` | Remove `FALLBACK_SYSTEM_STATUS`. System status page must display live backend probe results or `SYSTEM OFFLINE`. | `/system-status` renders real operational state and live database counts for all 14 platform components. |
| **Database Architecture (SQLite vs PostgreSQL)** | Currently runs on SQLite (`archive_phase1.db`) in local environment. SQLAlchemy models support PostgreSQL natively. | **PARTIAL** (Production target requires PostgreSQL + pgvector) | PostgreSQL 16+, pgvector extension | Add explicit `.env.example`, Docker Compose production stack, and verified migration scripts for PostgreSQL. | Application boots against PostgreSQL connection string, applies Alembic migrations, and passes test suite. |
| **Object Storage Architecture** | Currently reads/writes to local disk (`storage/uploads`). | **PARTIAL** (Works locally; ephemeral cloud hosts lose uploads on restart) | Local filesystem / S3-compatible API | Implement S3-compatible object storage provider abstraction in `StorageService` using `OBJECT_STORAGE_*` environment variables. | File uploads and downloads succeed using S3-compatible endpoint (MinIO/R2/AWS) when configured. |
| **Authentication & RBAC** | JWT authentication with bcrypt hashing. Tokens stored in `localStorage` under `archive_jwt_token`. | **REAL** | `users`, `roles` DB tables | Unify token key across `api.ts`, `demoApi.ts`, `kioskApi.ts`, and `mediaApi.ts` (`archive_jwt_token`). | Login sets JWT; admin routes reject unauthorized visitors with HTTP 401/403. |
| **Admin Operations & Integrity Audits (`/admin/*`)** | Admin endpoints for metadata, OCR review, kiosk management, timeline approvals, and audit logs. | **REAL** | FastAPI `/admin/*` routes, DB transactions | Ensure all admin actions persist directly to database and survive browser refresh without client-side mock layers. | Approving an OCR page or timeline event in admin console modifies DB row and reflects immediately across public views. |
| **Multilingual Translations** | Vernacular translations (Marathi, Hindi, Tamil) for primary documents in DB. | **REAL** | `document_translations` table | Separate UI language selector from archival content language. Label machine translations vs human-reviewed translations. | Side-by-side translation viewer displays original source text alongside verified vernacular text with status tag. |
| **Museum Kiosk Mode (`/kiosk/*`)** | 48px+ touch controls, 120-second inactivity reset, ephemeral visitor session wiping. | **REAL** | Kiosk context, local session timer | Verify inactivity timer resets view without clearing permanent server records or modifying database. | Inactivity timer expires after 120s of idle time; kiosk resets to home view; server records remain unchanged. |
| **SIH Demonstration Flow (`/demo`)** | 10-stage evaluation journey. `demoApi.ts` had fallback stages and sample records. | **PARTIAL** (Stages represent real features, but fallbacks existed) | `/api/v1/demo/*` endpoints | Ensure `/demo` queries real backend endpoints and primary database records (`AMB-CAD-1949-042`, etc.) without synthetic mocks. | Stepping through demo stages queries real backend endpoints and runs live search/RAG queries. |

---

## 3. Inventory of Fake / Canned Code Artifacts to Remove

1. **`frontend/src/services/api.ts`**:
   - `FALLBACK_DOCUMENTS` (Lines 18–160): Hardcoded array of documents.
   - `FALLBACK_COLLECTIONS` (Lines 162–199): Hardcoded array of collections.
   - `FALLBACK_TIMELINE` (Lines 201–279): Hardcoded array of timeline events.
   - `FALLBACK_MEDIA` (Lines 281–333): Hardcoded array of media items.
   - `FALLBACK_METRICS` (Lines 335–345): Hardcoded admin statistics.
   - `FALLBACK_AUDIT_LOGS` (Lines 347–375): Hardcoded audit log entries.
   - `generateClientGroundedAnswer()` (Lines 519–686): Keyword-matching fake AI generator with canned string responses for Mahad, Grammar of Anarchy, Annihilation of Caste, Problem of the Rupee, and Article 32.
   - `getStoredLocalConversations()` and `LOCAL_CONVERSATIONS_KEY` (Lines 495–517): LocalStorage-based fake conversation database.
   - `isDemoMode()` bypasses in `askResearchAssistant`, `listResearchConversations`, `getResearchConversation`, `deleteResearchConversation`.
   - `queryResearch()` calling deprecated `/research/query`.

2. **`frontend/src/services/demoApi.ts`**:
   - `FALLBACK_STAGES` (Lines 104–185): Static stage definitions.
   - `FALLBACK_STAGE_DETAILS` (Lines 187–270): Static stage details with sample questions.
   - `FALLBACK_SYSTEM_STATUS` (Lines 272–294): Static subsystem status JSON.
   - Silent fallbacks in `getStages`, `getStageDetail`, `getSystemStatus`.

3. **`backend/app/api/v1/endpoints/research.py`**:
   - `@router.post("/query")` (Lines 21–67): Returns static `sample_answer` and `sample_sources`. Must be retired with `HTTP 410 GONE`.

---

## 4. Remediation Plan & Execution Sequence

```
1. Audit Completion (docs/PRODUCTION_AUDIT.md) [COMPLETED]
   ↓
2. Delete Fake AI & Canned Answer Paths (api.ts, research.py)
   ↓
3. Remove Silent Fallbacks & LocalStorage Persistence (api.ts, demoApi.ts)
   ↓
4. Add Hosted Embeddings & S3 Object Storage Provider Abstractions
   ↓
5. Environment & Production Deployment Artifacts (.env.example, render.yaml, Dockerfile)
   ↓
6. Real Search & RAG Verification with Live HF Inference
   ↓
7. End-to-End Browser & Network Verification
   ↓
8. Generate Required Reports:
   - PRODUCTION_READINESS_REPORT.md
   - LIVE_API_MATRIX.md
   - LIVE_RAG_VERIFICATION.md
   - DATA_PROVENANCE_AUDIT.md
   - PRODUCTION_DEPLOYMENT.md
   - KNOWN_LIMITATIONS.md
   ↓
9. Git Verification, Test Suite & Push
```
