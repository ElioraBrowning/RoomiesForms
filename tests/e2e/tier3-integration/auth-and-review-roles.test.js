/**
 * tests/e2e/tier3-integration/auth-and-review-roles.test.js
 *
 * Tier 3: Pairwise Integration - Auth Lifecycle x Review Roles & Analytics Access (F2 x F3, F3 x F4)
 * Verifies that role authentication correctly gates reviewer and analytics capabilities
 * without any Dean contamination.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AuthSession,
  canAccessAnalytics,
  createStorage,
  isReviewer,
} from '../helpers/auth-simulator.js';

describe('Tier 3: Auth Lifecycle x Review Roles & Analytics Integration', () => {
  it('TC-E2E-T3-01: Dept Head login grants CS access with no Dean references', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    session.login('bonnie.achee@southeastern.edu');
    assert.strictEqual(session.isAuthenticated(), true);
    assert.strictEqual(isReviewer(session.user), true);
    assert.strictEqual(canAccessAnalytics(session.user), true);

    // Verify roles array has no Dean
    assert.strictEqual(
      session.user.roles.includes('Dean'),
      false,
      "Dept Head user must not have 'Dean' role"
    );

    // Reviewer routes allowed
    assert.strictEqual(session.canAccess('/assignments').allowed, true);
    assert.strictEqual(session.canAccess('/analytics').allowed, true);
  });

  it('TC-E2E-T3-02: Designated Faculty login grants Placement Analytics access; logout terminates access', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    // Designated faculty login
    session.login('galkadi@selu.edu');
    assert.strictEqual(session.canAccess('/analytics').allowed, true);

    // Hard reload preservation
    const reloaded = new AuthSession(storage);
    assert.strictEqual(reloaded.canAccess('/analytics').allowed, true);

    // Logout teardown
    reloaded.logout();
    assert.strictEqual(reloaded.canAccess('/analytics').allowed, false);
    assert.strictEqual(reloaded.canAccess('/analytics').redirect, '/login');
  });

  it('TC-E2E-T3-03: Student login cannot access reviewer routes or analytics view', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    session.login('eliora.browning@selu.edu');
    assert.strictEqual(session.isAuthenticated(), true);
    assert.strictEqual(isReviewer(session.user), false);
    assert.strictEqual(canAccessAnalytics(session.user), false);

    assert.strictEqual(session.canAccess('/assignments').allowed, false);
    assert.strictEqual(session.canAccess('/assignments').redirect, '/dashboard');

    assert.strictEqual(session.canAccess('/analytics').allowed, false);
    assert.strictEqual(session.canAccess('/analytics').redirect, '/dashboard');
  });
});
