/**
 * tests/e2e/tier2-boundary/f10-audit-boundary.test.js
 *
 * Tier 2: Feature F10 - E2E Audit Boundary & Edge Cases
 * Verifies unauthorized role access to review routes, role sanitization on session init,
 * rejection lifecycle loop, corrupted storage resilience, and zero scratch leakage.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AuthSession,
  createStorage,
  evaluateIsMyTurn,
} from '../helpers/auth-simulator.js';
import { readFile } from '../helpers/bundle-scanner.js';
import { postAppsScript } from '../helpers/api-client.js';
import { getTrackedFiles } from '../helpers/git-inspector.js';
import { FIXTURE_SUBMISSIONS, FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Feature F10 (Tier 2): E2E Audit Boundary & Edge Cases', () => {
  it('TC-T2-F10-01: Unauthorized Role Access to Review Route', () => {
    const student = FIXTURE_USERS.studentEliora;
    const sub102 = FIXTURE_SUBMISSIONS.find((s) => s.id === 102);

    // If a student navigates to a pending submission review URL
    const isMyTurn = evaluateIsMyTurn(student, sub102);
    assert.strictEqual(
      isMyTurn,
      false,
      'Decision bar must be completely hidden for student role'
    );
  });

  it('TC-T2-F10-02: Dean Role Stripping on Login Context Initialization', () => {
    const authContent = readFile('Web/src/context/AuthContext.tsx');
    assert.ok(authContent, 'AuthContext.tsx must exist');
    assert.match(
      authContent,
      /filter\(\(r\).*r !== 'Dean'\)/,
      "AuthContext.tsx must explicitly filter out 'Dean' role in sanitizeRoles"
    );
  });

  it('TC-T2-F10-03: Rejection Lifecycle Loop (Submit -> Reject -> Resubmit -> Approve)', async () => {
    // Step 1: Submit
    const sub1 = await postAppsScript('submitForm', {
      id: 701,
      formId: 'CS401',
      studentEmail: 'marcus.vance@selu.edu',
    });
    assert.strictEqual(sub1.ok, true);
    assert.strictEqual(sub1.data.status, 'Pending');

    // Step 2: Reject
    const rej = await postAppsScript('rejectSubmission', {
      id: 701,
      feedback: 'Incomplete information',
      userEmail: 'galkadi@selu.edu',
    });
    assert.strictEqual(rej.ok, true);
    assert.strictEqual(rej.data.status, 'Rejected');

    // Step 3: Resubmit
    const resub = await postAppsScript('submitForm', {
      id: 701,
      formId: 'CS401',
      summary: 'Resubmitted with corrections',
    });
    assert.strictEqual(resub.ok, true);
    assert.strictEqual(resub.data.status, 'Pending');

    // Step 4: Approve
    const app = await postAppsScript('approveSubmission', {
      id: 701,
      comments: 'Approved',
      userEmail: 'galkadi@selu.edu',
    });
    assert.strictEqual(app.ok, true);
    assert.strictEqual(app.data.status, 'Approved');
  });

  it('TC-T2-F10-04: Corrupted LocalStorage Session Recovery', () => {
    const storage = createStorage({
      user: 'undefined', // Common bug when storing undefined value
      token: 'jwt-123',
    });

    const session = new AuthSession(storage);
    assert.strictEqual(session.isAuthenticated(), false);
    assert.strictEqual(session.user, null);
  });

  it('TC-T2-F10-05: Zero Leakage of Scratch Files in Repository', () => {
    const trackedBackendFiles = getTrackedFiles(/\.gs$|appsscript|\.clasp|temp_/i);
    assert.strictEqual(
      trackedBackendFiles.length,
      0,
      'No temporary or backend files should be tracked'
    );
  });
});
