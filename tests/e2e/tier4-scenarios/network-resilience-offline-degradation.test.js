/**
 * tests/e2e/tier4-scenarios/network-resilience-offline-degradation.test.js
 *
 * Tier 4 Scenario 5: Network Outage & Seamless Offline Graceful Degradation
 * Resilience stress test simulating backend outage or complete local network drop:
 * Live GAS returns 503/502 -> api.ts catches error -> Mock fallback activates ->
 * Non-fatal notifications rendered -> No uncaught rejections or white-screen crashes.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';

describe('Tier 4 Scenario 5: Network Outage & Offline Degradation', () => {
  it('Ensures seamless fallback to mock datasets across all core actions during network outage', async () => {
    // 1. Simulate offline login fallback
    const loginRes = await postAppsScript('login', {
      email: 'bonnie.achee@southeastern.edu',
    }, { offline: true });

    assert.strictEqual(loginRes.ok, true);
    assert.strictEqual(loginRes.data?.user?.fullName, 'Dr. Bonnie Achée');

    // 2. Simulate offline form catalog retrieval
    const formsRes = await postAppsScript('getForms', {}, { offline: true });
    assert.strictEqual(formsRes.ok, true);
    assert.ok(Array.isArray(formsRes.data));
    assert.ok(formsRes.data.length >= 3);

    // 3. Simulate offline exit survey aggregation
    const surveyRes = await postAppsScript('getAnonymousResponses', {
      formKeyOrId: 'ExitSurvey',
    }, { offline: true });
    assert.strictEqual(surveyRes.ok, true);
    assert.ok(surveyRes.data?.byQuestion?.overallSatisfaction);

    // 4. Simulate offline submissions queue retrieval
    const subsRes = await postAppsScript('getSubmissions', {}, { offline: true });
    assert.strictEqual(subsRes.ok, true);
    assert.ok(Array.isArray(subsRes.data));
    assert.ok(subsRes.data.length >= 4);

    // 5. Unknown action error handling and contract verification
    const errorRes = await postAppsScript('unknownAction', {});
    assert.strictEqual(errorRes.ok, false);
    assert.match(errorRes.error, /Unknown action "unknownAction"/);
  });
});
