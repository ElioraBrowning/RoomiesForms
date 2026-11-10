/**
 * tests/e2e/tier1-features/f3-auth-lifecycle.test.js
 *
 * Tier 1: Feature F3 - Login & Logout Lifecycle Integrity
 * Verifies authentication flows, storage persistence, and session teardown
 * across Student, Faculty, and Department Head roles.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AuthSession,
  createStorage,
  isReviewer,
} from '../helpers/auth-simulator.js';
import { FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Feature F3 (Tier 1): Login & Logout Lifecycle Integrity', () => {
  it('TC-E2E-F3-01: Student Manual & Demo Login Lifecycle', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    assert.strictEqual(session.isAuthenticated(), false);

    const user = session.login('eliora.browning@selu.edu');
    assert.strictEqual(user.email, 'eliora.browning@selu.edu');
    assert.deepStrictEqual(user.roles, ['Student']);
    assert.strictEqual(session.isAuthenticated(), true);

    // Verify localStorage persistence
    assert.ok(storage.getItem('token'), 'Token must be stored');
    const storedUser = JSON.parse(storage.getItem('user'));
    assert.strictEqual(storedUser.fullName, 'Eliora Browning');
    assert.strictEqual(storedUser.wNumber, 'W0712345');
    assert.strictEqual(isReviewer(user), false, 'Student must not be a reviewer');
  });

  it('TC-E2E-F3-02: Faculty Manual & Demo Login Lifecycle', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    const user = session.login('galkadi@selu.edu');
    assert.strictEqual(user.email, 'galkadi@selu.edu');
    assert.deepStrictEqual(user.roles, ['Faculty']);
    assert.strictEqual(session.isAuthenticated(), true);

    assert.strictEqual(isReviewer(user), true, 'Faculty must be a reviewer');
    assert.strictEqual(user.roles.includes('Dean'), false, "Faculty must not have 'Dean' role");
  });

  it('TC-E2E-F3-03: Department Head Manual & Demo Login Lifecycle', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    const user = session.login('bonnie.achee@southeastern.edu');
    assert.strictEqual(user.email, 'bonnie.achee@southeastern.edu');
    assert.deepStrictEqual(user.roles, ['Department Head']);
    assert.strictEqual(session.isAuthenticated(), true);

    assert.strictEqual(isReviewer(user), true, 'Department Head must be a reviewer');
    assert.strictEqual(user.roles.includes('Dean'), false, "Department Head must not have 'Dean' role");
  });

  it('TC-E2E-F3-04: Complete Logout Lifecycle & Session Teardown', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    session.login('bonnie.achee@southeastern.edu');
    assert.strictEqual(session.isAuthenticated(), true);
    assert.ok(storage.getItem('token'));
    assert.ok(storage.getItem('user'));

    // Execute logout
    session.logout();
    assert.strictEqual(session.isAuthenticated(), false);
    assert.strictEqual(session.token, null);
    assert.strictEqual(session.user, null);
    assert.strictEqual(storage.getItem('token'), null, 'Token must be removed from storage');
    assert.strictEqual(storage.getItem('user'), null, 'User must be removed from storage');

    // Routing check: unauthenticated access redirects to /login
    const accessCheck = session.canAccess('/dashboard');
    assert.strictEqual(accessCheck.allowed, false);
    assert.strictEqual(accessCheck.redirect, '/login');
  });

  it('TC-E2E-F3-05: Session Restoration on Hard Page Reload', () => {
    const storage = createStorage();
    const initialSession = new AuthSession(storage);
    initialSession.login('galkadi@selu.edu');

    // Simulate browser reload by initializing a new session instance with the same storage
    const reloadedSession = new AuthSession(storage);
    assert.strictEqual(
      reloadedSession.isAuthenticated(),
      true,
      'Session must restore authentication on reload'
    );
    assert.strictEqual(reloadedSession.user?.email, 'galkadi@selu.edu');
    assert.deepStrictEqual(reloadedSession.user?.roles, ['Faculty']);
  });
});
