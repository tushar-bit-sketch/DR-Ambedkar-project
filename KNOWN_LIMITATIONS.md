# KNOWN LIMITATIONS & OPERATIONAL BOUNDARIES
## Dr. B. R. Ambedkar Digital Heritage Archive (SIH26096)
**Curatorial Philosophy:** Radical Transparency & Operational Honesty  
**Report Date:** September 24, 2026  

---

## 1. Overview

In accordance with the project's absolute rule (**the application must never pretend that something works**), this document transparently enumerates the genuine operational boundaries, external dependencies, and graceful degradation behaviors across the platform.

---

## 2. External Dependencies & Cloud Boundaries

### A. Hugging Face Cloud Inference (`HF_TOKEN`)
- **Operational Requirement:** The semantic vector search and closed-world RAG synthesis utilize the Hugging Face Serverless Router (`https://router.huggingface.co/v1`) with the multilingual `BAAI/bge-m3` model.
- **When Configured:** Fast, cloud-accelerated feature extraction embeddings and structured citations without requiring 16GB+ RAM or local GPU hardware.
- **When Absent / Rate Limited:** The backend search falls back gracefully to high-performance FTS5 BM25 lexical search. The RAG assistant returns status `RESEARCH_SERVICE_UNAVAILABLE` or `MODEL_UNAVAILABLE`, explaining clearly that live inference requires an active token, rather than returning synthetic answers.

### B. S3-Compatible Object Storage (`OBJECT_STORAGE_*`)
- **Operational Requirement:** In multi-node cloud environments (Kubernetes, AWS ECS, Render), persistent binary storage requires AWS S3, Cloudflare R2, MinIO, or Wasabi.
- **When Absent:** The platform automatically uses the local cryptographic master vault filesystem (`storage/media/masters`). On ephemeral container hosts that restart without persistent volumes, freshly uploaded files during that container run may be wiped on container rebuild unless mounted to persistent disk or S3.

---

## 3. Local Hardware-Dependent Subsystems

### A. Tesseract OCR Engine (`tesseract-ocr`)
- **Dependency:** Processing scanned manuscript facsimiles into searchable text requires the native `tesseract` binary installed on the host system (`apt-get install tesseract-ocr tesseract-ocr-hin tesseract-ocr-mar`).
- **Limitation:** In headless environments where the binary is omitted, the OCR queue sets job status to `FAILED_DEPENDENCY` and logs the missing binary path rather than generating fake OCR text.

### B. Indic Neural TTS & Whisper STT
- **Dependency:** Generating synthetic audio from newly ingested text requires neural TTS weights (Coqui/IndicTTS). Transcribing live voice queries requires the Whisper STT engine.
- **Graceful Behavior:** The platform hosts pre-generated, authenticated historical audio recordings (AIR 1954, BBC 1931) for immediate RFC 7233 byte-range streaming. For arbitrary dynamic synthesis without local GPU models, the backend reports `TTS_ENGINE_UNAVAILABLE`.

---

## 4. Archival Historical & Material Boundaries

### A. Historical Scope (1891–1956)
- **Deliberate Design:** The knowledge graph and chronological timeline are strictly bounded to the life, writings, speeches, and constitutional legacy of Dr. B. R. Ambedkar (1891–1956).
- **Out-of-Scope Queries:** Inquiries regarding modern post-1956 political events or unrelated figures will be deliberately refused by the closed-world RAG assistant under the Zero-Hallucination policy.

### B. 19th Century Lithographic Scans
- **Digitization Reality:** Early 1920s Marathi newspapers printed on brittle paper (such as early issues of *Mooknayak* or *Bahishkrit Bharat*) contain ink bleeding and typography irregularities. While the platform provides high-resolution facsimile viewers, automated OCR character accuracy for these sections ranges between 78–86%, necessitating archivist manual transcription verification in Phase 3.

---

## 5. Memorial Kiosk Hardware Boundaries

- **Inactivity Timeout:** Kiosks automatically reset to the broadsheet splash screen after 120 seconds of visitor inactivity.
- **Privacy Assurance:** All visitor search history, voice queries, and transient session cookies are wiped from memory on reset.
- **Offline Package Constraints:** Kiosks running the standalone offline package (`/api/v1/kiosk/offline-package`) rely on pre-synced local SQLite ledgers and static media packages; real-time cloud LLM synthesis is suspended when edge internet connectivity is severed.
