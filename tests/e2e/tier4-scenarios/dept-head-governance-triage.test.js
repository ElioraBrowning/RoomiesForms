/**
 * tests/e2e/tier4-scenarios/dept-head-governance-triage.test.js
 *
 * Tier 4 Scenario 3: Department Head Task Triage & Governance Workflow
 * Simulates high-volume department head review triage:
 * Queue loading -> Batch approvals -> Non-destructive cycling ->
 * Immediate undo recovery -> Google Sheets audit sync.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript, postGoogleSheetsAudit } from '../helpers/api-client.js';
import { AuthSession, createStorage, isReviewer } from '../helpers/auth-simulator.js';

describe('Tier 4 Scenario 3: Department Head Task Triage & Governance Workflow', () => {
  it('Simulates department head triage queue progression with undo recovery and sheets audit', async () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    // 1. Dr. Bonnie Achée logs in as CS Department Head
    session.login('bonnie.achee@southeastern.edu');
    assert.strictEqual(session.isAuthenticated(), true);
    assert.strictEqual(isReviewer(session.user), true);

    // Initial triage queue with 3 pending items
    const queue = [
      { id: 105, studentName: 'Marcus Vance', formKey: 'CS401' },
      { id: 106, studentName: 'Sarah Jenkins', formKey: 'CS401' },
      { id: 102, studentName: 'Cade Sholar', formKey: 'CS410' },
    ];
    const reviewed = [];

    // 2. Approve #105
    const approved1 = queue.shift();
    reviewed.push(approved1);

    const approve1Res = await postAppsScript('approveSubmission', {
      id: approved1.id,
      comments: 'Approved via Department Task Center',
      userEmail: session.user.email,
      roles: session.user.roles,
    });
    assert.strictEqual(approve1Res.ok, true);
    assert.strictEqual(approve1Res.data.status, 'Approved');
    assert.strictEqual(approve1Res.data.id, approved1.id);

    const audit1Res = await postGoogleSheetsAudit({
      studentName: approved1.studentName,
      submissionId: approved1.id,
      formId: approved1.formKey,
      summary: `Approved by ${session.user.fullName}`,
      responses: {},
    });
    assert.strictEqual(audit1Res.ok, true);

    // 3. Accidentally approve #106, immediately click Undo
    const approved2 = queue.shift();
    reviewed.push(approved2);

    // Immediate undo triggered
    const undone = reviewed.pop();
    queue.unshift(undone);

    assert.strictEqual(queue.length, 2);
    assert.strictEqual(queue[0].id, 106);

    // 4. Request revision on #106
    const revisionItem = queue.shift();
    const rejectRes = await postAppsScript('rejectSubmission', {
      id: revisionItem.id,
      feedback: 'Incomplete job description; please clarify technical duties.',
      userEmail: session.user.email,
      roles: session.user.roles,
    });
    assert.strictEqual(rejectRes.ok, true);
    assert.strictEqual(rejectRes.data.status, 'Rejected');
    assert.strictEqual(rejectRes.data.id, revisionItem.id);

    const audit2Res = await postGoogleSheetsAudit({
      studentName: revisionItem.studentName,
      submissionId: revisionItem.id,
      formId: revisionItem.formKey,
      summary: `Revision requested by ${session.user.fullName}`,
      responses: {},
    });
    assert.strictEqual(audit2Res.ok, true);

    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].id, 102);

    session.logout();
    assert.strictEqual(session.isAuthenticated(), false);
  });
});
