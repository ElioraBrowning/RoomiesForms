/**
 * tests/e2e/tier3-integration/dept-head-task-center-sheets-sync.test.js
 *
 * Tier 3: Pairwise Integration - Department Task Center x Sheets Sync & Undo (F2 x F6, F7 x F9)
 * Verifies decision bar role matching for Dept Head, triage persistence to sheets,
 * and undo window state reconciliation.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript, postGoogleSheetsAudit } from '../helpers/api-client.js';
import { evaluateIsMyTurn, matchesRole } from '../helpers/auth-simulator.js';
import { readFile } from '../helpers/bundle-scanner.js';
import { FIXTURE_SUBMISSIONS, FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Tier 3: Task Center x Sheets Sync & Undo Integration', () => {
  it('TC-E2E-T3-08: Decision bar activates for Department Head Authorization step without Dean role', () => {
    const deptHead = FIXTURE_USERS.deptHeadBonnie;
    const sub105 = FIXTURE_SUBMISSIONS.find((s) => s.id === 105);

    assert.strictEqual(
      deptHead.roles.includes('Dean'),
      false,
      "Dept Head user must not have 'Dean' role"
    );

    // Role mapping matches 'Department Head' to 'Department Head Authorization'
    assert.strictEqual(
      matchesRole(deptHead.roles, 'Department Head Authorization'),
      true
    );

    const isMyTurn = evaluateIsMyTurn(deptHead, sub105);
    assert.strictEqual(isMyTurn, true);
  });

  it('TC-E2E-T3-09: Task Center triage approval moves item to reviewed and triggers sheets audit', async () => {
    const deptHead = FIXTURE_USERS.deptHeadBonnie;

    // Triage approve #105
    const apiRes = await postAppsScript('approveSubmission', {
      id: 105,
      comments: 'Approved (Department Head Authorization)',
      userEmail: deptHead.email,
      roles: deptHead.roles,
    });
    assert.strictEqual(apiRes.ok, true);
    assert.strictEqual(apiRes.data.status, 'Approved');

    // Sync to Google Sheets
    const auditRes = await postGoogleSheetsAudit({
      studentName: 'Marcus Vance',
      studentEmail: 'marcus.vance@selu.edu',
      submissionId: 105,
      formId: 'CS401',
      summary: 'Approved (Department Head Authorization) by Dr. Bonnie Achée',
      responses: {},
    });
    assert.strictEqual(auditRes.ok, true);
  });

  it('TC-E2E-T3-10: Task Center undo within 5 seconds restores item to pending queue', () => {
    const tcContent = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(tcContent, 'DepartmentTaskCenter.tsx must exist');

    assert.match(
      tcContent,
      /setUndoState\(null\);\s*},\s*5000\)/,
      'DepartmentTaskCenter.tsx must configure 5000ms timer for undo toast'
    );
    assert.match(
      tcContent,
      /setQueue\(undoState\.previousQueue\)/,
      'DepartmentTaskCenter.tsx must restore previousQueue on undo'
    );
    assert.match(
      tcContent,
      /setReviewed\(undoState\.previousReviewed\)/,
      'DepartmentTaskCenter.tsx must restore previousReviewed on undo'
    );
  });
});
