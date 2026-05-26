# Prepora.ai — Development Plan

## 1) Objectives
- Deliver a working exam-prep platform: **Upload → AI analyze → Generate questions → Practice → Results + Rankings + Reports + Notes**.
- Keep all persistent data in **Supabase** (DB + Storage + Realtime), with **FastAPI** proxy for secure Claude calls.
- Mobile-first UX with the provided design system (Indigo/Amber/Green, BG #F8FAFC, Inter/Poppins) and responsive navigation (desktop sidebar + mobile bottom nav).

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation; must pass before building app)
**Goal:** Prove the 3 external dependencies work end-to-end: Supabase DB, Supabase Storage, Claude via FastAPI.

1. **Web search / best-practice quick check**
   - Verify current Anthropic best practice for server-side calls, model naming, and streaming/non-streaming response handling.

2. **Create a single Python POC test script** (run locally in repo)
   - Reads env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.
   - **DB check:** select 1 row from a known table (or list tables via a known lightweight query if available).
   - **Storage check:** list bucket `prepora-uploads` (or attempt a small upload + signed URL).
   - **Claude check:** call FastAPI endpoint `/api/claude/analyze-content` with short sample text.

3. **Implement minimal FastAPI proxy skeleton**
   - Add `/health`.
   - Add `/api/claude/analyze-content` that calls Anthropic (non-streaming) and returns normalized JSON.
   - Add strict error handling: timeouts, bad requests, rate-limit friendly messages.

4. **POC pass gate**
   - Do not proceed until: Supabase reachable + bucket verified + Claude returns structured JSON.

**User stories (Phase 1)**
1. As a developer, I can run one script and confirm Supabase DB is reachable.
2. As a developer, I can confirm the `prepora-uploads` bucket exists and accepts uploads.
3. As a developer, I can confirm Claude responses flow only through the backend proxy.
4. As a developer, I can see clear error messages when keys/config are wrong.
5. As a developer, I can confirm response JSON shape is stable for frontend consumption.

---

### Phase 2 — V1 Full App Build (15 pages, built around proven core)
**Goal:** Implement the full product experience with secure AI, Supabase auth/CRUD, storage uploads, realtime ranks, charts, XP/achievements.

1. **Project wiring (env + clients)**
   - Frontend `.env`: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_BACKEND_URL`.
   - Create `supabaseClient.js` and backend `settings.py`.
   - Standardize API response contracts for all 5 Claude calls.

2. **Backend (FastAPI) — complete proxy**
   - Implement endpoints:
     - `POST /api/claude/analyze-content` (Call 1)
     - `POST /api/claude/generate-questions` (Call 2)
     - `POST /api/claude/evaluate-subjective` (Call 3)
     - `POST /api/claude/generate-notes` (Call 4)
     - `POST /api/claude/peer-analysis` (Call 5)
   - Add request validation (Pydantic), model selection, max tokens, and safe prompt templates.
   - Add CORS config to allow the React app domain.

3. **Frontend foundation (React + Tailwind)**
   - App shell: **desktop left sidebar** + **mobile bottom nav (5 tabs)**.
   - Shared UI system: buttons, cards, tabs, modals, toasts, skeleton loaders, empty states.
   - Protected routing wrapper (redirect to `/login`).

4. **Auth + onboarding flow (core data model wiring)**
   - Pages: `/signup`, `/login`, `/onboarding`.
   - On signup: Supabase auth + insert into `parents`.
   - On onboarding: create child in `children`, store preferences.
   - Seed **15 mock peers** on first child creation (idempotent guard).

5. **Core workflow pages (Upload → AI → Practice → Results)**
   - `/upload`: upload file to Storage `prepora-uploads`, store metadata in `uploaded_materials`, call **analyze-content**.
   - `/generate`: call **generate-questions**, store in `generated_questions`.
   - `/question-bank`: filters + build custom test → create `practice_sessions`.
   - `/practice/:sessionId`: multi-mode runner (Quick/Chapter/Mock/AI Revision/Challenge) with autosave answers.
   - `/results/:sessionId`: compute score, show peer comparison, call **evaluate-subjective** when needed.

6. **Rankings + insights + reports**
   - `/leaderboard`: 4 tabs; realtime updates via Supabase channels; anonymous names.
   - `/my-standing`: rank summary + radar/trajectory charts + **peer-analysis** feedback.
   - `/dashboard`: stats cards + weekly chart + subject chart + weak topics + peer comparison.
   - `/reports`: printable view + WhatsApp share link; weekly rank snapshots to `rank_history`.

7. **Notes + achievements + settings**
   - `/notes`: call **generate-notes**; flashcards; bookmarks; search.
   - `/achievements`: XP, level, badges; auto-check milestones (sessions completed, streaks, accuracy).
   - `/settings`: edit parent/child, privacy toggle, anonymous display name.

8. **Incremental testing after core flows**
   - Smoke test each page route.
   - Verify RLS-safe queries (only own parent/children data).
   - Verify file upload + signed URL preview.

9. **Phase 2 close: run testing_agent_v3**
   - Validate backend endpoints + key frontend flows (signup → onboarding → upload → generate → practice → results → leaderboard).

**User stories (Phase 2)**
1. As a parent, I can sign up, add a child, and set preferences in onboarding.
2. As a parent, I can upload a PDF and immediately see AI-extracted topics and weak areas.
3. As a student, I can generate a 10-question quiz and start a practice session.
4. As a student, I can finish a session and view results with anonymous peer comparison.
5. As a parent, I can view leaderboard standings in realtime and see progress trends in reports.

---

### Phase 3 — Final testing, hardening, and polish
1. **Comprehensive E2E testing with testing_agent_v3**
   - Backend: all 5 Claude endpoints (happy path + error paths).
   - Frontend: auth, upload, generation, practice, results, leaderboard realtime.

2. **Performance + reliability fixes**
   - Add caching where safe (notes/questions per material).
   - Add retry/backoff UX for Claude failures.
   - Ensure loading/skeleton and empty states are consistent.

3. **Data integrity + edge cases**
   - Idempotency on peer seeding + rank snapshot.
   - Verify privacy toggle affects leaderboard display.

4. **Release readiness**
   - Remove any exposed keys from frontend.
   - Confirm all secrets only in backend env.

**User stories (Phase 3)**
1. As a user, I never see a broken screen—errors are actionable and recoverable.
2. As a user, uploads and generated content remain consistent after refresh/relogin.
3. As a parent, I can trust leaderboard anonymity and privacy settings.
4. As a student, I get consistent scoring and explanations even under load.
5. As an admin/developer, I can run automated tests and quickly pinpoint failures.

---

## 3) Next Actions
1. Add env files (frontend + backend) with provided Supabase URL/key and Anthropic key (backend only).
2. Implement Phase 1 POC script + minimal FastAPI endpoint and run until passing.
3. Once POC passes, scaffold React app shell + routing + nav.
4. Implement the core workflow pages (upload → generate → practice → results) before secondary pages.
5. Run testing_agent_v3 at end of Phase 2, then harden in Phase 3.

## 4) Success Criteria
- **Phase 1:** One script confirms Supabase DB + Storage + Claude proxy all working.
- **Phase 2:** Full 15-page app navigable; core flow works end-to-end with real Supabase data and secure AI calls.
- **Realtime:** Leaderboard updates live via Supabase channels; anonymity respected.
- **Reliability:** Clear error handling, no key exposure in frontend, RLS-compatible queries.
- **Phase 3:** testing_agent_v3 passes for critical flows and API endpoints; no regression in core workflow.
