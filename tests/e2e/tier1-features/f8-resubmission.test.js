/**
 * tests/e2e/tier1-features/f8-resubmission.test.js
 *
 * Tier 1: Feature F8 - Student Resubmission Response Restoration
 * Verifies that when a student opens a rejected form, prior responses and
 * reviewer feedback from audit logs are accurately restored, parsed by question,
 * and updated upon resubmission.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript, postGoogleSheetsAudit } from '../helpers/api-client.js';
import { readFile } from '../helpers/bundle-scanner.js';
import { FIXTURE_FORMS, FIXTURE_SUBMISSIONS } from '../helpers/test-fixtures.js';
import { latestSentBack, sentBackLine } from '../../../Web/src/forms/feedback.ts';

describe('Feature F8 (Tier 1): Student Resubmission Response Restoration', () => {
  it('TC-T1-F8-01: Rejected Form Detection & Prior Answers Restoration in FormView', () => {
    const formViewContent = readFile('Web/src/pages/FormView.tsx');
    assert.ok(formViewContent, 'FormView.tsx must exist');

    // FormView.tsx must search /submissions for prior rejected submission to restore answers
    assert.match(
      formViewContent,
      /(?:subsRes\.value\.data\.find\([^)]*status === 'Rejected'|s\.status === 'Rejected' && s\.formId)/,
      "FormView.tsx must search /submissions for rejected submissions to restore prior answers (Feature F8)"
    );
  });

  it('TC-T1-F8-02: Reviewer Feedback Alert Banner Parsing via feedback.ts', () => {
    const rejectedSub = FIXTURE_SUBMISSIONS.find((s) => s.id === 103);
    const rejectionLog = rejectedSub.auditLogs.find((l) => l.action === 'Rejected');

    assert.ok(rejectionLog, 'Rejection audit log must exist');
    assert.match(rejectionLog.comments, /\[Changes Needed\]/);

    const questions = FIXTURE_FORMS.find((f) => f.formKey === 'CS420').pages[0].questions;
    const parsed = latestSentBack(rejectedSub.auditLogs, questions);

    assert.ok(parsed, 'latestSentBack must return parsed SentBack object');
    assert.match(parsed.general, /Please refine the architecture details and resubmit/);
    assert.strictEqual(parsed.by, 'Dr. Ghassan Alkadi');

    const bannerText = sentBackLine(parsed);
    assert.match(bannerText, /Changes requested by Dr\. Ghassan Alkadi/);
  });

  it('TC-T1-F8-03: Question-Specific Feedback Highlighting via feedback.ts', () => {
    const questions = [
      { id: 'serverSpecs', label: 'Server & Hosting Specifications' },
      { id: 'projectTitle', label: 'Project Title' },
    ];
    const rawComments = `[Changes Needed] Server & Hosting Specifications: Please specify exact server specifications and hosting architecture.\nGeneral remarks: Please refine.`;

    const logs = [
      {
        id: 1,
        action: 'Rejected',
        comments: rawComments,
        actionTimestamp: '2026-11-09T10:00:00Z',
        reviewer: { fullName: 'Dr. Ghassan Alkadi' },
      },
    ];

    const parsed = latestSentBack(logs, questions);
    assert.ok(parsed);
    assert.strictEqual(
      parsed.byQuestion.serverSpecs,
      'Please specify exact server specifications and hosting architecture.'
    );
    assert.strictEqual(parsed.byQuestion.projectTitle, undefined);
  });

  it('TC-T1-F8-04: Edit and Resubmit Navigation Target from Submission Review View', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');

    // Student view of rejected submission must provide link to edit and resubmit form
    assert.match(
      content,
      /(?:to=\{`\/forms\/\${|to="\/forms\/|Edit and resubmit|edit-resubmit)/i,
      'SubmissionReview.tsx must provide navigation to edit and resubmit rejected form (Feature F8)'
    );
  });

  it('TC-T1-F8-05: Resubmission Persistent Backend Dispatch and Audit Log', async () => {
    const res = await postAppsScript('submitForm', {
      id: 103,
      formId: 'CS420',
      summary: 'Resubmission with expanded hosting architecture details',
      responses: {
        projectTitle: 'RoomiesForms Enterprise Portal',
        facultyAdvisor: 'Dr. Ghassan Alkadi',
        serverSpecs: 'AWS ECS Fargate container clusters with multi-AZ RDS PostgreSQL',
      },
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.status, 'Pending');

    const auditRes = await postGoogleSheetsAudit({
      submissionId: 103,
      formId: 'CS420',
      summary: 'Resubmission after changes requested',
      responses: res.data.responses,
    });
    assert.strictEqual(auditRes.ok, true);
  });
});
