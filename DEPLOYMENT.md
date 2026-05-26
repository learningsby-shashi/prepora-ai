# Prepora.ai — Production Deployment Guide

## Architecture
- **Frontend**: React (CRA + Craco). Recommended host: **Vercel**.
- **Backend**: FastAPI Claude proxy (port 8001). Cannot be hosted on Vercel directly (long-running process + uses pdfplumber). Recommended host: **Render**, **Railway**, **Fly.io**, or **AWS App Runner**.
- **Database / Auth / Storage / Realtime**: **Supabase** (already provisioned).

## 1. Backend Deployment (Render / Railway / Fly.io)

### Files needed (already present)
- `backend/server.py`
- `backend/requirements.txt`
- `backend/.env` (do NOT commit; set as service env vars)

### Render (recommended for simplicity)
1. Create new **Web Service** → connect GitHub repo (or upload).
2. Build command: `pip install -r backend/requirements.txt`
3. Start command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Environment variables (Render dashboard):
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `CORS_ORIGINS=https://prepora.co.in,https://www.prepora.co.in`
5. Note the public URL Render gives you (e.g. `https://prepora-api.onrender.com`).

### Railway
Similar steps; set the Root Directory to `backend`, start command:
`uvicorn server:app --host 0.0.0.0 --port $PORT`

## 2. Frontend Deployment (Vercel)

### Step A — Update vercel.json
Replace `https://your-backend-domain.com` in `frontend/vercel.json` with your backend URL from step 1.

### Step B — Set Vercel project env vars
In Vercel → Project → Settings → Environment Variables:
- `REACT_APP_BACKEND_URL` = your backend URL (or leave blank if you use the `/api` rewrite — then frontend can call `/api/...` and Vercel will proxy it).
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

### Step C — Deploy
1. Connect repo to Vercel (or `vercel --prod` via CLI).
2. Project Root = `frontend`.
3. Framework preset = Create React App.
4. Build command auto-detected (`yarn build`).
5. Vercel deploys. Verify the preview URL works.

## 3. Custom Domain (prepora.co.in)

### In Vercel
1. Project → Settings → Domains → Add `prepora.co.in` and `www.prepora.co.in`.
2. Vercel shows the required DNS records:
   - For root: `A` record → 76.76.21.21 (or Vercel's nameservers)
   - For www: `CNAME` → `cname.vercel-dns.com`
3. Set the same in your registrar (Namecheap / GoDaddy / Cloudflare).
4. Wait for SSL to provision (≤10 min).

### Update Supabase Auth allowed redirect URLs
1. Supabase → Authentication → URL Configuration → Site URL = `https://prepora.co.in`.
2. Add `https://prepora.co.in/**` to Redirect URLs.

### Update CORS on backend
Set `CORS_ORIGINS=https://prepora.co.in,https://www.prepora.co.in` in your backend host's env vars.

## 4. Post-Deploy Smoke Tests
- [ ] Visit `https://prepora.co.in/` — landing page loads, no Emergent badge
- [ ] Signup with a new email — redirects to onboarding
- [ ] Complete onboarding → dashboard renders with 15 mock peers
- [ ] Upload a small PDF — text extraction works via backend
- [ ] Generate 5 MCQs — Claude proxy answers
- [ ] Sign out → /login redirect
- [ ] Check Lighthouse: Performance ≥ 85, SEO ≥ 95, A11y ≥ 90
- [ ] Open Graph: paste your URL in `https://www.opengraph.xyz/` — preview shows correct title/image

## 5. Recommended next steps
- Replace in-memory cache with **Redis** (Upstash) once you scale to multiple backend instances.
- Add **Sentry** for backend error tracking (`pip install sentry-sdk[fastapi]`).
- Add **PostHog/Plausible** for product analytics.
- Set up **GitHub Actions** to run the existing POC test on every PR.
- Switch all `console.log` calls in production to a logger that respects NODE_ENV.
