/**
 * tests/e2e/tier4-scenarios/student-internship-lifecycle.test.js
 *
 * Tier 4 Scenario 1: Full CS 401 Internship Lifecycle
 * Simulates real academic user journey:
 * Student applies -> Faculty requests revision -> Student restores responses ->
 * Student resubmits -> Faculty approves -> Dept Head authorizes -> Synced to Google Sheets.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript, postGoogleSheetsAudit } from '../helpers/api-client.js';
import { AuthSession, createStorage, evaluateIsMyTurn } from '../helpers/auth-simulator.js';
import { FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Tier 4 Scenario 1: Student CS 401 Internship Lifecycle', () => {
  it('Executes complete multi-actor internship lifecycle from application to final departmental authorization', async () => {
    // -------------------------------------------------------------
    // Phase 1: Student (Marcus Vance) applies for CS 401
    // -------------------------------------------------------------
    const studentStorage = createStorage();
    const studentSession = new AuthSession(studentStorage);
    studentSession.login('marcus.vance@selu.edu');
    assert.strictEqual(studentSession.isAuthenticated(), true);

    const initialResponses = {
      studentName: 'Marcus Vance',
      wNumber: 'W0798765',
      employerName: 'Acme Software',
      jobTitle: 'Software Intern',
      hourlyWage: 22.0,
      dutiesDescription: 'General bug fixes',
      hoursPerWeek: 15,
    };

    const submitRes = await postAppsScript('submitForm', {
      formId: 'CS401',
      studentEmail: studentSession.user.email,
      responses: initialResponses,
    });
    assert.strictEqual(submitRes.ok, true);
    const submissionId = submitRes.data.id;

    // Google Sheets logs initial submission
    const auditRes1 = await postGoogleSheetsAudit({
      studentName: studentSession.user.fullName,
      studentEmail: studentSession.user.email,
      submissionId,
      formId: 'CS401',
      summary: 'Initial Submission: CS 401 Internship Application',
      responses: initialResponses,
    });
    assert.strictEqual(auditRes1.ok, true);

    studentSession.logout();

    // -------------------------------------------------------------
    // Phase 2: Faculty Evaluator (Dr. Alkadi) reviews and requests changes
    // -------------------------------------------------------------
    const facultyStorage = createStorage();
    const facultySession = new AuthSession(facultyStorage);
    facultySession.login('galkadi@selu.edu');
    assert.strictEqual(facultySession.isAuthenticated(), true);

    const getRes1 = await postAppsScript('getSubmission', { id: submissionId });
    assert.strictEqual(getRes1.ok, true);
    const subAfterSubmit = getRes1.data;
    assert.strictEqual(subAfterSubmit.status, 'Pending');
    assert.strictEqual(evaluateIsMyTurn(facultySession.user, subAfterSubmit), true);

    // Dr. Alkadi flags hoursPerWeek
    const feedback = '[Changes Needed] Expected Hours per Week: Minimum 20 hours per week required for CS 401 credit.';
    const rejectRes = await postAppsScript('rejectSubmission', {
      id: submissionId,
      feedback,
      userEmail: facultySession.user.email,
      roles: facultySession.user.roles,
    });
    assert.strictEqual(rejectRes.ok, true);
    assert.strictEqual(rejectRes.data.status, 'Rejected');
    facultySession.logout();

    // -------------------------------------------------------------
    // Phase 3: Student reopens form, answers are restored, updates hours, and resubmits
    // -------------------------------------------------------------
    studentSession.login('marcus.vance@selu.edu');
    const getRes2 = await postAppsScript('getSubmission', { id: submissionId });
    assert.strictEqual(getRes2.ok, true);
    assert.strictEqual(getRes2.data.status, 'Rejected');
    const restoredAnswers = { ...getRes2.data.responses };
    assert.strictEqual(restoredAnswers.employerName, 'Acme Software');

    // Marcus updates hoursPerWeek to 20
    restoredAnswers.hoursPerWeek = 20;

    const resubmitRes = await postAppsScript('submitForm', {
      formId: 'CS401',
      submissionId,
      summary: 'Resubmission after changes requested',
      responses: restoredAnswers,
    });
    assert.strictEqual(resubmitRes.ok, true);
    assert.strictEqual(resubmitRes.data.status, 'Pending');
    studentSession.logout();

    // -------------------------------------------------------------
    // Phase 4: Faculty approves resubmission
    // -------------------------------------------------------------
    facultySession.login('galkadi@selu.edu');
    const getRes3 = await postAppsScript('getSubmission', { id: submissionId });
    assert.strictEqual(getRes3.ok, true);
    assert.strictEqual(getRes3.data.status, 'Pending');
    assert.strictEqual(getRes3.data.responses.hoursPerWeek, 20);

    const approve1Res = await postAppsScript('approveSubmission', {
      id: submissionId,
      comments: 'Hours verified with employer; approved for Step 2.',
      userEmail: facultySession.user.email,
      roles: facultySession.user.roles,
    });
    assert.strictEqual(approve1Res.ok, true);
    assert.strictEqual(approve1Res.data.status, 'Approved');
    facultySession.logout();

    // -------------------------------------------------------------
    // Phase 5: Department Head (Dr. Bonnie Achée) authorizes final approval
    // -------------------------------------------------------------
    const deptHeadStorage = createStorage();
    const deptHeadSession = new AuthSession(deptHeadStorage);
    deptHeadSession.login('bonnie.achee@southeastern.edu');
    assert.strictEqual(deptHeadSession.isAuthenticated(), true);

    const approve2Res = await postAppsScript('approveSubmission', {
      id: submissionId,
      comments: 'Authorized for CMPS 400 enrollment.',
      userEmail: deptHeadSession.user.email,
      roles: deptHeadSession.user.roles,
    });
    assert.strictEqual(approve2Res.ok, true);
    assert.strictEqual(approve2Res.data.status, 'Approved');

    const auditRes2 = await postGoogleSheetsAudit({
      studentName: 'Marcus Vance',
      studentEmail: 'marcus.vance@selu.edu',
      submissionId,
      formId: 'CS401',
      summary: 'Approved (Department Head Authorization) by Dr. Bonnie Achée',
      responses: restoredAnswers,
    });
    assert.strictEqual(auditRes2.ok, true);

    const finalSubRes = await postAppsScript('getSubmission', { id: submissionId });
    assert.strictEqual(finalSubRes.ok, true);
    assert.strictEqual(finalSubRes.data.status, 'Approved');
    assert.strictEqual(finalSubRes.data.approvals.every((a) => a.status === 'Approved'), true);
  });
});
