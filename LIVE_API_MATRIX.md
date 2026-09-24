# LIVE API MATRIX
## Dr. B. R. Ambedkar Digital Heritage Archive (SIH26096)
**API Base URL:** `/api/v1`  
**Protocol:** HTTPS / TLS 1.3  
**Format:** JSON / RFC 7233 Byte Stream / Multipart Form-Data  
**Authentication:** JWT Bearer (HMAC SHA-256) via `Authorization: Bearer <token>`  

---

## 1. Archival Documents & Preservation Masters

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/documents` | `GET` | Optional (Public sees verified only) | Query: `q`, `collection_id`, `document_type`, `year`, `page`, `page_size` | `DocumentListResponse` (total, items, pagination) | 120/min | PostgreSQL / SQLite `Document` table |
| `/api/v1/documents/{id_or_slug}` | `GET` | Optional | Path param: ID, slug, or archive ID | `DocumentDetailOut` (metadata, versions, OCR text, checksum) | 120/min | Relational `Document` + `DocumentMetadata` |
| `/api/v1/documents` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | `multipart/form-data`: metadata fields + master file upload | `DocumentOut` (HTTP 201) | 30/min | `StorageService` (SHA-256 compute + disk/S3 write) |
| `/api/v1/documents/{id}/versions` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | `multipart/form-data`: file + version notes | `DocumentVersion` (HTTP 201) | 30/min | `DocumentVersion` + S3/Vault storage |
| `/api/v1/documents/{id}/verify-integrity` | `POST` | Authenticated | None | `IntegrityCheckResult` (is_valid, stored_hash, computed_hash) | 30/min | Cryptographic SHA-256 recalculation engine |
| `/api/v1/documents/{id}/verify` | `POST` | `REVIEWER`, `SUPER_ADMIN` | JSON: `verification_status`, `notes` | `DocumentOut` | 30/min | Archival curation review workflow |
| `/api/v1/documents/{id}` | `DELETE` | `SUPER_ADMIN` | Query: `reason` | Soft-delete confirmation object | 15/min | Audit-logged soft delete (`is_deleted=True`) |
| `/api/v1/documents/{id}/restore` | `POST` | `SUPER_ADMIN` | None | `DocumentOut` | 15/min | Restoration from soft-deleted ledger |

---

## 2. Collections & Preservation Series

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/collections` | `GET` | Public | None | `List[CollectionOut]` | 120/min | `Collection` table |
| `/api/v1/collections/{id}` | `GET` | Public | Path param: ID or slug | `CollectionDetailOut` | 120/min | `Collection` with aggregated document count |
| `/api/v1/collections` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | JSON: `title`, `slug`, `description`, `period` | `CollectionOut` (HTTP 201) | 30/min | `Collection` insert with slug validation |
| `/api/v1/collections/{id}` | `PUT` | `ARCHIVIST`, `SUPER_ADMIN` | JSON: partial collection attributes | `CollectionOut` | 30/min | `Collection` update |
| `/api/v1/collections/{id}` | `DELETE` | `SUPER_ADMIN` | Path param: ID | Delete confirmation | 15/min | Cascade-protected collection deletion |

---

## 3. Intelligent Hybrid Search Engine

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/search` | `GET` | Public | Query: `q`, `mode` (`hybrid`/`keyword`/`semantic`), filters | `SearchResponse` (items, facets, score, diagnostics) | 60/min | SQLite FTS5 (BM25) + BGE-M3 Dense Vector + RRF |
| `/api/v1/search/index/status` | `GET` | Public | None | `SearchIndexStatus` (documents, chunks, vector backend) | 60/min | Live search index catalog statistics |
| `/api/v1/search/index/document/{id}` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | Path param: document ID | `SearchIndexJob` | 20/min | Tokenizer, chunker, and BGE-M3 embedding job |
| `/api/v1/search/index/rebuild` | `POST` | `SUPER_ADMIN` | None | Rebuild execution summary | 5/min | Full corpus re-indexing task runner |
| `/api/v1/search/evaluation` | `GET` | Authenticated | None | `SearchEvaluationReport` (MRR, NDCG@10) | 10/min | Historical benchmark test suite evaluator |
| `/api/v1/search/unified` | `GET` | Public | Query: `q`, `limit` | Cross-domain results (documents, entities, timeline) | 60/min | Multi-index federated search router |

---

## 4. Closed-World RAG Research Assistant

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/research/ask` | `POST` | Public / Rate Limited | JSON: `query`, `conversation_id`, `mode`, `target_language` | `ResearchAskResponse` (answer, citations, evidence, diagnostics) | 20/min | Hugging Face Serverless Router (`router.huggingface.co/v1`) |
| `/api/v1/research/conversations` | `GET` | Authenticated / Session | None | `List[ResearchConversationSummary]` | 60/min | `ResearchConversation` relational store |
| `/api/v1/research/conversations/{id}` | `GET` | Authenticated / Session | Path param: conversation ID | `ResearchConversationDetail` with message history | 60/min | `ResearchMessage` thread storage |
| `/api/v1/research/conversations/{id}` | `DELETE` | Authenticated / Session | Path param: conversation ID | Success confirmation | 30/min | Cascade deletion of conversation messages |

---

## 5. OCR Digitization Pipeline

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/ocr/jobs` | `GET` | Authenticated | Query: `status`, `skip`, `limit` | `List[OCRJob]` | 60/min | `OCRJob` tracking table |
| `/api/v1/ocr/jobs` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | JSON: `document_id`, `engine`, `language` | `OCRJob` (HTTP 201) | 15/min | Tesseract 5.3 worker initialization |
| `/api/v1/ocr/pages/{id}` | `GET` | Authenticated | Path param: page ID | `OCRPage` with bounding boxes and confidence | 60/min | `OCRPage` schema with word coordinates |
| `/api/v1/ocr/pages/{id}` | `PATCH` | `REVIEWER`, `SUPER_ADMIN` | JSON: `text`, `change_summary` | `OCRPage` updated version | 30/min | Archivist transcript manual correction |
| `/api/v1/ocr/pages/{id}/approve` | `POST` | `REVIEWER`, `SUPER_ADMIN` | JSON: `notes` | `OCRPage` approved | 30/min | Promotes transcript to verified layer |
| `/api/v1/ocr/pages/{id}/reject` | `POST` | `REVIEWER`, `SUPER_ADMIN` | JSON: `notes` | `OCRPage` rejected | 30/min | Rejection with mandatory curatorial reason |

---

## 6. Historical Knowledge Graph & Provenance

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/entities` | `GET` | Public | Query: `q`, `entity_type`, `limit`, `offset` | `List[GraphEntityItem]` | 60/min | `GraphEntity` table (35 canonical entities) |
| `/api/v1/entities/{id}` | `GET` | Public | Path param: entity ID | `GraphEntityItem` detail with properties | 60/min | Canonical entity profile |
| `/api/v1/entities/{id}/relationships`| `GET` | Public | Query: `direction` (`IN`/`OUT`/`BOTH`) | `List[GraphRelationshipItem]` | 60/min | Directed edge ledger |
| `/api/v1/graph/neighbors/{id}` | `GET` | Public | Query: `depth` (1-3), `limit` | `GraphNeighborsData` (nodes, links, degree) | 60/min | NetworkX BFS traversal engine |
| `/api/v1/graph/path` | `GET` | Public | Query: `source_id`, `target_id`, `max_depth` | Shortest path node list | 60/min | NetworkX shortest path finder |
| `/api/v1/graph/status` | `GET` | Public | None | `GraphStatusData` (nodes, edges, density, backend) | 60/min | Graph topological metrics generator |
| `/api/v1/provenance/relationship/{id}`| `GET` | Public | Path param: relationship ID | `ProvenanceChainData` (6-stage audit trail) | 60/min | Primary source accession provenance chain |

---

## 7. Chronological Timeline & Milestone Ledger

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/timeline` | `GET` | Public | Query: `entity_id` | `List[TimelineEvent]` sorted chronologically | 60/min | `TimelineEvent` table (31 verified events) |
| `/api/v1/timeline` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | JSON: `title`, `description`, `date_str`, `category` | `TimelineEvent` (HTTP 201) | 30/min | New milestone creation with date parsing |
| `/api/v1/timeline/{id}/approve` | `POST` | `REVIEWER`, `SUPER_ADMIN` | Path param: event ID | `TimelineEvent` approved | 30/min | Curatorial verification stamp |

---

## 8. Multimedia Repository & Byte Streaming

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/media` | `GET` | Public | Query: `media_type`, `limit`, `offset` | `List[MediaAsset]` | 60/min | `MediaAsset` table |
| `/api/v1/media/{id}` | `GET` | Public | Path param: media ID | `MediaAsset` detail with technical specs | 60/min | Technical metadata record |
| `/api/v1/media/{id}/stream` | `GET` | Public | Headers: `Range: bytes=start-end` | HTTP 206 Partial Content (Audio/Video bytes) | 240/min | RFC 7233 Byte-range streaming service |
| `/api/v1/media/{id}/transcripts` | `GET` | Public | Path param: media ID | `List[MediaTranscript]` with time-offsets | 60/min | Synchronized WebVTT / JSON transcript |

---

## 9. Multilingual Access, Audio & Voice

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/api/v1/languages/supported` | `GET` | Public | None | `List[SupportedLanguageItem]` | 120/min | Indic language matrix (en, hi, mr, ta) |
| `/api/v1/translations/document/{id}` | `GET`| Public | Path param: document ID | `List[TranslationItem]` | 60/min | Side-by-side aligned translation ledger |
| `/api/v1/translations/generate` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | JSON: `document_id`, `target_language` | `TranslationItem` | 15/min | IndicTrans2 translation worker |
| `/api/v1/audio/synthesize` | `POST` | `ARCHIVIST`, `SUPER_ADMIN` | JSON: `document_id`, `language`, `voice` | `AudioDerivativeItem` | 10/min | Coqui TTS voice generation engine |
| `/api/v1/audio/voice-query` | `POST` | Public | `multipart/form-data`: recorded audio file | JSON: `query` text, `detected_language` | 30/min | Whisper Speech-to-Text transcriber |

---

## 10. System Diagnostics & Kiosk Infrastructure

| Endpoint | Method | Auth Required | Request Payload | Response Schema | Rate Limit | Primary Data Store / Service |
|---|---|---|---|---|---|---|
| `/health/live` | `GET` | Public | None | `{"status": "alive"}` | Unlimited | K8s / Container liveness probe |
| `/health/ready` | `GET` | Public | None | Database connection verification | Unlimited | K8s readiness probe |
| `/api/v1/system/status` | `GET` | Public | None | Live health of all 14 platform subsystems | 60/min | `CapabilityReporter` + live engine probes |
| `/api/v1/admin/kiosks` | `GET` | `SUPER_ADMIN` | None | `KioskListResponse` (fleet status, telemetry) | 60/min | `KioskDevice` registry |
| `/api/v1/kiosk/heartbeat` | `POST` | Kiosk Token | JSON: device health, CPU, RAM, display | Heartbeat ACK | 120/min | Edge kiosk telemetry monitor |
