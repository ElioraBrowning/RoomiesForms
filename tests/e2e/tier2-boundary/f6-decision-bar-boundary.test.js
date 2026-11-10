/**
 * tests/e2e/tier2-boundary/f6-decision-bar-boundary.test.js
 *
 * Tier 2: Feature F6 - Review Decision Bar Boundary & Edge Cases
 * Verifies checklist validation before send-back, explanation requirements on flagged items,
 * approval confirmation on flagged items, currentStep synthesis, and rejection failure recovery
 * directly against Web/src/pages/SubmissionReview.tsx source contracts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from '../helpers/bundle-scanner.js';

describe('Feature F6 (Tier 2): Review Decision Bar Boundary & Edge Cases', () => {
  it('TC-T2-F6-01: Unmarked Checklist Items Blocker on Send Back in SubmissionReview', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');
    assert.match(
      content,
      /unmarked\.length\s*>\s*0\s*\?\s*`Approve or flag the \${unmarked\.length} remaining answer/,
      'SubmissionReview.tsx must block sendBack when unmarked reviewRequired questions remain'
    );
  });

  it('TC-T2-F6-02: Flagged Item Without Feedback Blocker on Send Back', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');
    assert.match(
      content,
      /flagsWithoutComment\.length\s*>\s*0\s*\?\s*`Say what to fix on/,
      'SubmissionReview.tsx must require comment feedback when answers are flagged as needing changes'
    );
  });

  it('TC-T2-F6-03: Approval Confirmation Prompt with Flagged Items', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');
    assert.match(
      content,
      /flagged\.length\s*>\s*0\s*&&\s*!window\.confirm\(`\${flagged\.length} answer\(s\) are marked as needing changes/,
      'SubmissionReview.tsx must prompt confirmation when approving submission with flagged answers'
    );
  });

  it('TC-T2-F6-04: CurrentStep Handling in SubmissionReview', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');
    assert.match(
      content,
      /submission\?\.currentStep\?\.requiredRole\?\.name/,
      'SubmissionReview.tsx must resolve required role from currentStep'
    );
  });

  it('TC-T2-F6-05: Backend Rejection Failure Display and Error Recovery', () => {
    const content = readFile('Web/src/pages/SubmissionReview.tsx');
    assert.ok(content, 'SubmissionReview.tsx must exist');
    assert.match(
      content,
      /readApiError\(err,\s*"Couldn't send this back\."\)/,
      'SubmissionReview.tsx must catch and format backend rejection failure errors'
    );
    assert.match(
      content,
      /setBusy\(null\)/,
      'SubmissionReview.tsx must re-enable buttons in finally block'
    );
  });
});
