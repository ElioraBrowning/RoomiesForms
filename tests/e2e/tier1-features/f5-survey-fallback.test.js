/**
 * tests/e2e/tier1-features/f5-survey-fallback.test.js
 *
 * Tier 1: Feature F5 - Survey Analytics Fallback & Dead Code Elimination
 * Verifies anonymous exit survey reporting, question distributions, quote extraction,
 * offline fallback behavior, and dead code elimination of QuickReviewDrawer.tsx.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';
import { fileExists, scanFilesForPattern } from '../helpers/bundle-scanner.js';
import { FIXTURE_SURVEY_RESPONSES } from '../helpers/test-fixtures.js';

describe('Feature F5 (Tier 1): Survey Analytics Fallback & Dead Code Elimination', () => {
  it('TC-E2E-F5-01: Survey Results Page Loading (ExitSurvey)', async () => {
    const res = await postAppsScript('getAnonymousResponses', { formKeyOrId: 'ExitSurvey' });
    assert.strictEqual(res.ok, true, 'getAnonymousResponses must return ok: true');
    assert.ok(res.data, 'getAnonymousResponses must return data');
    assert.strictEqual(res.data.formKey, 'ExitSurvey');
    assert.ok(res.data.responseCount > 0, 'Response count must be > 0');
  });

  it('TC-E2E-F5-02: Choice & Multi-Choice Progress Bar Visualization', () => {
    const data = FIXTURE_SURVEY_RESPONSES;
    const satisfaction = data.byQuestion.overallSatisfaction;

    assert.strictEqual(satisfaction.type, 'choice');
    assert.ok(Array.isArray(satisfaction.distribution));
    assert.ok(satisfaction.distribution.length > 0);

    let totalPercentage = 0;
    for (const item of satisfaction.distribution) {
      assert.ok(typeof item.label === 'string');
      assert.ok(typeof item.count === 'number');
      assert.ok(typeof item.percentage === 'number');
      totalPercentage += item.percentage;
    }

    assert.ok(
      Math.abs(totalPercentage - 100) < 1.0,
      `Total percentages should sum to approximately 100%, got ${totalPercentage}%`
    );
  });

  it('TC-E2E-F5-03: Qualitative Quote Card Visualization', () => {
    const data = FIXTURE_SURVEY_RESPONSES;
    const comments = data.byQuestion.programComments;

    assert.strictEqual(comments.type, 'textarea');
    assert.ok(Array.isArray(comments.quotes));
    assert.ok(comments.quotes.length >= 3);

    // Verify anonymity: quotes must not contain student ID, W-number, or email
    for (const quote of comments.quotes) {
      assert.doesNotMatch(quote, /W0\d{6}/i, 'Quote must not leak W-number');
      assert.doesNotMatch(quote, /@selu\.edu|@southeastern\.edu/i, 'Quote must not leak student email');
    }
  });

  it('TC-E2E-F5-04: Offline Fallback Activation on Network Failure', async () => {
    // When offline or GAS fails, mockAppsScriptDispatcher provides fallback
    const res = await postAppsScript('getAnonymousResponses', { formKeyOrId: 'ExitSurvey' }, { offline: true });
    assert.strictEqual(res.ok, true);
    assert.ok(res.data?.byQuestion?.overallSatisfaction);
  });

  it('TC-E2E-F5-05: Dead Code Removal of QuickReviewDrawer.tsx', () => {
    // Check if QuickReviewDrawer is imported anywhere in Web/src
    const imports = scanFilesForPattern('Web/src', /QuickReviewDrawer/);
    // Exclude the file itself if it exists
    const externalImports = imports.filter((m) => !m.file.includes('QuickReviewDrawer.tsx'));
    assert.strictEqual(
      externalImports.length,
      0,
      `QuickReviewDrawer must have 0 imports across the codebase. Found in: ${externalImports.map((m) => m.file).join(', ')}`
    );

    // Verify orphaned file is deleted per Feature F5
    const exists = fileExists('Web/src/components/dashboards/QuickReviewDrawer.tsx');
    assert.strictEqual(
      exists,
      false,
      'Web/src/components/dashboards/QuickReviewDrawer.tsx is orphaned dead code and must be deleted (Feature F5)'
    );
  });
});
