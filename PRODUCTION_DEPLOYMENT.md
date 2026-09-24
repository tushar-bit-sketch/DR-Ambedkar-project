# PRODUCTION DEPLOYMENT RUNBOOK
## Dr. B. R. Ambedkar Digital Heritage Archive (SIH26096)
**Target Architecture:**
- **Frontend:** Vercel (React 19 + TypeScript + Vite + Tailwind CSS)
- **Backend:** Render / Railway / Docker / AWS ECS (FastAPI + Uvicorn Python 3.13)
- **Database:** Managed PostgreSQL 16 with `pgvector`
- **Object Storage:** AWS S3 / Cloudflare R2 / MinIO (Preservation Master Vault)
- **Hosted Cloud Inference:** Hugging Face Serverless Router (`router.huggingface.co/v1`) with `BAAI/bge-m3`

---

## 1. Environment Configuration

### Complete Production Environment Variables (`.env`)

Configure the following 11 variables in your backend hosting environment:

```bash
# 1. Database Connection (PostgreSQL with pgvector)
DATABASE_URL=postgresql://archive_admin:SECURE_PASSWORD@postgres.service.cloud:5432/ambedkar_archive

# 2. Secret Key (min 32 characters for JWT & Session signing)
SECRET_KEY=9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e

# 3. Trusted CORS Origins (JSON array format)
BACKEND_CORS_ORIGINS=["https://ambedkar-archive.vercel.app","https://archive.ambedkar.gov.in"]

# 4. Hugging Face Inference Token
HF_TOKEN=hf_YourHuggingFaceTokenWithInferenceAccessHere

# 5. Hugging Face Model Repository
HF_MODEL=BAAI/bge-m3

# 6. Hugging Face Inference Base URL
HF_BASE_URL=https://router.huggingface.co/v1

# 7. Vector Storage Backend
VECTOR_BACKEND=PGVECTOR

# 8. S3-Compatible Object Storage Endpoint
OBJECT_STORAGE_ENDPOINT=https://s3.ap-south-1.amazonaws.com

# 9. Object Storage Bucket Name
OBJECT_STORAGE_BUCKET=ambedkar-digital-heritage-vault

# 10. Object Storage Access Key ID
OBJECT_STORAGE_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE

# 11. Object Storage Secret Access Key
OBJECT_STORAGE_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

---

## 2. Deploying Backend to Cloud (Render / Railway / Docker)

### Option A: Render 1-Click Blueprint (`render.yaml`)

1. Connect your repository to [Render](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Select this repository. Render automatically reads `render.yaml` and provisions:
   - Managed PostgreSQL 16 database.
   - FastAPI Python Web Service with automatic health checking on `/health/live`.
4. In Render Dashboard, populate `HF_TOKEN` and optional `OBJECT_STORAGE_*` secrets.

### Option B: Docker Compose Production Deployment

```bash
# Clone the repository
git clone https://github.com/tushar-bit-sketch/DR-Ambedkar-project.git
cd DR-Ambedkar-project

# Copy environment template
cp .env.example .env
# Edit .env with your production secrets

# Build and start all services (PostgreSQL, Redis, FastAPI, Nginx)
docker compose -f docker-compose.production.yml up -d --build

# Verify container health
docker compose -f docker-compose.production.yml ps
```

---

## 3. Database Initialization & Seeding Real Archival Data

Once the PostgreSQL container/service is running, initialize the tables and seed the authenticated archival corpus:

```bash
cd backend
source venv/bin/activate  # Or activate your Python environment

# 1. Verify connection and apply schema migrations
python -c "from app.db.session import engine; from app.db.base import Base; Base.metadata.create_all(bind=engine)"

# 2. Seed authentic primary archival corpus (33 documents, 8 collections, 31 timeline events, 35 entities, 5 media records)
python -m app.db.populate_authentic_archive
```

---

## 4. Deploying Frontend to Vercel

1. Import the repository into the [Vercel Dashboard](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variables in Vercel:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://ambedkar-archive-backend.onrender.com/api/v1`)
   - `VITE_DEMO_MODE`: `false` (Ensures 100% zero-canned-answer mode)
5. Deploy. Vercel will build and serve the static SPA on edge CDN.

---

## 5. Post-Deployment Verification Smoke Tests

Execute these verification commands against your live backend to confirm full system readiness:

```bash
# 1. Health & Liveness
curl -fsSL https://your-backend.com/health/live
# Expected: {"status":"alive"}

# 2. Subsystem Telemetry Status
curl -fsSL https://your-backend.com/api/v1/system/status
# Expected: JSON showing operational status for database, search, and storage

# 3. Document Catalog Listing
curl -fsSL "https://your-backend.com/api/v1/documents?page_size=5"
# Expected: total >= 33, items array containing authentic records (AMB-CAD-1949-042, etc.)

# 4. Hybrid Search Execution
curl -fsSL "https://your-backend.com/api/v1/search?q=Constitution&mode=hybrid"
# Expected: HTTP 200 with ranked search results and facet metadata

# 5. Closed-World RAG Query
curl -fsSL -X POST https://your-backend.com/api/v1/research/ask \
  -H "Content-Type: application/json" \
  -d '{"query":"What was the Grammar of Anarchy address?"}'
# Expected: HTTP 200 with status "SUCCESS", citations mapping to AMB-CAD-1949-042, and grounded: true
```
