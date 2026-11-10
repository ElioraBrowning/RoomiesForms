# E2E Test Infra: RoomiesForms CS Review & Analytics Workflow Polish

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Tests are derived strictly from user requirements in `ORIGINAL_REQUEST.md` and feature contracts in `PROJECT.md § Feature Inventory` (F1 through F10).
- **Independent Verification**: Opaque-box testing treats the system from an external boundary perspective (HTTP contracts, rendered visible text, session state, git tracking rules, and built bundle artifacts), without coupling to internal component state.
- **Methodology**: 4-Tier Test Engineering Framework:
  - **Tier 1 (Smoke / Feature Coverage)**: ≥5 test cases per feature verifying baseline happy-path functionality.
  - **Tier 2 (Boundary & Corner Cases)**: ≥5 test cases per feature probing inputs at/outside limits, network failure modes, error recovery, and security role boundaries.
  - **Tier 3 (Cross-Feature Pairwise Interactions)**: Pairwise integration tests covering multi-feature combinations (e.g. auth lifecycle with review workflows, student resubmission with faculty rejections, task center triage with live sheet persistence).
  - **Tier 4 (Real-World Application Scenarios)**: End-to-end full user journeys simulating real academic semester lifecycles across Student, Faculty, and Department Head roles.
- **Dual Execution Modes**:
  - **Offline / Contract Mode (`--offline` or default)**: Lightning-fast (<2s) deterministic verification of logic, API contracts, session states, and artifact hygiene.
  - **Live Mode (`--live`)**: Direct integration verification against the live Google Apps Script endpoint (`https://script.google.com/macros/s/.../exec`).

---

## Feature Inventory & Coverage Mapping

| # | Feature | Requirement Source | Tier 1 (Count) | Tier 2 (Count) | Tier 3 (Pairwise) |
|---|---------|-------------------|:--------------:|:--------------:|:-----------------:|
| F1 | Repository Hygiene Hardening | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ (F1xF2, F1xF5, F1xF9) |
| F2 | Dean Role & Terminology Removal | ORIGINAL_REQUEST §R1, §R2 | 5 | 5 | ✓ (F2xF3, F2xF4, F2xF6) |
| F3 | Login & Logout Lifecycle Integrity | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ (F3xF4, F3xF5, F3xF10) |
| F4 | Designated Faculty Analytics Access | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ (F4xF5, F4xF6) |
| F5 | Survey Analytics Fallback & Dead Code Elimination | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ (F5xF3, F5xF4) |
| F6 | Review Decision Bar Activation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ (F6xF7, F6xF8) |
| F7 | Department Task Center Action Persistence | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ (F7xF8, F7xF9) |
| F8 | Student Resubmission Response Restoration | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ (F8xF6, F8xF9) |
| F9 | Live Google Apps Script Interaction Verification | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ (F9xF1, F9xF7) |
| F10 | Comprehensive E2E Verification & Forensic Audit | ORIGINAL_REQUEST §R1-R3 | 5 | 5 | ✓ (F10xF2, F10xF3) |
| **Total** | **10 Features** | | **50** | **50** | **14 Pairwise** |

---

## Test Architecture

### 1. Test Engine & Runner
- **Engine**: Native Node.js Test Runner (`node:test` + `node:assert/strict`) supported natively by Node.js v24.13.0.
- **Zero External Dependencies**: Executes instantly on Windows PowerShell without requiring external test runner dependencies.
- **Runner Entry Point**: `tests/e2e/runner.js`
- **Invocation Commands**:
  - Full Test Suite: `node tests/e2e/runner.js` (or `npm --prefix Web test`)
  - Run Specific Tier: `node tests/e2e/runner.js --tier=1` (or `--tier=2`, `--tier=3`, `--tier=4`)
  - Run Specific Feature: `node tests/e2e/runner.js --feature=F2`
  - Run Live Integration: `node tests/e2e/runner.js --live`
  - Native Node Test Run: `node --test tests/e2e/**/*.test.js`
- **Pass/Fail Semantics**:
  - All test assertions must pass strictly.
  - Process exits with code `0` on 100% pass, non-zero code on any failure.

### 2. Directory Layout
```
RoomiesForms/
├── TEST_INFRA.md                             # Global test infrastructure and feature catalog
├── TEST_READY.md                            # Published when test suite is fully functional & passing
├── tests/
│   └── e2e/
│       ├── runner.js                         # Unified CLI test runner with filtering and summary reporting
│       ├── helpers/
│       │   ├── api-client.js                 # HTTP transport client (live GAS & mock endpoints)
│       │   ├── auth-simulator.js             # Session token & localStorage state simulator
│       │   ├── bundle-scanner.js             # Built asset and source code inspection helper
│       │   ├── git-inspector.js              # Repository hygiene and git tracking auditor
│       │   └── test-fixtures.js              # Mock submissions, forms, users, and audit records
│       ├── tier1-features/
│       │   ├── f1-repository-hygiene.test.js
│       │   ├── f2-dean-removal.test.js
│       │   ├── f3-auth-lifecycle.test.js
│       │   ├── f4-analytics-access.test.js
│       │   ├── f5-survey-fallback.test.js
│       │   ├── f6-decision-bar.test.js
│       │   ├── f7-task-center.test.js
│       │   ├── f8-resubmission.test.js
│       │   ├── f9-live-gas.test.js
│       │   └── f10-e2e-audit.test.js
│       ├── tier2-boundary/
│       │   ├── f1-hygiene-boundary.test.js
│       │   ├── f2-role-boundary.test.js
│       │   ├── f3-auth-boundary.test.js
│       │   ├── f4-analytics-boundary.test.js
│       │   ├── f5-fallback-boundary.test.js
│       │   ├── f6-decision-bar-boundary.test.js
│       │   ├── f7-task-center-boundary.test.js
│       │   ├── f8-resubmission-boundary.test.js
│       │   ├── f9-gas-network-boundary.test.js
│       │   └── f10-audit-boundary.test.js
│       ├── tier3-integration/
│       │   ├── auth-and-review-roles.test.js
│       │   ├── form-submission-persistence.test.js
│       │   ├── faculty-rejection-student-restoration.test.js
│       │   ├── dept-head-task-center-sheets-sync.test.js
│       │   └── gas-security-and-hygiene.test.js
│       └── tier4-scenarios/
│           ├── student-internship-lifecycle.test.js
│           ├── faculty-evaluation-outcomes.test.js
│           ├── dept-head-governance-triage.test.js
│           ├── adversarial-role-enforcement.test.js
│           └── network-resilience-offline-degradation.test.js
```

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Complexity | Description |
|---|----------|--------------------|------------|-------------|
| 1 | Student CS 401 Internship Lifecycle | F3, F6, F7, F8, F9, F10 | High | Full lifecycle: Student applies -> Faculty requests revision -> Student sees prior answers & remarks -> Resubmits -> Faculty approves -> Dept Head authorizes -> Synced to Google Sheets. |
| 2 | Faculty Evaluation & CS Placement Outcomes Analytics | F2, F3, F4, F5 | Medium | Designated faculty logs in, accesses review queue, opens CS Placement Analytics view, searches student directory, examines wage/employer metrics, and views anonymous exit survey results. |
| 3 | Department Head Task Triage & Governance Workflow | F2, F3, F7, F9, F10 | High | Department Head triage: views task center queue, approves multiple pending candidate submissions, triggers undo window, persists actions to backend and Google Sheets audit logger. |
| 4 | Adversarial Role Enforcement & Client Storage Tampering | F1, F2, F3, F4, F10 | High | Security stress test: adversary injects 'Dean' role or tampered JWT into storage; system denies reviewer routes, sanitizes roles, blocks privilege escalation, and preserves clean git index. |
| 5 | Network Outage & Seamless Offline Graceful Degradation | F3, F5, F7, F9 | Medium | Resilience stress test: live Google Apps Script endpoint is cut off or returns 503/502; all UI flows fall back cleanly to local mock datasets with non-fatal user banners. |

---

## Coverage Thresholds & Quality Gates
- **Tier 1**: ≥5 per feature (50 test cases total across F1–F10)
- **Tier 2**: ≥5 per feature (50 test cases total across F1–F10)
- **Tier 3**: ≥10 cross-feature pairwise interaction test cases
- **Tier 4**: ≥5 realistic end-to-end application scenarios
- **Total Suite Minimum**: ≥115 test cases
- **Quality Gate**: 100% test cases pass with exit code `0` before publishing `TEST_READY.md`.

---

## Remediation & Hardening History (Iteration 2)

Following independent forensic reviews and adversarial stress tests by Reviewers 1 & 2, Challengers 1 & 2, and Auditor 1, the test suite was hardened with the following remediations:
1. **Runner Guardrails (`tests/e2e/runner.js`)**:
   - Empty filter matches (`--feature`, `--tier`) now throw an error and exit with code `1`.
   - Invalid tiers (e.g. `--tier=5`) are strictly validated against `[1, 2, 3, 4]` and exit with code `1`.
2. **Dynamic In-Memory Transport Simulator (`tests/e2e/helpers/api-client.js`)**:
   - `mockAppsScriptDispatcher` dynamically registers newly submitted forms into `dynamicSubmissions`.
   - Multi-step approval workflows (`submitForm` -> `getSubmission` -> `rejectSubmission` -> `approveSubmission`) transition genuine state machine records across steps.
   - `postGoogleSheetsAudit` aligns directly with `submitToGoogleWorkspace` in `Web/src/services/googleSheetsService.ts` (sending normalized payload without redundant `action` wrapper in live mode, returning `{ ok: true }`).
3. **Forensic Scanner & Git Inspector Hardening**:
   - `bundle-scanner.js`: Updated `auditDeanReferences` regex to `/(?:^|[^a-zA-Z0-9])dean(?:$|[^a-zA-Z0-9])|selu_dean|Dean[A-Z]/i`, capturing snake_case, compound, and PascalCase tokens.
   - `git-inspector.js`: Fixed `checkIgnore` so batch array checks evaluate each file individually, reporting `allIgnored` and individual results.
4. **Elimination of Facades & Tautological Assertions**:
   - **Tier 4 Scenarios**: Replaced in-memory object property mutations (`mockSub.status = ...`) with assertions on real `postAppsScript` and `postGoogleSheetsAudit` return payloads.
   - **Tier 2 Boundary Tests**: Refactored `f9-gas-network-boundary.test.js` to execute real network requests against an ephemeral Node `http.createServer`, testing genuine 403, 502 HTML redirect, 503 timeout aborts, and >50KB payload transfers. Refactored `f6`, `f7`, `f8`, and `f10` boundary tests to assert directly against application source code and exported modules (`feedback.ts`, `SubmissionReview.tsx`, `DepartmentTaskCenter.tsx`, `AuthContext.tsx`).
   - **Tier 1 Feature Tests**: Replaced mock simulator self-certification in `f6-decision-bar.test.js`, `f7-task-center.test.js`, and `f8-resubmission.test.js` with direct source contract assertions against `SubmissionReview.tsx`, `DepartmentTaskCenter.tsx`, and `FormView.tsx`.
5. **Expected Test Baseline Under Development Mode**:
   - 119 tests pass cleanly across Tiers 1–4.
   - 8 tests fail legitimately as authentic detectors of pending Milestone M2 and M3 code:
     - `TC-E2E-F4-01` (Faculty dashboard analytics button display - M2)
     - `TC-E2E-F4-02` (Analytics route registration in `App.tsx` - M2)
     - `TC-E2E-F5-05` (Orphaned dead code deletion of `QuickReviewDrawer.tsx` - M2)
     - `TC-T1-F6-01` (Role equivalence mapping for Faculty Evaluator in `SubmissionReview.tsx` - M3)
     - `TC-T1-F6-02` (Role equivalence mapping for Dept Head Authorization in `SubmissionReview.tsx` - M3)
     - `TC-T1-F7-01` (Backend approval & sheets persistence in `DepartmentTaskCenter.tsx` - M3)
     - `TC-T1-F7-02` (Backend rejection & sheets persistence in `DepartmentTaskCenter.tsx` - M3)
     - `TC-T1-F8-01` (Rejected submission response restoration in `FormView.tsx` - M3)
