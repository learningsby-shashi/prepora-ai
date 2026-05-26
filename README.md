# Prepora.ai

**Tagline**: Scan. Learn. Practice. Improve.

AI-powered exam-preparation platform for Indian school students (CBSE, ICSE, JEE, NEET, UPSC, CAT). Parents upload any chapter or worksheet, AI generates personalised practice papers, and students compete anonymously on a class leaderboard while getting AI-coached feedback.

## Tech Stack
- **Frontend**: React 19 (CRA + Craco) + Tailwind + Recharts + Supabase JS
- **Backend**: FastAPI proxy for Anthropic Claude (5 endpoints) + PDF/image extraction (pdfplumber + Claude Vision)
- **Database / Auth / Storage / Realtime**: Supabase
- **AI Model**: Anthropic `claude-sonnet-4-5-20250929`

## Repo layout
```
/app
  /backend          FastAPI Claude proxy + file extraction
    server.py
    requirements.txt
    .env.example
  /frontend         React app
    src/
    public/
    package.json
    vercel.json
    .env.example
  DEPLOYMENT.md     Step-by-step production deployment guide
  README.md         (this file)
```

## Local development
```bash
# Backend
cd backend && pip install -r requirements.txt
cp .env.example .env  # fill in real values
uvicorn server:app --reload --port 8001

# Frontend (separate terminal)
cd frontend && yarn install
cp .env.example .env  # fill in real values
yarn start
```

## Production deployment
See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full Vercel + Render + custom-domain walkthrough.

## Features
- Supabase auth (email/password, no confirmation friction)
- 3-step onboarding with auto-seeded mock peers (idempotent)
- 15-page React app: Dashboard, Upload, Generate, Question Bank, Practice (5 modes), Results, Leaderboard (4 tabs + Realtime), My Standing, Reports, Notes, Achievements, Settings
- 5 AI endpoints (analyze, generate, evaluate, notes, peer-analysis) with in-memory caching
- Server-side PDF/image OCR
- XP, levels, streaks, achievements
- Anonymous class leaderboard with Supabase Realtime
- Full white-label branding
