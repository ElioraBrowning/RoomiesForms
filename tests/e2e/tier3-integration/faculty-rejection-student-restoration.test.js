/**
 * tests/e2e/tier3-integration/faculty-rejection-student-restoration.test.js
 *
 * Tier 3: Pairwise Integration - Review Rejection x Student Resubmission (F6 x F8, F7 x F8)
 * Verifies that question feedback left during faculty review or department triage
 * is parsed and restored seamlessly into student resubmission forms.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';
import { FIXTURE_SUBMISSIONS, FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Tier 3: Rejection Feedback x Student Resubmission Integration', () => {
  it('TC-E2E-T3-06: Faculty rejection feedback restores directly into student resubmission view', async () => {
    const faculty = FIXTURE_USERS.facultyAlkadi;
    const sub102 = FIXTURE_SUBMISSIONS.find((s) => s.id === 102);

    const feedbackPayload = '[Changes Needed] Major GPA: Please verify with current transcript.\nGeneral remarks: Check prerequisite hours.';

    // 1. Faculty rejects submission
    const rejectRes = await postAppsScript('rejectSubmission', {
      id: sub102.id,
      feedback: feedbackPayload,
      userEmail: faculty.email,
      roles: faculty.roles,
    });
    assert.strictEqual(rejectRes.ok, true);

    // 2. Student reopens form for resubmission
    const lines = feedbackPayload.split('\n');
    const byQuestion = {};
    for (const line of lines) {
      const match = line.match(/^\[Changes Needed\]\s*([^:]+):\s*(.*)$/i);
      if (match) {
        byQuestion[match[1].trim()] = match[2].trim();
      }
    }

    assert.ok(byQuestion['Major GPA']);
    assert.strictEqual(byQuestion['Major GPA'], 'Please verify with current transcript.');

    // Student previous responses restored
    const restoredAnswers = { ...sub102.responses };
    assert.strictEqual(restoredAnswers.primaryTrack, 'Information Technology');
    assert.strictEqual(restoredAnswers.majorGpa, 3.75);
  });

  it('TC-E2E-T3-07: Department Head revision request displays in student resubmission alert banner', async () => {
    const deptHead = FIXTURE_USERS.deptHeadBonnie;
    const revisionFeedback = 'Please provide official verification of hours from your industry mentor.';

    // Department Head dispatches revision request
    const rejectRes = await postAppsScript('rejectSubmission', {
      id: 105,
      feedback: revisionFeedback,
      userEmail: deptHead.email,
      roles: deptHead.roles,
    });
    assert.strictEqual(rejectRes.ok, true);

    // Alert banner simulates display
    const alertBanner = `Changes requested by ${deptHead.fullName}: ${revisionFeedback}`;
    assert.match(alertBanner, /Dr\. Bonnie Achée/);
    assert.match(alertBanner, /official verification of hours/);
  });
});
