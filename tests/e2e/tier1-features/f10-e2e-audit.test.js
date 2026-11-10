/**
 * tests/e2e/tier1-features/f10-e2e-audit.test.js
 *
 * Tier 1: Feature F10 - Comprehensive E2E Verification & Audit
 * Verifies end-to-end multi-role review workflows, strict exclusion of all Dean roles,
 * Computer Science scoping, authentication lifecycle, and forensic repository cleanliness.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';
import {
  AuthSession,
  createStorage,
  isReviewer,
  REVIEWER_ROLES,
} from '../helpers/auth-simulator.js';
import { readFile } from '../helpers/bundle-scanner.js';
import { getTrackedFiles } from '../helpers/git-inspector.js';
import {
  FIXTURE_FORMS,
  FIXTURE_PLACEMENTS,
  FIXTURE_SUBMISSIONS,
  FIXTURE_USERS,
} from '../helpers/test-fixtures.js';

describe('Feature F10 (Tier 1): Comprehensive E2E Verification & Audit', () => {
  it('TC-T1-F10-01: End-to-End Multi-Role Approval Flow (Student -> Faculty -> Dept Head)', async () => {
    // 1. Initial Student submission via API
    const subRes = await postAppsScript('submitForm', {
      id: 501,
      formId: 'CS401',
      studentEmail: 'marcus.vance@selu.edu',
    });
    assert.strictEqual(subRes.ok, true);
    assert.strictEqual(subRes.data.status, 'Pending');

    // 2. Faculty Evaluator approves Step 1
    const app1 = await postAppsScript('approveSubmission', {
      id: 501,
      comments: 'Approved by Dr. Alkadi',
      userEmail: 'galkadi@selu.edu',
      roles: ['Faculty'],
    });
    assert.strictEqual(app1.ok, true);
    assert.strictEqual(app1.data.status, 'Approved');

    // 3. Department Head authorizes Step 2
    const app2 = await postAppsScript('approveSubmission', {
      id: 501,
      comments: 'Approved by Dr. Bonnie Achée',
      userEmail: 'bonnie.achee@southeastern.edu',
      roles: ['Department Head'],
    });
    assert.strictEqual(app2.ok, true);
    assert.strictEqual(app2.data.status, 'Approved');

    const finalSub = await postAppsScript('getSubmission', { id: 501 });
    assert.strictEqual(finalSub.ok, true);
    assert.strictEqual(finalSub.data.approvals.every((a) => a.status === 'Approved'), true);
  });

  it('TC-T1-F10-02: Strict "No Deans" UI & Letterhead Audit', () => {
    // Audit active roles in AuthContext & Layout
    assert.deepStrictEqual(
      REVIEWER_ROLES,
      ['Faculty', 'Department Head'],
      "REVIEWER_ROLES must not contain 'Dean'"
    );

    // Audit Dr. Bonnie Achée role
    assert.deepStrictEqual(
      FIXTURE_USERS.deptHeadBonnie.roles,
      ['Department Head'],
      "Dr. Bonnie Achée must strictly have 'Department Head' role"
    );

    // Verify Login.tsx does not display Dean quick login button
    const loginContent = readFile('Web/src/pages/Login.tsx');
    assert.doesNotMatch(
      loginContent,
      /<span className="login-quick-role">Dean<\/span>/i,
      'Login.tsx must not contain Dean quick button'
    );
  });

  it('TC-T1-F10-03: CS Department Scope Enforcement', () => {
    // All forms must belong to Computer Science
    for (const form of FIXTURE_FORMS) {
      assert.strictEqual(
        form.department,
        'Computer Science',
        `Form ${form.title} must be scoped to Computer Science`
      );
    }

    // All fixture users must belong to Computer Science
    for (const user of Object.values(FIXTURE_USERS)) {
      assert.strictEqual(
        user.department,
        'Computer Science',
        `User ${user.fullName} must be scoped to Computer Science`
      );
    }
  });

  it('TC-T1-F10-04: Login and Logout Lifecycle Verification', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    // Student
    session.login('cade.sholar@selu.edu');
    assert.strictEqual(session.user.fullName, 'Cade Sholar');
    session.logout();
    assert.strictEqual(session.isAuthenticated(), false);

    // Faculty
    session.login('galkadi@selu.edu');
    assert.strictEqual(session.user.fullName, 'Dr. Ghassan Alkadi');
    session.logout();
    assert.strictEqual(session.isAuthenticated(), false);

    // Department Head
    session.login('bonnie.achee@southeastern.edu');
    assert.strictEqual(session.user.fullName, 'Dr. Bonnie Achée');
    session.logout();
    assert.strictEqual(session.isAuthenticated(), false);
  });

  it('TC-T1-F10-05: Forensic Repository Hygiene Verification', () => {
    const trackedBackendFiles = getTrackedFiles(/\.gs$|appsscript|\.clasp|temp_/i);
    assert.strictEqual(
      trackedBackendFiles.length,
      0,
      `Git index must not track any backend scripts or scratch files. Found: ${trackedBackendFiles.join(', ')}`
    );
  });
});
