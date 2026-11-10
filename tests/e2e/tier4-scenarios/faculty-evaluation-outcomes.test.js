/**
 * tests/e2e/tier4-scenarios/faculty-evaluation-outcomes.test.js
 *
 * Tier 4 Scenario 2: Faculty Evaluation & CS Placement Outcomes Analytics
 * Simulates designated faculty workflow:
 * Login -> Access review queue -> Open CS Placement Analytics ->
 * Search directory -> Inspect partner compensation -> View exit survey aggregates.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { postAppsScript } from '../helpers/api-client.js';
import { AuthSession, canAccessAnalytics, createStorage } from '../helpers/auth-simulator.js';
import { FIXTURE_PLACEMENTS } from '../helpers/test-fixtures.js';

describe('Tier 4 Scenario 2: Faculty Evaluation & CS Placement Outcomes Analytics', () => {
  it('Simulates complete designated faculty evaluation and outcomes analysis journey', async () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    // 1. Dr. Alkadi logs into portal
    session.login('galkadi@selu.edu');
    assert.strictEqual(session.isAuthenticated(), true);
    assert.strictEqual(canAccessAnalytics(session.user), true);

    // 2. Navigates to Placement Analytics (/analytics)
    const access = session.canAccess('/analytics');
    assert.strictEqual(access.allowed, true);

    // 3. Inspects program KPIs
    const placements = FIXTURE_PLACEMENTS;
    const totalPlaced = placements.length;
    const avgPay = placements.reduce((sum, p) => sum + p.hourlyWage, 0) / totalPlaced;
    const avgGpa = placements.reduce((sum, p) => sum + p.gpa, 0) / totalPlaced;

    assert.strictEqual(totalPlaced, 10);
    assert.ok(avgPay > 25.0);
    assert.ok(avgGpa > 3.5);

    // 4. Searches directory for Cade Sholar at DXC Technology
    const cade = placements.find((p) => p.studentName === 'Cade Sholar');
    assert.ok(cade);
    assert.strictEqual(cade.employer, 'DXC Technology');
    assert.strictEqual(cade.hourlyWage, 29.5);

    // 5. Switches to Exit Survey Results (/forms/ExitSurvey/results)
    const surveyRes = await postAppsScript('getAnonymousResponses', { formKeyOrId: 'ExitSurvey' });
    assert.strictEqual(surveyRes.ok, true);
    assert.strictEqual(surveyRes.data.responseCount, 14);

    // Verify program comments do not leak student identity
    const quotes = surveyRes.data.byQuestion.programComments.quotes;
    for (const q of quotes) {
      assert.doesNotMatch(q, /Cade|Alkadi@selu\.edu/i);
    }

    session.logout();
    assert.strictEqual(session.isAuthenticated(), false);
  });
});
