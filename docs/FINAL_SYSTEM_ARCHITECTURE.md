# SIH26096 Digital Heritage Archive — Final System Architecture Blueprint

**Phase:** PHASE 10 (FINAL ARCHITECTURAL SPECIFICATION)  
**Standard Compliance:** OAIS Reference Model (ISO 14721) & Dublin Core (ISO 15836)  
**Target Platform:** National Memorials, Research Universities & Public Heritage Kiosks  

---

## 1. High-Level Architectural Overview

The SIH26096 platform is architected as a modular, high-performance, decoupled client-server platform optimized for both high-concurrency web discovery and offline-resilient memorial kiosk terminals.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PRESENTATION LAYER                                       │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────────────────────┐  │
│  │   Public Web Portal   │  │  Physical Kiosk Shell  │  │   Curator Admin & Steering     │  │
│  │  (React 18 + TS + Vite)│  │ (Touch-Optimized UI)   │  │  (/admin & /demo/control)      │  │
│  └───────────┬───────────┘  └───────────┬────────────┘  └───────────────┬────────────────┘  │
└──────────────┼──────────────────────────┼───────────────────────────────┼───────────────────┘
               │                          │                               │
               ▼                          ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY & SECURITY MIDDLEWARE (FastAPI)                        │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ SecurityHeadersMiddleware (CSP, nosniff, SAMEORIGIN) • RateLimiter (Sliding Window)   │  │
│  │ Authentication & RBAC Dependency (JWT, bcrypt, Kiosk SHA-256 Key Hashes)             │  │
│  └──────────────────────────────────────┬────────────────────────────────────────────────┘  │
└─────────────────────────────────────────┼───────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               CORE DOMAIN & INTELLIGENCE ENGINES                            │
│  ┌───────────────────────────┐  ┌───────────────────────────┐  ┌─────────────────────────┐  │
│  │  Document & OCR Engine    │  │  Hybrid Search & RRF      │  │ Closed-World RAG Engine │  │
│  │  (Tesseract + Human Loop) │  │  (BM25 + Dense Vectors)   │  │ (Primary Source Citations)││
│  └─────────────┬─────────────┘  └─────────────┬─────────────┘  └────────────┬────────────┘  │
│  ┌─────────────┴─────────────┐  ┌─────────────┴─────────────┐  ┌────────────┴────────────┐  │
│  │ Knowledge Graph Engine    │  │ Intelligent Timeline      │  │ Audio/Video Engine      │  │
│  │ (Relational Adjacency)    │  │ (Day/Month/Year Precision)│  │ (Waveforms + WebVTT)    │  │
│  └─────────────┬─────────────┘  └─────────────┬─────────────┘  └────────────┬────────────┘  │
└────────────────┼──────────────────────────────┼─────────────────────────────┼───────────────┘
                 │                              │                             │
                 ▼                              ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PERSISTENCE & PRESERVATION VAULT                               │
│  ┌────────────────────────────────────────┐  ┌───────────────────────────────────────────┐  │
│  │ Relational Database (SQLite / Postgres)│  │ Immutable POSIX Master Vault (0o444)      │  │
│  │ Documents, Entities, Timeline, Kiosks  │  │ Originals, Web Derivatives, WebVTT Captions│  │
│  └────────────────────────────────────────┘  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. OAIS Reference Model Mapping

The system strictly mirrors the Open Archival Information System (OAIS) ISO 14721 specification:

```
Producer (Archivist / Scholar)
   │
   ▼
[ Submission Information Package (SIP) ]
   ├── Master Manuscript Scan (TIFF/PDF) / Audio Recording (WAV)
   ├── Dublin Core Metadata Manifest (JSON)
   └── Cryptographic Pre-Ingest Hash (SHA-256)
   │
   ▼
┌────────────────────────────────────────────────────────┐
│                   INGESTION PIPELINE                   │
│ • Format & MIME validation                             │
│ • SHA-256 byte-integrity verification                  │
│ • Inscription into immutable vault (POSIX 0o444)       │
│ • Derivative generation (WebP thumbnail, MP3 stream)   │
│ • Text extraction (Tesseract OCR / WebVTT alignment)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
           [ Archival Information Package (AIP) ]
              ├── Immutable Storage Master
              ├── Relational Provenance Metadata
              ├── Multi-version OCR Transcripts
              └── Audit Log Chain of Custody
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               ACCESS & DISSEMINATION SYSTEM            │
│ • Hybrid BM25 + Dense Semantic Retrieval (RRF)         │
│ • Knowledge Graph Entity Resolution                    │
│ • Closed-world RAG with Document Citations             │
│ • Range-request Audio/Video streaming                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
           [ Dissemination Information Package (DIP) ]
              ├── Web-optimized Document Viewer
              ├── Synchronized WebVTT Audio Narration
              └── Offline Kiosk Export Manifest
                            │
                            ▼
Consumer (Public Visitor / Academic Scholar / Memorial Tourist)
```

---

## 3. Subsystem Breakdown

### 1. Hybrid Search Engine (BM25 + Semantic RRF)
- **Token Filtering:** Stopword removal, case normalization, word-boundary preservation.
- **Lexical BM25:** SQL `LIKE` and full-text matching against document titles, keywords, and OCR passages.
- **Dense Vector Retrieval:** Vector similarity via SQLite dev fallback or PostgreSQL `pgvector`.
- **Reciprocal Rank Fusion (RRF):** Merges disparate rankings using the formula:
  $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
  where $k = 60$ and $r_m(d)$ is the rank in retrieval mode $m$.

### 2. Knowledge Graph Engine
- **Relational Adjacency:** Canonical entities (Persons, Events, Concepts, Works) stored with directional semantic edges (`DRAFTED`, `FOUNDED`, `PARTICIPATED_IN`, `OPPOSED`).
- **Provenance Chain:** Every edge links back to its originating primary document citation.
- **Neighbor Expansion:** Graph traversal up to 3 degrees with access-level filtering.

### 3. Intelligent Timeline Engine
- **Multi-Resolution Precision:** Supports exact days (`1949-11-25`), months (`1936-05`), years (`1923`), or approximate era ranges (`c. 1916`).
- **Chronological Sorting:** Standardized astronomical float timestamps ensure seamless ordering across centuries.

### 4. Audio/Video Media Engine
- **Waveform Visualization:** Native audio inspection generates normalized 100-point amplitude waveforms.
- **Streaming:** HTTP 206 Partial Content range requests enable instant seek without downloading complete files.
- **WebVTT Subtitle Pipeline:** Machine transcripts undergo curator review before generating production caption tracks.

### 5. Kiosk Fleet & Deployment Engine
- **Capability Reporter:** Automatically audits host hardware without external dependencies.
- **Telemetry & Directives:** Terminals report CPU, RAM, and display metrics via periodic heartbeats.
- **Offline Mode:** Generates standalone encrypted packages with pre-built indices for offline memorial sites.

---

## 4. Technology Stack Specification

| Layer | Technologies & Libraries | Justification & Architectural Role |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Vite 8, Tailwind CSS, Lucide Icons | Lightning-fast reactivity, zero build errors, modern component reusability. |
| **Backend API** | Python 3.13, FastAPI, Pydantic v2, Starlette | Asynchronous I/O, strict schema validation, OpenAPI generation. |
| **Database & ORM** | SQLAlchemy 2.0, SQLite (Dev) / PostgreSQL 16 (Prod) | ACID compliance, Alembic migrations (`c8f2910d5403`), relational integrity. |
| **Archival Storage** | POSIX Local Filesystem Vault (0o444 permissions) | Direct byte-level control, SHA-256 cryptographic verification. |
| **Security** | Python-Jose, Passlib (Bcrypt), SecurityHeadersMiddleware | JWT access tokens, salted password hashing, HTTP security defenses. |
| **Audio/Video** | Python `wave`, `cv2`, `PIL`, WebVTT Generator | Native media processing with zero synthetic outputs. |
| **Testing** | Pytest, Pytest-AnyIO, FastAPI TestClient, Requests | 160+ automated multi-phase integration and regression tests. |

---

## 5. Architectural Verification & Conclusion

This architecture satisfies all functional, security, and preservation benchmarks established for the SIH26096 platform. It provides an extensible, battle-tested foundation for physical memorial installations and national digital archive networks.
