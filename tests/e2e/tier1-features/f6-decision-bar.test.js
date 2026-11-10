/**
 * tests/e2e/tier1-features/f6-decision-bar.test.js
 *
 * Tier 1: Feature F6 - Review Decision Bar Activation
 * Verifies role mapping (Faculty Evaluator -> Faculty, Department Head Authorization -> Department Head),
 * step synthesis, and active decision bar activation for pending submissions directly against
 * Web/src/pages/SubmissionReview.tsx and API contracts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';
import { readFile } from '../helpers/bundle-scanner.js';
import { FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Feature F6 (Tier 1): Review Decision Bar Activation', () => {
  it('TC-T1-F6-01: Faculty Evaluator Role Equivalence Activation in SubmissionReview', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');

    // SubmissionReview.tsx must support role equivalence mapping for 'Faculty Evaluator' -> 'Faculty'
    assert.match(
      content,
      /(?:Faculty Evaluator.*Faculty|matchesRole|ROLE_EQUIVALENCE|requiredRole === 'Faculty Evaluator' && user\?\.roles\?\.includes\('Faculty'\))/s,
      "SubmissionReview.tsx must map step requiredRole 'Faculty Evaluator' to 'Faculty' user role (Feature F6)"
    );
  });

  it('TC-T1-F6-02: Department Head Authorization Role Equivalence Activation in SubmissionReview', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');

    // SubmissionReview.tsx must support role equivalence mapping for 'Department Head Authorization' -> 'Department Head'
    assert.match(
      content,
      /(?:Department Head Authorization.*Department Head|matchesRole|ROLE_EQUIVALENCE|requiredRole === 'Department Head Authorization' && user\?\.roles\?\.includes\('Department Head'\))/s,
      "SubmissionReview.tsx must map step requiredRole 'Department Head Authorization' to 'Department Head' user role (Feature F6)"
    );
  });

  it('TC-T1-F6-03: Faculty Approval Execution & Transition', async () => {
    const faculty = FIXTURE_USERS.facultyAlkadi;
    const res = await postAppsScript('approveSubmission', {
      id: 102,
      comments: 'Prerequisites verified, approved for degree checklist.',
      userEmail: faculty.email,
      roles: faculty.roles,
    });

    assert.strictEqual(res.ok, true, 'Approval API dispatch must succeed');
    assert.strictEqual(res.data.id, 102);
    assert.strictEqual(res.data.status, 'Approved');
    assert.match(res.data.comments, /Prerequisites verified/);
  });

  it('TC-T1-F6-04: Faculty Send Back with Question Feedback Execution', async () => {
    const faculty = FIXTURE_USERS.facultyAlkadi;
    const res = await postAppsScript('rejectSubmission', {
      id: 102,
      feedback: '[Changes Needed] Primary Track: Please select Scientific or Information Technology',
      userEmail: faculty.email,
      roles: faculty.roles,
    });

    assert.strictEqual(res.ok, true, 'Reject API dispatch must succeed');
    assert.strictEqual(res.data.id, 102);
    assert.strictEqual(res.data.status, 'Rejected');
    assert.match(res.data.feedback, /\[Changes Needed\]/);
  });

  it('TC-T1-F6-05: Decision Bar Inactive for Completed / Non-Pending Submissions', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');
    assert.match(
      content,
      /submission\?\.status === 'Pending'/,
      'SubmissionReview.tsx must strictly require submission.status === "Pending" to activate decision bar'
    );
  });
});
