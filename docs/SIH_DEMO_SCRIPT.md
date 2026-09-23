# SIH 2024 Demonstration Script & Presentation Playbook

**Project:** SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar  
**Platform URL:** `/` (Public Archive), `/demo` (Guided Jury Tour), `/demo/control` (Curator Console), `/system-status` (Live Diagnostics)  
**Target Evaluation Time:** 3-Minute, 5-Minute, or 10-Minute Demonstration Options  

---

## 1. Quick Navigation Map for Presenters

| Audience Flow | URL Path | Key Features to Highlight |
| :--- | :--- | :--- |
| **Guided Jury Tour** | `/demo` | 10 structured archival stages, problem/solution cards, talking points checklist, live widgets |
| **Curator Steering Console** | `/demo/control` | Presentation clock, stage stepper (Next/Prev/Reset), active stage checklist, audience selector |
| **Diagnostic Matrix** | `/system-status` | Transparent breakdown of all 14 subsystems; zero fake capabilities; hardware telemetry |
| **Universal Discovery** | `/search` | Hybrid lexical BM25 + dense semantic retrieval; Reciprocal Rank Fusion (RRF); date facets |
| **Document Vault** | `/documents` | Dublin Core metadata, immutable master preview, SHA-256 verification, OCR confidence |
| **Manuscript Digitization**| `/admin/ocr` | Multi-pass Tesseract OCR, word bounding boxes, side-by-side curator verification loop |
| **Knowledge Graph** | `/knowledge-graph`| Relational adjacency network; 68 entities, 46 relations, 6-step provenance chain |
| **Historical Timeline** | `/timeline` | Multi-resolution date precision (Day, Month, Year); chronological milestone traversal |
| **Audio/Video Archive** | `/media` | WebVTT caption streaming, waveform visualization, timestamped transcript search |
| **Touchscreen Kiosk Mode** | `/` (click "Launch Kiosk Mode") | 120s inactivity auto-reset, high-contrast typography, zero persistent tracking |

---

## 2. 3-Minute Lightning Presentation Script (Rapid Evaluation)

> **Target Duration:** 180 seconds  
> **Presenter:** Primary Speaker navigating on screen at `/demo`.

### Minute 1: The Problem & The Solution (0:00 – 1:00)
- **Opening:** *"Respected Judges, physical national heritage archives face a dual crisis: historical manuscripts and speech recordings are physically deteriorating, while existing digital repositories are static, siloed PDFs with zero semantic search and high risk of AI hallucinations."*
- **Our Solution:** *"We present SIH26096: a Dublin Core and OAIS-compliant Institutional Heritage Archive and Audio-Visual Knowledge Platform dedicated to the complete works of Dr. B.R. Ambedkar. It unites cryptographic preservation, hybrid semantic discovery, multi-lingual accessibility, and an interactive physical memorial kiosk platform."*
- **Action:** Open `/demo?stage=digital_archive`. Show record `AMB-CAD-1949-042` with its SHA-256 master checksum and Dublin Core metadata tags.

### Minute 2: Hybrid Discovery & Knowledge Graph (1:00 – 2:00)
- **Search:** *"Unlike conventional archives that rely on simple filename matching, our search engine utilizes Reciprocal Rank Fusion (RRF) combining keyword BM25 with dense semantic search. Notice that queries like 'constitutional morality' or 'annihilation of caste' resolve in under 12 milliseconds directly from primary text chunks."*
- **Action:** Click "Try Query" or navigate to `/knowledge-graph`.
- **Knowledge Graph:** *"Here, we have reconstructed Dr. Ambedkar's intellectual network into 68 canonical entities and 46 relationships—connecting the Drafting Committee to Columbia University, the Poona Pact, and the Mahad Satyagraha. Every edge carries an immutable citation chain."*

### Minute 3: Museum Kiosk & Radical Transparency (2:00 – 3:00)
- **Kiosk Mode:** *"For physical memorials, one click launches Kiosk Mode. It features an automated 120-second inactivity countdown, high-contrast accessibility controls, and complete privacy isolation—zero visitor tokens are saved to disk."*
- **Closing & System Status:** *"Finally, look at our `/system-status` dashboard. We operate under Radical Honesty: we never fabricate AI outputs or simulate hardware. When an external model is offline, we transparently report FALLBACK mode. Every benchmark you see is measured live. Thank you, and we welcome your questions."*

---

## 3. 5-Minute Standard Demonstration Script (Recommended)

> **Target Duration:** 300 seconds  
> **Setup:** Have `/demo/control` open on a curator tablet/laptop and `/demo` on the main presentation display.

| Time | Stage ID | Title | Key Talking Points & Screen Actions |
| :---: | :--- | :--- | :--- |
| **0:00 - 0:30** | `digital_archive` | Archival Master Vault | • Open `/demo?stage=digital_archive`<br>• Point to OAIS reference compliance & Dublin Core metadata standards.<br>• Show SHA-256 cryptographic verification of `AMB-CAD-1949-042`. |
| **0:30 - 1:00** | `smart_search` | Smart Hybrid Retrieval | • Advance to Stage 2 (`smart_search`).<br>• Demonstrate query: *"Constituent Assembly draft constitution"*. Mean latency **11.86 ms**.<br>• Explain Reciprocal Rank Fusion (RRF) formula: `RRF(d) = 1/(k + r_kw) + 1/(k + r_sem)`. |
| **1:00 - 1:30** | `ocr_digitization` | OCR Digitization & Review | • Advance to Stage 3 (`ocr_digitization`).<br>• Show side-by-side manuscript viewer with OCR confidence scores.<br>• Highlight the curator review loop: machine transcript is never discarded; human edits create versioned derivatives. |
| **1:30 - 2:15** | `ai_research_assistant` | Grounded AI Assistant | • Advance to Stage 4 (`ai_research_assistant`).<br>• Pose question: *"What was Dr. Ambedkar's warning in his final Constituent Assembly speech?"*<br>• Point out the closed-world constraint: zero hallucination policy with exact document citations. |
| **2:15 - 2:45** | `multilingual_access` | Multilingual Access | • Advance to Stage 5 (`multilingual_access`).<br>• Toggle interface between English, Hindi, and Marathi.<br>• Show native Windows SAPI speech narration for vernacular accessibility. |
| **2:45 - 3:30** | `knowledge_graph` & `intelligent_timeline` | Graph & Timeline | • Advance to Stages 6 & 7.<br>• Demonstrate interactive graph node expansion (e.g. `Drafting Committee` -> `Dr. B.R. Ambedkar` -> `Constitution of India`).<br>• Show the chronological timeline enforcing strict date precision (Day vs Month vs Year). |
| **3:30 - 4:15** | `audio_video_archive` | Audio/Video Intelligence | • Advance to Stage 8 (`audio_video_archive`).<br>• Play asset `AMB-TEST-AV-001`.<br>• Point out synchronized WebVTT captions and interactive waveform visualization. |
| **4:15 - 5:00** | `kiosk_experience` & `security_preservation` | Memorial Kiosks & Security | • Advance to Stages 9 & 10.<br>• Demonstrate Kiosk Mode launch, 120s inactivity reset, and `/system-status` verification.<br>• Conclude with Dublin Core, OAIS, and OWASP security compliance. |

---

## 4. 10-Minute Technical Deep Dive (In-Depth Panel Review)

### Block 1: Architecture & Data Integrity (Minutes 0 – 3)
1. Navigate to `/system-status`. Show all 14 subsystem badges.
2. Explain the **OAIS Reference Model** implementation:
   - SIP (Submission Information Package): Pre-ingest validation, SHA-256 calculation, MIME verification.
   - AIP (Archival Information Package): POSIX `0o444` read-only master filesystem vault.
   - DIP (Dissemination Information Package): Web-optimized derivatives, WebVTT tracks, OCR JSON.
3. Open Developer Tools (Network Tab) to demonstrate response times:
   - `/health/live`: ~4 ms
   - `/api/v1/documents`: ~19 ms
   - `/api/v1/timeline`: ~7 ms
   - Direct database indexed lookups: **0.56 ms**.

### Block 2: Hybrid Retrieval, Knowledge Graph & RAG (Minutes 3 – 7)
1. Open `/search`. Enter complex historical query: *"social democracy fraternity equality"*.
2. Explain why pure keyword search fails on historical synonyms, and why pure vector search fails on legal citations. Show how our RRF algorithm balances both.
3. Navigate to `/knowledge-graph`. Click on `Dr. B.R. Ambedkar`. Expand 1st-degree neighbors:
   - Institutions: *Drafting Committee*, *Columbia University*, *Reserve Bank of India*.
   - Events: *Mahad Satyagraha (1927)*, *Poona Pact (1932)*.
   - Texts: *Annihilation of Caste*, *The Problem of the Rupee*.
4. Demonstrate RAG grounding guardrails: show how queries without textual backing in the archive return clean, transparent refusal rather than synthetic hallucination.

### Block 3: Hardware Telemetry, Kiosk Security & Curator Console (Minutes 7 – 10)
1. Open `/demo/control`. Demonstrate the curator presentation clock and stage controls.
2. Click "Launch Kiosk Mode". Explain physical deployment hardening:
   - Ephemeral visitor sessions: no cookies, tokens, or PII persisted.
   - Virtual on-screen touch keyboard and high-contrast color palette for senior citizens and low-vision visitors.
   - Dual-heartbeat telemetry reporting CPU, RAM, and display states.
3. Review `docs/PERFORMANCE_REPORT.md` and `docs/FINAL_SYSTEM_AUDIT.md`.

---

## 5. Anticipated Jury Questions & Authoritative Answers

### Q1: "How do you guarantee that your AI does not hallucinate historical facts?"
> **Answer:** *"Our AI Research Assistant is architected with a strict Closed-World Archival Constraint. Retrieval-Augmented Generation (RAG) restricts context exclusively to verified search chunks scored above our relevance threshold (`RAG_MIN_EVIDENCE_SCORE`). If evidence is insufficient, the system explicitly reports 'Insufficient archival evidence' instead of generating speculative text. Furthermore, every assertion must cite an exact archival identifier (e.g. `AMB-CAD-1949-042`), page number, and SHA-256 master record."*

### Q2: "What happens if a memorial has no internet connection or server goes down?"
> **Answer:** *"The platform features an Offline Kiosk Engine (`OfflinePackageService`). The curator can export an encrypted, cryptographically signed offline package containing pre-rendered Dublin Core catalog metadata, timeline milestones, thumbnail derivatives, and search indices. Kiosk terminals can operate in complete local isolation without internet access."*

### Q3: "How is your platform different from a standard digital library like DSpace or Omeka?"
> **Answer:** *"While DSpace and Omeka are static metadata repositories, SIH26096 is an AI-powered Knowledge Discovery and Audio-Visual Platform. We integrate: (1) Hybrid dense-lexical RRF search, (2) an interconnected historical Knowledge Graph, (3) side-by-side OCR confidence auditing, (4) WebVTT subtitle intelligence for speech recordings, and (5) dual-mode interface designed specifically for public museum touchscreens with automated inactivity sanitization."*

### Q4: "Why does the System Status screen show 'FALLBACK' or 'UNAVAILABLE' for certain components?"
> **Answer:** *"That is by design under our core engineering principle of Radical Transparency. When heavy external binaries (like a local GPU LLM daemon, FFmpeg, or Whisper) are not installed on the host machine, standard systems either crash or synthesize fake output. Our platform transparently reports the genuine state, activates deterministic native fallback handlers (e.g. Python `wave`/`PIL`, curator vernacular translations), and never produces simulated or fake historical data."*
