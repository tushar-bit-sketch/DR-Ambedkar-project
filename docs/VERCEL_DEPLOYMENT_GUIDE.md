# Vercel Deployment & GitHub Publishing Guide

**Project**: SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar  
**Target Platform**: GitHub & Vercel (`*.vercel.app`)  
**Architecture**: React 18 + Vite 8 SPA (Vercel Global Edge CDN) + FastAPI Python Backend  

---

## 1. Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                           DEPLOYMENT ARCHITECTURE                                 |
+-----------------------------------------------------------------------------------+
|  [ GitHub Repository ]                                                            |
|       │                                                                           |
|       ├──► [ Vercel Edge Network ] ──► https://<your-project>.vercel.app          |
|       │       • React 18 + Vite 8 Frontend                                        |
|       │       • Instant Global CDN Caching                                        |
|       │       • SPA Client-Side Routing Rewrites (vercel.json)                    |
|       │       • Standalone Resilient Mode (Zero-crash offline fallback data)       |
|       │                                                                           |
|       └──► [ Cloud Backend (Optional) ] ──► https://api.yourdomain.com/api/v1     |
|               • FastAPI + Python 3.13                                             |
|               • SQLite / Managed PostgreSQL 16                                    |
|               • Configured via VITE_API_URL environment variable                  |
+-----------------------------------------------------------------------------------+
```

The platform is designed with **Hybrid Standalone Resilience**:
- When deployed on Vercel, the frontend includes verified primary archival records, interactive timeline events, knowledge graph topology, and 10 demonstration stages built directly into the client bundle.
- If an external backend is connected via `VITE_API_URL`, the application seamlessly switches to live dynamic queries. If the backend is offline or waking up from sleep, the frontend never crashes with a blank screen.

---

## 2. Step-by-Step: Initialize Git & Push to GitHub

### Step 2.1: Initialize Git and Check Staged Files
Open PowerShell in the project root:

```powershell
cd c:\Users\tusha\OneDrive\Desktop\SIH261096

# Initialize git repository
git init

# Check status (confirm .gitignore excludes venv and node_modules)
git status
```

### Step 2.2: Commit the Codebase
```powershell
# Stage all files
git add .

# Verify nothing unwanted (like venv or node_modules) is staged
git status

# Commit
git commit -m "feat: complete SIH26096 Digital Heritage Archive platform (Phase 1-10)"
```

### Step 2.3: Create GitHub Repository & Push
1. Go to [https://github.com/new](https://github.com/new).
2. Create a new repository named `sih26096-heritage-archive` (Public or Private).
3. Do **not** initialize with a README, .gitignore, or license (we already have them).
4. Run the following commands:

```powershell
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/sih26096-heritage-archive.git
git push -u origin main
```

---

## 3. Step-by-Step: Deploy to Vercel

### Method A: Vercel Web Dashboard (Recommended / 1-Click)

1. **Log In to Vercel**:
   - Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.

2. **Import Repository**:
   - On the Vercel dashboard, click **"Add New..."** -> **"Project"**.
   - Under "Import Git Repository", find `sih26096-heritage-archive` and click **"Import"**.

3. **Configure Project Settings**:
   - **Framework Preset**: `Vite` (automatically detected).
   - **Root Directory**: Leave as `./` (the included root `vercel.json` and `package.json` build the frontend automatically), OR set to `frontend`.
   - **Build Command**: `npm --prefix frontend run build` (or `npm run build` if Root Directory is `frontend`).
   - **Output Directory**: `frontend/dist` (or `dist` if Root Directory is `frontend`).

4. **Environment Variables (Optional)**:
   - If you have deployed the FastAPI backend to a cloud service (e.g. Render, Railway, Fly.io):
     - Name: `VITE_API_URL`
     - Value: `https://your-backend-api.com/api/v1`
   - If not set, the frontend will automatically run in **High-Fidelity Verified Standalone Mode**.

5. **Deploy**:
   - Click **"Deploy"**.
   - In approximately 30 to 45 seconds, Vercel will complete the build and assign a production URL:
     `https://sih26096-heritage-archive.vercel.app`

---

### Method B: Vercel CLI (From Terminal)

If you prefer terminal deployment:

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Deploy to preview
vercel

# Deploy directly to production
vercel --prod
```

---

## 4. Why Vercel Deployment Succeeds Out-of-the-Box

1. **SPA Rewrites Configured**:
   Both `vercel.json` (at root) and `frontend/vercel.json` contain:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   This ensures direct navigation and browser refreshes on routes like `/demo`, `/system-status`, `/explore`, and `/timeline` never throw 404 errors.

2. **Security Headers Pre-configured**:
   Vercel injects institutional security headers on every response:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`

3. **Sub-160 kB Compressed Transfer**:
   With Vite 8 manual chunk splitting (`vendor-react`, `vendor-icons`, `index`), initial page load is lightning fast globally.

---

## 5. (Optional) Deploying the Backend API Online

If you want the live FastAPI backend running in the cloud alongside Vercel:

| Provider | Setup Steps | Free Tier |
| :--- | :--- | :---: |
| **Render** | 1. Go to [render.com](https://render.com) -> New Web Service.<br>2. Connect GitHub repo.<br>3. Root Directory: `backend`.<br>4. Build: `pip install -r requirements.txt`.<br>5. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. | Available |
| **Railway** | 1. Go to [railway.app](https://railway.app) -> New Project.<br>2. Deploy from GitHub repo (`backend/Dockerfile`). | Available |
| **Fly.io** | Run `fly launch` in `backend/` directory. | Available |

Once deployed, copy your backend URL and paste it into the Vercel project's **Environment Variables** as `VITE_API_URL`.
