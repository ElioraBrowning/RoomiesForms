/**
 * tests/e2e/tier2-boundary/f8-resubmission-boundary.test.js
 *
 * Tier 2: Feature F8 - Resubmission Boundary & Edge Cases
 * Verifies clean initial state when no rejected forms exist, multi-page data preservation,
 * question-specific feedback parsing via feedback.ts, and FormView submission contracts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from '../helpers/bundle-scanner.js';
import { FIXTURE_FORMS } from '../helpers/test-fixtures.js';
import { latestSentBack, sentBackLine } from '../../../Web/src/forms/feedback.ts';

describe('Feature F8 (Tier 2): Resubmission Boundary & Edge Cases', () => {
  it('TC-T2-F8-01: latestSentBack Returns Null When No Rejected Logs Exist', () => {
    const questions = FIXTURE_FORMS[0].pages[0].questions;
    const emptyResult = latestSentBack(undefined, questions);
    assert.strictEqual(emptyResult, null, 'Should return null when logs are undefined');

    const approvedLogs = [
      { action: 'Approved', comments: 'Looks great', actionTimestamp: '2026-11-09T10:00:00Z' },
    ];
    const approvedResult = latestSentBack(approvedLogs, questions);
    assert.strictEqual(approvedResult, null, 'Should return null when no rejection logs exist');
  });

  it('TC-T2-F8-02: latestSentBack Accurately Maps Per-Question Feedback', () => {
    const questions = [
      { id: 'projectTitle', label: 'Project Title' },
      { id: 'serverSpecs', label: 'Server & Hosting Specifications' },
    ];
    const rejectionLogs = [
      {
        action: 'Rejected',
        comments: '[Changes Needed] Server & Hosting Specifications: Please clarify cloud specs.\nGeneral remarks: Please refine.',
        actionTimestamp: '2026-11-09T10:00:00Z',
        reviewer: { fullName: 'Dr. Ghassan Alkadi' },
      },
    ];

    const parsed = latestSentBack(rejectionLogs, questions);
    assert.ok(parsed, 'SentBack object should not be null');
    assert.strictEqual(
      parsed.byQuestion.serverSpecs,
      'Please clarify cloud specs.'
    );
    assert.match(parsed.general, /Please refine/);
    assert.strictEqual(parsed.by, 'Dr. Ghassan Alkadi');

    const line = sentBackLine(parsed);
    assert.match(line, /Changes requested by Dr\. Ghassan Alkadi/);
  });

  it('TC-T2-F8-03: Handling Non-Standard Feedback Lines in latestSentBack', () => {
    const questions = [{ id: 'jobTitle', label: 'Job Title' }];
    const logs = [
      {
        action: 'Rejected',
        comments: 'Please discuss your hardware requirements with advisor during office hours.',
        actionTimestamp: '2026-11-09T10:00:00Z',
      },
    ];

    const result = latestSentBack(logs, questions);
    assert.ok(result);
    assert.strictEqual(Object.keys(result.byQuestion).length, 0);
    assert.strictEqual(
      result.general,
      'Please discuss your hardware requirements with advisor during office hours.'
    );
  });

  it('TC-T2-F8-04: FormView Draft Rejection Detection Contract', () => {
    const content = readFile('Web/src/pages/FormView.tsx');
    assert.ok(content, 'FormView.tsx must exist');
    assert.match(
      content,
      /const isRevision = draft\?\.status === 'Rejected'/,
      'FormView.tsx must detect revisions based on rejected status'
    );
    assert.match(
      content,
      /latestSentBack\(draft\?\.auditLogs,\s*questionsFor\(schema,\s*'student'\)\)/,
      'FormView.tsx must invoke latestSentBack to parse question-specific reviewer feedback'
    );
  });

  it('TC-T2-F8-05: FormView Resubmission Audit Trail Logging', () => {
    const content = readFile('Web/src/pages/FormView.tsx');
    assert.ok(content, 'FormView.tsx must exist');
    assert.match(
      content,
      /summary:\s*schema\.anonymous\s*\?\s*'Anonymous survey submission'\s*:\s*isRevision\s*\?\s*'Resubmission after changes requested'\s*:\s*'Initial submission'/,
      'FormView.tsx must log Resubmission after changes requested to Google Sheets'
    );
  });
});
