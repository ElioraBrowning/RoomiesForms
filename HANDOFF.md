# RoomiesForms — Technical Handoff & Diagnostic Brief (Token-Saver)

> **Purpose:** Pre-audited architecture map, requirements, and confirmed bug ledger from a full static + live E2E audit (`localhost:5173`, Render production, Google Apps Script, and `RoomiesForms_Submissions_Test`). Read this first to avoid re-scanning the repository.

---

## 1. Environment & Architecture Map

- **Active Frontend:** `Web/` — React 19 + TypeScript + Vite 8 + React Router 7 + custom CSS (`Web/src/index.css`, ~5,089 lines).
- **Live Production Site:** `https://roomiesforms-gqiq.onrender.com/` (Render Static Site; SPA routing verified HTTP 200 on deep links; auto-deploys `main`). Used for final recorded presentation.
- **Local Dev:** `npm --prefix Web run dev` → `http://localhost:5173` (must keep working smoothly for frontend devs).
- **Current Backend:** Serverless Google Apps Script (GAS) Web App backed by Google Sheet `RoomiesForms_Submissions_Test` (`19aVoTCtVOTTGq5T5kIKWOZ7LdExjz8ur_dmiUz-i6mw`). Note: GAS source (`*.gs`) is gitignored and lives in Google Apps Script directly.
- **Legacy / Decommissioned:** `Backend/` (.NET 10 Web API) and root `Dockerfile` are decommissioned; ignore unless removing/replacing.
- **Commands:**
  - `npm --prefix Web run dev` / `build` / `lint` (`oxlint`)
  - `npm --prefix Web test` (offline contract suite, 31 files)
  - `npm --prefix Web run test:live` (live GAS integration suite)

### Key Frontend Files
- Routing & Shell: `Web/src/App.tsx`, `Web/src/components/Layout.tsx`, `Web/src/components/Breadcrumbs.tsx`, `Web/src/components/NotificationBell.tsx`
- Auth & API: `Web/src/context/AuthContext.tsx`, `Web/src/pages/Login.tsx`, `Web/src/pages/AuthCallback.tsx`, `Web/src/services/api.ts`, `Web/src/services/googleSheetsService.ts`, `Web/src/services/mockData.ts`, `Web/src/services/mockPlacements.ts`
- Dashboards: `Web/src/pages/Dashboard.tsx`, `Web/src/components/dashboards/StudentDashboard.tsx`, `FacultyDashboard.tsx`, `DepartmentHeadDashboard.tsx`, `DepartmentTaskCenter.tsx`, `InlineReviewPanel.tsx` (+ unused shims `DeanDashboard.tsx`, `DeanTaskCenter.tsx`)
- Forms & Pages: `Web/src/pages/FormView.tsx`, `SubmissionReview.tsx`, `FormBuilder.tsx`, `Assignments.tsx`, `Analytics.tsx`, `SurveyResults.tsx`, `EmployerReview.tsx`, `Profile.tsx`
- Form Engine & Schemas: `Web/src/forms/FormRunner.tsx`, `schemaRegistry.ts`, `feedback.ts`, `validation.ts`, `Web/src/forms/schemas/{CS401,CS402,CS403,CS404,CS405,CS410,CS420,ExitSurvey}.json`
- Branding & Assets: `Web/src/brand.ts`, `Web/index.html`, `Web/public/`, `Web/brand/`, `Web/src/assets/`

---

## 2. Hard Requirements & Priority Order

**Order of work:** Functionality & bug fixing FIRST → Security & Sheet architecture → Brand/SVG/Accessibility → Optimization, tests & cleanup.
**Liberty:** Full freedom to modify frontend, backend, add features, or adopt a safer free backend/proxy (e.g., Cloudflare Workers / Render Web Service / Supabase with Sheet export) as long as it is safe (zero data leaks) and meets all requirements.

1. **Zero Dean Access:** No `Dean` role, UI copy, routes, shims, or CSS branding anywhere.
2. **Admin Account (`cs@southeastern.edu`):** Canonical admin account (always accessible to current CS department head). Must control everything: user/role/permission management, form builder & review step config, assignments, submission review/overrides, analytics, and survey results. Eliminate hardcoded personal identities (Dr. Alkadi / Dr. Achée) from authorization checks.
3. **Google Sheet Backend Redesign (Distributed Across Cells):**
   - Adapt & improve `RoomiesForms_Submissions_Test` for long-term faculty readability/maintenance.
   - **Distribute form payloads across individual cells/columns** (e.g., per-form tabular tabs `Resp_CS401`, `Resp_CS402`, `Resp_CS403` / `Resp_CS403_Objectives`, `Resp_CS404`, `Resp_CS405_Weeks`, `Resp_CS410`, `Resp_CS420`, `Resp_ExitSurvey` with 1 column per field, auto-adding columns for new Form Builder fields) instead of cramming answers into single `ResponsesJson` / `Full Payload (JSON)` cells.
   - Confirm every frontend view & mutation actually works end-to-end against real persisted data (no fake mock fallbacks masking broken writes).
4. **Logo Replacement:** Replace all raster PNG/WebP logos with the official SVG logos Areeba is receiving from her teammate (update `Web/src/brand.ts`, `Web/index.html`, `EmployerReview.tsx`, print letterheads, and delete unused multi-MB images).
5. **Official Southeastern Brand & WCAG 2.1 AA Compliance:**
   - Official colors: Primary Green `#215732` (PMS 357 C), Primary Gold `#FFC72C` (PMS 123 C); secondary accents used sparingly (`#6CCA98`, `#CB9700`, `#EA6852`, `#E07C00`).
   - Naming: Always `"Southeastern Louisiana University"` on first reference / `"Southeastern"` thereafter; never `"SELU"` in visible UI copy (email inputs must accept both `@selu.edu` and `@southeastern.edu`).
   - Full WCAG 2.1 Level AA compliance (contrast ≥ 4.5:1 text / 3:1 UI, keyboard & Escape support, skip link, ARIA modal semantics, zero horizontal scroll/reflow overflow).

---

## 3. Confirmed Bugs & Gaps Ledger

### P0 — Security & Auth (Fix Immediately)
- **Broken Google OAuth (`Web/src/services/api.ts:843-847`, `Web/src/pages/AuthCallback.tsx:30-41`):** `api.post('/auth/google', { code, redirectUri })` completely ignores `code` and runs `const email = body?.email || 'eliora.browning@selu.edu'`—logging **every** Google OAuth user into Eliora Browning's account.
- **Exposed GAS API Key in Git & Public Client Bundle:** `Web/.env` is tracked in Git (`.gitignore` only ignores `Web/.env.local`), and the key is also hardcoded in `tests/e2e/helpers/api-client.js:49` and `tests/e2e/tier1-features/f9-live-gas.test.js:45,48`, and compiled into Render's public JS bundle via `VITE_GOOGLE_APPS_SCRIPT_KEY`. Rotate the key, scrub from git/tests, and move secret-bearing calls behind a real server-side auth/proxy layer (or switch to a backend with real Google ID-token verification).
- **No Server-Side Session/RBAC Verification (`Web/src/services/api.ts:210-215`):** `login` returns a `gas-session-*` token that is never sent back; GAS trusts client-supplied `userEmail`/`roles`. Any user can spoof reviewer/admin emails.
- **Substring Auth Bypass (`Web/src/pages/Analytics.tsx:17-33`):** `email.includes('achee')` / `email.includes('alkadi')` lets arbitrary matching emails pass.
- **Exit Survey Role Spoofing Leaks Private Notifications (`Web/src/services/api.ts:196-208`):** `kazim.sekeroglu@selu.edu` is stored as `Student` in the Sheet, so `api.ts` remaps all his requests to `galkadi@selu.edu` (`Faculty`), leaking Faculty review notifications (`CS 402`/`CS 403`) into his `NotificationBell`.

### P0 — Admin & Google Sheet Backend
- **`cs@southeastern.edu` Not Recognized:** Logging in auto-creates a `Student` row (`FullName: "Cs"`). GAS has no user-management endpoints (`getUsers` → `Unknown action: getUsers`).
- **`Users` Sheet Alias Pollution:** Duplicate rows for `bonnie.achee@selu.edu` (Student), `alkadi@selu.edu` (Student), `kazim.sekeroglu@selu.edu` (Student), and `cs@southeastern.edu` (Student) appear in `getStudents` → show up as "Students" in `/assignments` and inflate `"8 students assigned"` on Exit Survey results. Canonicalize `@selu.edu` ↔ `@southeastern.edu` server-side.
- **JSON-Blob Storage & Redundant Dual-POST:** `Submissions.ResponsesJson`, `AnonymousResponses.ResponsesJson`, and `Submissions_Log.Full Payload (JSON)` store unindexed JSON blobs. Remove client-side dual-POST (`googleSheetsService.ts`) and handle atomic tabular writes server-side.
- **Empty `{}` Audit Payloads:** `DepartmentTaskCenter.tsx:281,378` passes `responses: {}` to `submitToGoogleWorkspace`.
- **Stale Test Data in Sheet:** Clean up orphaned notifications pointing to `/submissions/1793926314401`, joke Exit Survey row (`"How to get a budget."`), legacy colliding `Submission ID = 1` log rows, and diagnostic test rows (`Submissions` `#3` `"Diagnostic Test Corp"`, `Users` `#10`).

### P1 — Frontend Functional & Data Integrity Bugs
- **Fabricated Data in Quick Review (`Web/src/components/dashboards/InlineReviewPanel.tsx:85-97,258-316`):** Reads wrong keys (`companyName`, `jobDuties`, `majorGpa`, `weeklyHours`) vs `CS401.json` (`employerName`, `jobResponsibilities`, `gpa`) and fabricates fake fallbacks on screen: GPA `3.50`, `Senior`, `Corporate Partner`, `supervisor@company.com [Verified]`, `20 hrs/wk (Spring 2027)`, and fake job duties. Also `DepartmentTaskCenter.tsx:671` falls back to fake `W0123456`.
- **Fake Analytics & Placebo Sheet Sync (`Web/src/components/dashboards/DepartmentHeadDashboard.tsx:14-21,129-183,302`):** KPIs come strictly from hardcoded `mockPlacements.ts` + `localStorage` (not live CS 401/404 data). Pasting a Sheet URL in `Sync Google Sheet` is a no-op showing a fake success message. Banner `"You have student internship forms ready for review..."` renders even with 0 pending items.
- **Broken Undo, Revoke & Silent API Failures (`Web/src/components/dashboards/DepartmentTaskCenter.tsx:235-399`):** `handleApproveNext` commits to GAS immediately so 5s `Undo` only reverts local React state; `handleRevoke` never calls backend; API failures are swallowed with `.catch(console.error)`. `getOrigin()` (`lines 47-56`) misclassifies CS 404/405 as Employer and CS 410/420 as Faculty.
- **Wrong Breadcrumb Form Titles (`Web/src/components/Breadcrumbs.tsx:9-18`):** Hardcodes wrong titles (`CS 401: Pre-Internship Agreement`, `CS 402: Post-Internship Evaluation`, `CS 403: Internship Bi-Weekly Report`, `CS 420: Senior Capstone Proposal`) and displays `Form #ExitSurvey` for slugs.
- **CS 401 Draft Hydration Bug (`Web/src/pages/FormView.tsx:91-107`):** When a partial draft exists, `if (draft)` skips merging student profile defaults (`name`, `email`, `wNumber`), leaving Page 1 blank.
- **Offline Schema Lookup Bug (`Web/src/forms/schemaRegistry.ts:46-54`):** `getStaticSchema(keyOrId)` fails for numeric IDs (`1`–`8`) used in `/forms/1` links.
- **SubmissionReview Race & Overlap (`Web/src/pages/SubmissionReview.tsx:81-95`):** Flashes `"This form's definition couldn't be loaded."` while schema is still fetching; sticky `.decision-bar` overlaps `"Back to dashboard"`.
- **Placebo Profile Settings (`Web/src/pages/Profile.tsx:91-169`):** Email notification frequency radios only write to `localStorage` (no email backend); `"Default to Task Center & Approvals"` is shown to Faculty who have no Task Center.
- **FormBuilder Error Swallowing (`Web/src/services/api.ts:460-475`):** `saveFormSchema` / `createForm` silently catch errors and pretend save succeeded.

### P1 — UI, Brand & WCAG 2.1 AA Accessibility Bugs
- **Header Horizontal Overflow (`Web/src/index.css`, `Layout.tsx`):** At 855px–1280px (Faculty & Dept Head), `.navbar-floating` overflows horizontally, pushing Notification Bell, Theme Toggle, and Account button off-screen.
- **Dark Mode Contrast Failures:** Department Head active tab (`"Task Center & Approvals"`) renders dark green text on dark green bg; Login divider (`Login.tsx:176`) uses undefined `var(--color-text-muted, #666)`.
- **`<select>` Caret Wrapping:** Dropdown arrows wrap to a second line in `FormBuilder.tsx` and `DepartmentTaskCenter.tsx`.
- **Account Dropdown Translucency:** Student Dashboard light-mode dropdown lets summary cards bleed through.
- **Modal Accessibility (`DepartmentHeadDashboard.tsx:466,510`):** Modals ignore `Escape`, lack `aria-modal="true"`, `aria-labelledby`, and focus trapping. Missing skip-to-content link in `Layout.tsx`.
- **Minor UI Polish:** Login page stacks vertically after sign-out at `1280x800` clipping theme toggle; `Top Employer Partners` wraps `"2 students · avg $30.00/hr"` awkwardly; redundant eyebrow under breadcrumbs on `/forms/ExitSurvey/results`; `Assignments.tsx:60` error message omits `@southeastern.edu`; `FormRunner` `"Saving..."` status lags.

### P2 — Tests, Lint & Repo Hygiene
- **Offline Tests (`npm --prefix Web test`):** 126 pass, 1 fail (`tests/e2e/tier2-boundary/f3-auth-adversarial.test.js:215` expects `alkadi@selu.edu` instead of `ghassan.alkadi@selu.edu`). Update auth tests once `cs@southeastern.edu` Admin + real OAuth are wired.
- **Live Tests (`npm --prefix Web run test:live`):** 109 pass, 18 fail (tests send mock ID `102` and assert mock Exit Survey fields against live GAS).
- **Linter (`npm --prefix Web run lint`):** 0 errors, 10 `oxlint` warnings (`set-state-in-effect`, `only-export-components`, `exhaustive-deps`).
- **Asset & Dead Code Cleanup:** Delete `DeanDashboard.tsx`, `DeanTaskCenter.tsx`, `.dean-*` classes, unused `axios` & `react-hook-form` deps, and ~6.4 MB of unused raster images (`Web/src/assets/RoomieFileIcon.svg` is a 1.73 MB base64 PNG inside `<svg>`, plus `Web/brand/{banner,icon}.png`, `Web/public/{logo,roomie head,favicon.jpg,Southeastern_Louisiana_University_logo}.png`). Update `README.md` / `PROJECT.md`.
