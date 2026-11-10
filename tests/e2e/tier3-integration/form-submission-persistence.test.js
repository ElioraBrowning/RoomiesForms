/**
 * tests/e2e/tier3-integration/form-submission-persistence.test.js
 *
 * Tier 3: Pairwise Integration - Form Submission & Sheets Persistence (F3 x F9, F7 x F9)
 * Verifies that form submissions and review actions dispatched through the service layer
 * cleanly persist to Google Sheets audit logging.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript, postGoogleSheetsAudit } from '../helpers/api-client.js';
import { FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Tier 3: Form Submission x Sheets Persistence Integration', () => {
  it('TC-E2E-T3-04: Student form submission persists payload with text/plain POST', async () => {
    const student = FIXTURE_USERS.studentCade;
    const submissionPayload = {
      formId: 'CS401',
      studentName: student.fullName,
      studentEmail: student.email,
      responses: {
        employerName: 'DXC Technology',
        jobTitle: 'Full Stack Software Engineer Intern',
        hourlyWage: 29.5,
        hoursPerWeek: 20,
      },
    };

    // 1. Submit form via Apps Script endpoint
    const submitRes = await postAppsScript('submitForm', submissionPayload);
    assert.strictEqual(submitRes.ok, true);
    assert.ok(submitRes.data?.id);

    // 2. Submit audit entry to Google Sheets
    const auditRes = await postGoogleSheetsAudit({
      studentName: student.fullName,
      studentEmail: student.email,
      submissionId: submitRes.data.id,
      formId: 'CS401',
      summary: 'New Submission: CS 401 Internship Application',
      responses: submissionPayload.responses,
    });
    assert.strictEqual(auditRes.ok, true);
  });

  it('TC-E2E-T3-05: Department Head approval persists action to backend API and Google Sheets audit', async () => {
    const deptHead = FIXTURE_USERS.deptHeadBonnie;
    const submissionId = 105;

    // 1. Persist approval action to API
    const approvalRes = await postAppsScript('approveSubmission', {
      id: submissionId,
      comments: 'Approved for CMPS 400 enrollment.',
      userEmail: deptHead.email,
      roles: deptHead.roles,
    });
    assert.strictEqual(approvalRes.ok, true);
    assert.strictEqual(approvalRes.data.status, 'Approved');

    // 2. Persist audit row to Google Sheets
    const auditRes = await postGoogleSheetsAudit({
      studentName: 'Marcus Vance',
      studentEmail: 'marcus.vance@selu.edu',
      submissionId,
      formId: 'CS401',
      summary: `Approved (Department Head Authorization) by ${deptHead.fullName}`,
      responses: {},
    });
    assert.strictEqual(auditRes.ok, true);
  });
});
