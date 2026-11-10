/**
 * tests/e2e/tier3-integration/gas-security-and-hygiene.test.js
 *
 * Tier 3: Pairwise Integration - Live GAS Security x Repository Hygiene (F1 x F9, F1 x F5)
 * Verifies that automated live script interaction or scratch testing never pollutes the git working tree,
 * and offline survey fallbacks handle backend outages cleanly.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';
import { getGitStatus, testIgnoreRule } from '../helpers/git-inspector.js';

describe('Tier 3: GAS Security x Repository Hygiene Integration', () => {
  it('TC-E2E-T3-11: Live GAS testing maintains zero tracked temporary files', () => {
    // Simulate creating temporary test payload and script scratchpad
    const scratchpad = testIgnoreRule('temp_integration_payload.json', '{"test": 123}');
    assert.strictEqual(scratchpad.ignored, true);

    const statusAfter = getGitStatus();
    const leakedFiles = statusAfter.filter((s) => /temp_integration/i.test(s));
    assert.strictEqual(leakedFiles.length, 0);
  });

  it('TC-E2E-T3-12: Offline survey fallback guarantees zero unhandled exceptions when GAS unavailable', async () => {
    // Simulate offline mode during survey fetch
    const res = await postAppsScript('getAnonymousResponses', { formKeyOrId: 'ExitSurvey' }, { offline: true });
    assert.strictEqual(res.ok, true);
    assert.ok(res.data?.responseCount > 0);
    assert.ok(res.data?.byQuestion?.overallSatisfaction);
  });
});
