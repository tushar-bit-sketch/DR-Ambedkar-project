# SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar
### AI-Powered Institutional Archive and Audio-Visual Knowledge Platform

**Phases 1, 2 & 3 Complete: Digital Archive, Ingestion & OCR Manuscript Digitization**

---

## 1. Product Vision & Archival Integrity

The **Ambedkar Digital Heritage Archive** is a national institutional digital heritage platform dedicated to preserving, cataloging, exploring, and understanding the writings, speeches, manuscripts, constituent assembly debates, photographs, audio/video archives, and historical records associated with Dr. B. R. Ambedkar.

### Strict Archival & Data Integrity Principles
- **No Hallucinated Records**: Zero fake historical documents, fabricated dates, synthetic quotations, or simulated page numbers.
- **Authentic Sourcing**: Real historical records are sourced from official public domain repositories:
  - *Dr. Ambedkar Foundation (Writings and Speeches — BAWS)*
  - *Constituent Assembly Debates Archive (Parliament of India)*
  - *National Digital Library of India (NDLI)*
- **Cryptographic Provenance**: Every digital asset conforms to the strict OAIS chain of custody:
  $$\text{SOURCE} \longrightarrow \text{DOCUMENT} \longrightarrow \text{METADATA} \longrightarrow \text{VERSION} \longrightarrow \text{FILE} \longrightarrow \text{VERIFICATION} \longrightarrow \text{AUDIT}$$
- **Duplicate Detection**: 2-level automated duplicate detection protects catalog integrity:
  1. *Source Identifier / Shelfmark uniqueness* (e.g. `CAD-VOL-XI-1949-11-25-P972`)
  2. *SHA-256 cryptographic checksum matching* of binary file contents.
- **Explicit Demo Data Separation**: Synthetic test items are strictly flagged with `is_demo_data=True` and display a prominent warning banner: `DEMO DATA — NOT VERIFIED ARCHIVAL CONTENT`.
- **Phase Boundaries**: Strictly zero OCR, semantic vector embeddings, or fake AI answering in Phase 2.

---

## 2. Phase 2 Key Implementations

### A. Document & Storage Data Architecture
1. **Archival File Entity (`archival_files`)**:
   - `id`, `filename`, `original_filename`, `file_size_bytes`, `mime_type`, `file_format`, `checksum` (SHA-256 unique), `checksum_algorithm`, `storage_path`, `storage_layer`, `is_master`, `last_integrity_check`, `integrity_status`.
2. **Document Versioning (`document_versions`)**:
   - `version_number`, `archival_file_id`, `label`, `change_summary`, `is_current`, `created_by`.
3. **Dublin Core Catalog Record (`documents`)**:
   - `title`, `subtitle`, `document_type`, `creator`, `collection_id`, `language`, `date`, `year`, `date_precision`, `physical_location`, `source_name`, `source_url`, `source_identifier` (unique shelfmark), `rights`, `access_level` (`PUBLIC`, `RESTRICTED`, `INTERNAL_ONLY`), `status`, `verification_status` (`UNVERIFIED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`), `is_demo_data`, `is_deleted`, `deleted_at`, `deleted_by`.
4. **Curated Collections (`collections`)**:
   - CRUD management with `period`, `curator_notes`, `cover_image`, `status`, and document count.

### B. Storage Service & Integrity Verification
- Local disk storage abstraction in `backend/storage/uploads/` with MIME/extension whitelist:
  `PDF, TXT, DOCX, JPEG, PNG, TIFF, WEBP, MP3, WAV, M4A, MP4, WEBM`.
- Streaming and chunked download endpoints (`/api/v1/files/stream/{filename}`, `/api/v1/files/download/{filename}`) with RBAC validation.
- Live SHA-256 verification endpoint (`POST /api/v1/documents/{id}/verify-integrity`) that dynamically re-computes the hash of the stored file on disk to detect bit rot or unauthorized tampering.

### C. Ingestion Pipeline & Workflows
- **6-Step Ingestion Wizard** (`/admin/documents/new`):
  1. *Basic Identity* (Title, Subtitle, Type, Collection, Creator, Language)
  2. *Historical Date & Context* (Date, Year, Precision, Location)
  3. *Provenance & Rights* (Source Name, Source Identifier/Shelfmark, URL, Rights Statement, Access Level, Demo Data Flag)
  4. *Master File Upload & Live Client SHA-256 Calculation* (Web Crypto API digest computation in real-time)
  5. *Dublin Core Metadata* (Description/Abstract, Subject Keywords, Publisher)
  6. *Curatorial Review & Submission* (Summary preview, duplicate rejection alert handling)
- **Batch Ingestion Pipeline** (`/admin/import`):
  - Ingest bulk JSON or CSV catalog files with automated duplicate skipping and detailed error/import reporting.
- **Curatorial Peer Review & Lifecycle Controls** (`/admin/documents`):
  - Transition workflow: `UNVERIFIED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `VERIFIED` / `REJECTED` with audit notes.
  - Soft Delete (`is_deleted=True`) with mandatory audit reason.
  - Super Admin Restoration of soft-deleted records.
  - Filter by status (`ALL`, `VERIFIED`, `UNVERIFIED`, `UNDER_REVIEW`, `REJECTED`, `DELETED`).

### D. Upgraded Document Viewer & Explorer
- Embedded **PDF Viewer** via native streaming.
- High-resolution **Pan/Zoom Image Viewer** for photographs and manuscript facsimiles.
- **HTML5 Audio Player** for authentic historical speech recordings.
- **HTML5 Video Player** for historical documentary footage.
- Direct **Archival Master Download** action.
- Visitor RBAC Enforcement: unauthenticated visitors strictly see active (`is_deleted=False`), `VERIFIED`, `PUBLISHED`, and `PUBLIC` documents.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript (Strict Mode)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (Archival Institutional Palette)
- **Icons**: Lucide React
- **Display Modes**: Desktop, Tablet, and **Touchscreen Museum Kiosk Mode**

### Backend
- **Framework**: Python 3.13 + FastAPI
- **Validation**: Pydantic v2 & Pydantic Settings
- **ORM**: SQLAlchemy 2.0
- **Database Migrations**: Alembic
- **Security & RBAC**: OAuth2 + JWT (HS256) + direct `bcrypt` password hashing
- **Supported Roles**: `SUPER_ADMIN`, `ARCHIVIST`, `REVIEWER`, `RESEARCHER`, `VISITOR`

### Database
- **SQLite** (`./archive_phase1.db`) for local zero-dependency development.
- **PostgreSQL 16** for containerized production deployment.

---

## 4. Setup & Running the Project

### Prerequisites
- Node.js (v20+ recommended, v24 tested)
- Python (v3.11+ recommended, v3.13 tested)

---

### Step 1: Start the Backend
```bash
cd backend

# Create and activate virtual environment (Windows pwsh)
py -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed authentic archival master records & admin users
python -m app.db.seed

# Start FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive API Docs: `http://127.0.0.1:8000/api/v1/docs`
- Health Check: `http://127.0.0.1:8000/api/v1/health`

---

### Step 2: Start the Frontend
```bash
cd frontend

# Install dependencies
npm install

# Build check
npm run build

# Start Vite dev server
npm run dev
```
- Open browser: `http://localhost:5173`

---

## 5. Role-Based Access Control (RBAC) Accounts

> **SECURITY NOTE**: For production deployment, initial administrative passwords are provisioned via environment variables (`ADMIN_INITIAL_PASSWORD`, `ARCHIVIST_INITIAL_PASSWORD`, etc.) or secure secrets management. In local development environments, consult `.env.example`.

| Role | Default Service Principal | Privileges |
|---|---|---|
| **SUPER_ADMIN** | `admin@ambedkar-archive.gov.in` | All privileges: user management, hard deletion, restore, system statistics |
| **ARCHIVIST** | `archivist@ambedkar-archive.gov.in` | Ingest documents, upload versions, verify checksums, soft delete |
| **REVIEWER** | `reviewer@ambedkar-archive.gov.in` | Curatorial peer review: approve (`VERIFIED`), reject (`REJECTED`), set `UNDER_REVIEW` |
| **RESEARCHER** | `researcher@ambedkar-archive.gov.in` | Read access to restricted scholarly facsimiles and metadata |
| **VISITOR** | *(Unauthenticated)* | Public catalog exploration: only active `VERIFIED` public items |


---

## 6. Running Automated Tests

```bash
cd backend
.\venv\Scripts\pytest.exe -v
```
All 25 automated tests pass:
- API foundation and system statistics
- Ingestion, duplicate detection, and live SHA-256 integrity verification
- Curatorial review workflow and RBAC enforcement
- Soft deletion and restoration
- OpenCV preprocessing, deskew, and CLAHE filtering
- Intelligent PDF text vs scan detection
- OCR job queue lifecycle, confidence scoring, and model recording
- Human correction and V1 vs V2+ version preservation
- Page-level approval, rejection, and re-run with custom configs
- Comprehensive OCR audit logging
