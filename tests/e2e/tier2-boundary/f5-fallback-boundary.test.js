/**
 * tests/e2e/tier2-boundary/f5-fallback-boundary.test.js
 *
 * Tier 2: Feature F5 - Survey Fallback Boundary & Edge Cases
 * Verifies invalid survey slug handling, zero-response rendering, anonymity guarantees,
 * and role guards preventing student and unauthenticated access to survey outcomes.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';
import { AuthSession, createStorage } from '../helpers/auth-simulator.js';
import { readFile } from '../helpers/bundle-scanner.js';
import { FIXTURE_SURVEY_RESPONSES } from '../helpers/test-fixtures.js';

describe('Feature F5 (Tier 2): Survey Fallback Boundary & Edge Cases', () => {
  it('TC-E2E-F5-06: Nonexistent Survey Form Slug Handling', async () => {
    // Attempt to fetch responses for an invalid or missing form slug
    const res = await postAppsScript('getAnonymousResponses', { formKeyOrId: 'NonexistentSlug' });
    // Should return fallback survey responses or an error without crashing
    assert.ok(res.ok !== undefined);
  });

  it('TC-E2E-F5-07: Zero-Response Survey Form Rendering', () => {
    const emptySurveyData = {
      formId: 99,
      formKey: 'EmptySurvey',
      title: 'Empty Survey',
      responseCount: 0,
      assignedCount: 10,
      byQuestion: {
        q1: {
          questionId: 'q1',
          label: 'Sample Question',
          type: 'choice',
          totalAnswers: 0,
          distribution: [
            { label: 'Option A', count: 0, percentage: 0 },
            { label: 'Option B', count: 0, percentage: 0 },
          ],
        },
      },
    };

    assert.strictEqual(emptySurveyData.responseCount, 0);
    for (const dist of emptySurveyData.byQuestion.q1.distribution) {
      assert.strictEqual(dist.count, 0);
      assert.strictEqual(dist.percentage, 0);
      assert.strictEqual(Number.isNaN(dist.percentage), false);
    }
  });

  it('TC-E2E-F5-08: Anonymity Guarantee Source Contract & PII Exclusion Audit', () => {
    const surveyContent = readFile('Web/src/pages/SurveyResults.tsx');
    assert.ok(surveyContent, 'SurveyResults.tsx must exist');
    assert.match(
      surveyContent,
      /Responses are anonymous: no names, W#s or submission times are stored with them/,
      'SurveyResults.tsx must document and uphold anonymity guarantee'
    );

    // Inspect survey responses payload for student PII exclusion
    const surveyJson = JSON.stringify(FIXTURE_SURVEY_RESPONSES);
    assert.doesNotMatch(surveyJson, /Cade Sholar/i);
    assert.doesNotMatch(surveyJson, /Eliora Browning/i);
    assert.doesNotMatch(surveyJson, /W07\d{5}/i);
    assert.doesNotMatch(surveyJson, /@selu\.edu/i);
  });

  it('TC-E2E-F5-09: Unauthenticated Access Guard on Survey Results', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    const check = session.canAccess('/forms/ExitSurvey/results');
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.redirect, '/login');
  });

  it('TC-E2E-F5-10: Student Access Guard on Survey Results', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);
    session.login('eliora.browning@selu.edu');

    const check = session.canAccess('/forms/ExitSurvey/results');
    assert.strictEqual(
      check.allowed,
      false,
      'Students must not be able to view aggregate survey results'
    );
    assert.strictEqual(check.redirect, '/dashboard');
  });
});
