# Prepora.ai — Development Plan (Updated)

## 1) Objectives
- Deliver a production-functional exam-prep platform: **Upload → AI analyze → Generate questions → Practice → Results + Rankings + Reports + Notes**.
- Keep all persistent data in **Supabase** (Auth + Postgres + Storage + Realtime), with **FastAPI** backend proxy for secure Anthropic Claude calls.
- Mobile-first UX with the provided design system (Indigo/Amber/Green, BG #F8FAFC, Inter/Poppins) and responsive navigation (desktop left sidebar + mobile bottom nav).
- Ensure **RLS-safe** data access for authenticated parents/children and privacy-safe peer benchmarking.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation; must pass before building app)
**Goal:** Prove the 3 external dependencies work end-to-end: Supabase DB, Supabase Storage, Claude via FastAPI.

**Status: ✅ COMPLETE**

1. **Web search / best-practice quick check**
   - Verify Anthropic server-side call best practices, model naming, and response handling.

2. **Create a single Python POC test script** (run locally in repo)
   - Reads env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.
   - **DB check:** verify required tables reachable.
   - **Storage check:** verify `prepora-uploads` bucket accessible (direct list used since bucket listing may be restricted).
   - **Claude check:** verify model calls return valid JSON.

3. **Implement minimal FastAPI proxy skeleton**
   - `/health` + `/api/claude/analyze-content`.
   - Strict error handling and normalized JSON.

4. **POC pass gate**
   - Proceed only after: Supabase reachable + bucket verified + Claude returns structured JSON.

**User stories (Phase 1)**
1. As a developer, I can run one script and confirm Supabase DB is reachable.
2. As a developer, I can confirm the `prepora-uploads` bucket exists and is accessible.
3. As a developer, I can confirm Claude responses flow only through the backend proxy.
4. As a developer, I can see clear error messages when keys/config are wrong.
5. As a developer, I can confirm response JSON shape is stable for frontend consumption.

---

### Phase 2 — V1 Full App Build (15 pages, built around proven core)
**Goal:** Implement the full product experience with secure AI, Supabase auth/CRUD, storage uploads, realtime ranks, charts, XP/achievements.

**Status: ✅ COMPLETE**

1. **Project wiring (env + clients)**
   - Frontend `.env`: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_BACKEND_URL`.
   - Backend `.env`: `ANTHROPIC_API_KEY`, Supabase URL/key (for tests/tools).
   - Created Supabase client and Claude API client.

2. **Backend (FastAPI) — complete Claude proxy**
   - Implemented endpoints:
     - `POST /api/claude/analyze-content` (Call 1)
     - `POST /api/claude/generate-questions` (Call 2)
     - `POST /api/claude/evaluate-subjective` (Call 3)
     - `POST /api/claude/generate-notes` (Call 4)
     - `POST /api/claude/peer-analysis` (Call 5)
   - Added request validation via Pydantic, CORS, JSON extraction guard.
   - Model used: `claude-sonnet-4-5-20250929`.

3. **Frontend foundation (React + Tailwind)**
   - App shell: desktop sidebar + mobile bottom nav.
   - Shared UI components: cards, stat cards, skeleton/empty states, toasts.
   - Protected routing (redirect to `/login` if unauthenticated; redirect to `/onboarding` if missing child).

4. **Auth + onboarding flow (core data model wiring)**
   - Pages: `/signup`, `/login`, `/onboarding`.
   - Parent row creation is handled in **AppContext** (after session is active), via **upsert + retry**.
   - Onboarding fixed to avoid mid-flow redirects (run-once redirect behavior).
   - Seeds **15 mock peers** (plus self peer entry) in `peer_benchmark_pool`.

5. **Core workflow pages (Upload → AI → Practice → Results)**
   - `/upload`: upload to `prepora-uploads` (MVP supports text extraction for text-like files; PDF/image uses paste-text), call analyze-content, save to `uploaded_materials`.
   - `/generate`: call generate-questions and persist into `question_banks`.
   - `/question-bank`: filter and launch practice.
   - `/practice/:questionBankId`: multiple modes (Quick/Chapter/Mock/AI Revision/Challenge), autosaves answers.
   - `/results/:sessionId`: scoring + optional AI evaluation for subjective.

6. **Rankings + insights + reports**
   - `/leaderboard`: tabs (Class/Subject/School/Race), realtime updates via Supabase channels.
   - `/my-standing`: rank summary, radar chart, trajectory chart, AI feedback via peer-analysis.
   - `/dashboard`: stats, weekly chart, subject chart, weak topics and peer comparison.
   - `/reports`: printable and WhatsApp share.

7. **Notes + achievements + settings**
   - `/notes`: generate notes from uploaded material + flashcards + bookmarks + search (nested-button warning fixed by converting list item wrapper to a div).
   - `/achievements`: XP, level progress, badge grid with auto-unlock attempts.
   - `/settings`: parent edit, child edit, peer privacy toggle, anonymous name generator.

8. **Incremental testing after core flows**
   - Route-level smoke tests.
   - Verified RLS-safe behavior after policies fixed.
   - Verified storage upload integration.

9. **Phase 2 close: run testing_agent_v3**
   - Backend endpoints: ✅ 6/6 pass.
   - Frontend flows: ✅ 16/16 pass.

**User stories (Phase 2)**
1. As a parent, I can sign up, add a child, and set preferences in onboarding.
2. As a parent, I can upload material and see AI-extracted topics/difficulty.
3. As a student, I can generate a quiz and start a practice session.
4. As a student, I can finish a session and view results with anonymous peer comparison.
5. As a parent, I can view leaderboard standings (anonymous) and see progress trends in reports.

---

### Phase 3 — Final testing, hardening, and polish
**Goal:** Stabilize V1, reduce console warnings, improve robustness, and prepare for scale.

**Status: 🟡 OPTIONAL / NEXT** (V1 already functional)

1. **Comprehensive E2E testing**
   - testing_agent_v3 already passing; add periodic regression runs.

2. **Performance + reliability fixes**
   - Cache AI outputs per material (notes/questions) to reduce repeated Claude calls.
   - Add retry/backoff UX and persistent job states for long Claude calls.

3. **Data integrity + edge cases**
   - Ensure peer seeding is idempotent (guard against duplicate seed runs).
   - Ensure rank history snapshots are inserted once per week.
   - Expand storage policies to be folder-scoped per child (if desired).

4. **Security + RLS hardening (important)**
   - **RLS policies must include `WITH CHECK`** for INSERT/UPDATE.
   - Confirm Storage bucket policies for `prepora-uploads` match desired access model.

5. **Console-warning cleanup (low priority)**
   - Fix remaining hydration warning in `Generate.js` (reported as option/span warning—verify and clean if still present).

**User stories (Phase 3)**
1. As a user, I never see a broken screen—errors are actionable and recoverable.
2. As a user, uploads and generated content remain consistent after refresh/relogin.
3. As a parent, I can trust leaderboard anonymity and privacy settings.
4. As a student, I get consistent scoring and explanations even under load.
5. As a developer, I can run automated regression tests and quickly pinpoint failures.

---

## 3) Next Actions
1. (Optional) Review/clean remaining console warnings (Generate.js).
2. Add caching to avoid re-generating notes/questions for the same material.
3. Add OCR/PDF text extraction (server-side) for true “scan” support.
4. Add richer analytics (time-on-question, per-topic mastery).
5. Add CI check to re-run minimal POC + smoke tests.

## 4) Success Criteria
- **Phase 1:** ✅ Script confirms Supabase DB + Storage + Claude proxy all working.
- **Phase 2:** ✅ Full 15-page app navigable; core flow works end-to-end with real Supabase data and secure AI calls.
- **Realtime:** ✅ Leaderboard updates via Supabase channels; anonymity respected.
- **Reliability:** ✅ Clear error handling; no Claude key exposure in frontend; RLS-compatible queries.
- **Testing:** ✅ testing_agent_v3 passes (Backend 6/6, Frontend 16/16).
