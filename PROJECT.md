# Project: RoomiesForms CS Review & Analytics Workflow Polish

## Architecture
The application is a React TypeScript SPA (`Web/`) interfacing with a live Google Apps Script web app (`https://script.google.com/macros/s/.../exec`) which writes directly to Google Sheets (`RoomiesForms_Submissions_Test`).
- **Frontend Service Layer**: `Web/src/services/api.ts` (JSON-in-text/plain POST dispatcher), `Web/src/services/googleSheetsService.ts` (audit row logger), and `Web/src/services/mockData.ts` (fallback dataset).
- **Authentication & Authorization**: `AuthContext.tsx`, `Login.tsx`, and `Layout.tsx`. Roles are strictly `Student`, `Faculty`, and `Department Head` (Computer Science). All `Dean` roles, letterheads, and workflows are stripped.
- **Review Workflows**:
  - Student: Submits forms, views assignments, edits and resubmits rejected submissions.
  - Faculty: Reviews assigned submissions (`SubmissionReview.tsx`) with dynamic decision bar (`Approve`, `Send back`).
  - Department Head: Manages task triage (`DeanTaskCenter.tsx` -> `DepartmentTaskCenter.tsx`) and views Computer Science placement analytics (`DeanDashboard.tsx` -> `DepartmentHeadDashboard.tsx`).
  - Designated Faculty: Can access Computer Science placement analytics directly from the faculty portal.
- **Repository Hygiene**: Strict `.gitignore` boundaries ensuring zero Google Apps Script files (`*.gs`), temporary scratch files, or credentials are tracked in the repository.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Repository Hygiene Hardening | Ignore `*.gs`, `appsscript.json`, `.clasp.json`, `.clasprc.json`, `temp_*` to prevent backend scripts or scratch files from being tracked | M1 | Survey R3 |
| F2 | Dean Role & Terminology Removal | Strip all 'Dean' roles, quick login badges, letterheads, navigation references, and scope strictly to CS Department Head | M1 | Survey R1, R2, R3 |
| F3 | Login & Logout Lifecycle Integrity | Ensure login and logout function seamlessly across Student, Faculty, and Department Head roles | M1 | Survey R2 |
| F4 | Designated Faculty Analytics Access | Enable designated faculty (e.g. Dr. Ghassan Alkadi) to access Computer Science placement analytics from Faculty dashboard / route | M2 | Survey R1, R2 |
| F5 | Survey Analytics Fallback & Dead Code Elimination | Add offline fallback for `getAnonymousResponses` and delete orphaned `QuickReviewDrawer.tsx` | M2 | Survey R1 |
| F6 | Review Decision Bar Activation | Fix `SubmissionReview.tsx` `isMyTurn` logic with role mapping (`Faculty Evaluator` ↔ `Faculty`) and `currentStep` synthesis so decision bar is visible | M3 | Survey R2 |
| F7 | Department Task Center Action Persistence | Connect `handleApproveNext` and `handleSendRevision` to `api.approveSubmission`, `api.rejectSubmission`, and `submitToGoogleWorkspace` | M3 | Survey R1, R2, R3 |
| F8 | Student Resubmission Response Restoration | Fix `FormView.tsx` to restore prior answers and reviewer comments when resubmitting rejected forms | M3 | Survey R2 |
| F9 | Live Google Apps Script Interaction Verification | Verify localhost communicates cleanly with the live Google Sheet backend for review decisions and form submission | M3 | Survey R3 |
| F10 | Comprehensive E2E Verification & Audit | Validate 100% pass across Student, Faculty, and Dept Head flows, verify no deans involved, and pass forensic integrity audit | M4 | Survey R1-R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Scope & Role Scoping (No Deans, CS Dept Only, Auth & Hygiene) | F1, F2, F3 | none | DONE |
| M2 | CS Analytics Access & Polish | F4, F5 | M1 | IN_PROGRESS |
| M3 | Form Review Workflows & Decision Persistence | F6, F7, F8, F9 | M1 | PLANNED |
| M4 | Final Milestone: E2E Verification, Test Suite Pass & Adversarial Hardening | F10 | M1, M2, M3 | PLANNED |

## Interface Contracts
### `Web/src/services/api.ts` ↔ Google Apps Script Backend
- `POST https://script.google.com/macros/s/.../exec?key=...`
- `Content-Type: text/plain;charset=utf-8`, `redirect: 'follow'`
- Actions: `login`, `getForms`, `getForm`, `getMyAssignments`, `getAllAssignments`, `getStudents`, `getSubmissions`, `getSubmission`, `saveDraft`, `getDraft`, `approveSubmission`, `rejectSubmission`, `getAnonymousResponses`, `getNotifications`, `markAllNotificationsRead`.
- Roles: `['Student']`, `['Faculty']`, `['Department Head']`. (No `'Dean'`).

### `Web/src/pages/SubmissionReview.tsx` ↔ `ReviewerDecisionBar`
- Props / State: `isMyTurn` must evaluate to `true` when `user.roles` matches the step's role (mapping `'Faculty Evaluator'` to `'Faculty'`, `'Department Head Authorization'` to `'Department Head'`), or when `submission.status === 'Pending'`.
- Approve Action: `api.approveSubmission(id, comments, email, roles)` + `submitToGoogleWorkspace(...)`.
- Reject Action: `api.rejectSubmission(id, feedback, email, roles)` + `submitToGoogleWorkspace(...)`.

### `Web/src/components/dashboards/FacultyDashboard.tsx` ↔ Analytics View
- Navigation link / route to `/analytics` or CS Department Outcomes view with Dr. Bonnie Achée / Dr. Ghassan Alkadi authorization.

## Code Layout
- Frontend Source: `Web/src/`
  - Components: `Web/src/components/`
    - Dashboards: `Web/src/components/dashboards/`
      - `DepartmentHeadDashboard.tsx` (formerly `DeanDashboard.tsx`)
      - `DepartmentTaskCenter.tsx` (formerly `DeanTaskCenter.tsx`)
      - `FacultyDashboard.tsx`
      - `StudentDashboard.tsx`
      - `InlineReviewPanel.tsx`
  - Pages: `Web/src/pages/`
    - `Dashboard.tsx`
    - `Login.tsx`
    - `Profile.tsx`
    - `FormView.tsx`
    - `SubmissionReview.tsx`
    - `SurveyResults.tsx`
  - Services & Utilities: `Web/src/services/`
    - `api.ts`
    - `googleSheetsService.ts`
    - `mockData.ts`
    - `mockPlacements.ts`
  - State & Context: `Web/src/context/AuthContext.tsx`
- Root Configuration:
  - `.gitignore`
  - `Web/.env`
