# PHASE 5.5 — System Environment & AI Readiness Audit

**Project:** SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar  
**Audit Date:** September 21, 2026  
**Auditor:** Antigravity Autonomous Agent  

---

### 1. Hardware Environment

| Metric | Detected Value | Implications / Assessment |
| :--- | :--- | :--- |
| **Operating System** | Microsoft Windows 11 Home (Build 10.0.26200) | Standard 64-bit Windows environment. |
| **CPU** | AMD Ryzen 5 7535HS (6 Cores, 12 Logical Processors) | Capable of moderate multi-threaded CPU inference. |
| **System RAM** | 7.56 GB Total / ~1.0 GB Currently Available | **Strict Constraint:** High memory pressure. Large models (e.g., 7B–13B parameters) will cause OOM or heavy swap thrashing. Compact models (< 3B parameters) or lightweight quantized models are strictly necessary. |
| **Storage (Disk)** | C:\ Drive: 169 GB Free / 512 GB Total | Ample disk space for lightweight models and caching. |
| **Discrete GPU** | AMD Radeon RX 6550M (4 GB VRAM) | AMD RDNA architecture. **No NVIDIA CUDA support.** DirectML / CPU inference is standard on Windows for this device. |
| **Integrated GPU** | AMD Radeon Graphics (512 MB VRAM) | Display adapter. |

---

### 2. Software & AI Runtimes

| Component | Status | Detail |
| :--- | :--- | :--- |
| **Python Version** | `Python 3.13.7` | Running in `backend/venv`. Wheels for PyTorch 2.14+ are available, but heavy frameworks must be validated under memory constraints. |
| **PyTorch** | `NOT INSTALLED` | Not installed in `backend/venv`. |
| **Transformers** | `NOT INSTALLED` | Not installed in `backend/venv`. |
| **Sentence-Transformers** | `NOT INSTALLED` | Not installed in `backend/venv`. |
| **FlagEmbedding** | `NOT INSTALLED` | Not installed in `backend/venv`. |
| **Ollama Service** | `NOT RUNNING / NOT INSTALLED` | Port 11434 is closed. `winget` package `Ollama.Ollama` is available for installation. |
| **LM Studio Service** | `NOT RUNNING` | Port 1234 is closed. |
| **PostgreSQL / pgvector** | `NOT RUNNING` | No local PostgreSQL service found on port 5432. Active fallback: `SqliteVectorStore`. |

---

### 3. Recommended Action Plan for Phase 5.5

1. **LLM Activation:**
   - Install and launch **Ollama** via `winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements`.
   - Select a compact instruction-following model that comfortably fits within the available ~1.0 GB - 3.5 GB RAM footprint (e.g., `qwen2.5:0.5b`, `qwen2.5:1.5b`, `llama3.2:1b`, or `phi3:mini`).
   - Configure `LLM_PROVIDER=ollama`, `LLM_MODEL=qwen2.5:1.5b` (or installed model), `LLM_BASE_URL=http://localhost:11434`.
   - Verify real inference execution with zero synthetic fallback.

2. **Embedding & Reranker Activation (BGE-M3 & BGE-Reranker):**
   - Test if PyTorch + HuggingFace transformers / sentence-transformers or ONNX runtime can load `BAAI/bge-m3` without exceeding memory limits.
   - Alternatively, evaluate if Ollama can serve `bge-m3` embeddings directly (`ollama pull bge-m3`).
   - If memory / dependency limitations prevent local loading, keep transparent `MODEL_UNAVAILABLE` degraded mode as mandated by Phase 4 & 5 requirements.

3. **End-to-End Archival Verification:**
   - Index legitimate archival documents (`SearchChunk`).
   - Execute 3 real archival queries through `ArchivalRetrievalEngine`.
   - Execute real RAG through `ArchivalRAGEngine` with real LLM inference.
   - Verify citation resolution and direct quotation fidelity.
   - Run security, prompt injection, RBAC, and LLM failure tests.
