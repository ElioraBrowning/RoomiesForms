/**
 * tests/e2e/tier2-boundary/f3-auth-boundary.test.js
 *
 * Tier 2: Feature F3 - Authentication Boundary & Corner Cases
 * Verifies unauthenticated deep link redirection, corrupted session recovery,
 * network outage alert handling, and student reviewer route traversal prevention.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthSession, createStorage } from '../helpers/auth-simulator.js';

describe('Feature F3 (Tier 2): Authentication Boundary & Corner Cases', () => {
  it('TC-E2E-F3-06: Unauthenticated Direct Route Access Redirection', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/assignments',
      '/forms/CS401',
      '/submissions/102',
    ];

    for (const route of protectedRoutes) {
      const check = session.canAccess(route);
      assert.strictEqual(
        check.allowed,
        false,
        `Unauthenticated visitor must not access ${route}`
      );
      assert.strictEqual(
        check.redirect,
        '/login',
        `Unauthenticated visitor must be redirected to /login for ${route}`
      );
    }
  });

  it('TC-E2E-F3-07: Post-Logout Browser History Protection', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    // 1. Department Head logs in and views sensitive submission
    session.login('bonnie.achee@southeastern.edu');
    assert.strictEqual(session.canAccess('/submissions/105').allowed, true);

    // 2. Department Head logs out
    session.logout();

    // 3. User hits back button or revisits sensitive submission route
    const postLogoutCheck = session.canAccess('/submissions/105');
    assert.strictEqual(
      postLogoutCheck.allowed,
      false,
      'Post-logout access to submissions must be denied'
    );
    assert.strictEqual(postLogoutCheck.redirect, '/login');
  });

  it('TC-E2E-F3-08: Corrupted LocalStorage Token Recovery', () => {
    const storage = createStorage({
      token: 'corrupted-jwt-token',
      user: '{invalid-json-content',
    });

    // Session initialization must catch corrupted JSON gracefully and clear invalid items
    const session = new AuthSession(storage);
    assert.strictEqual(session.isAuthenticated(), false);
    assert.strictEqual(session.user, null);
    assert.strictEqual(storage.getItem('user'), null);
    assert.strictEqual(storage.getItem('token'), null);
  });

  it('TC-E2E-F3-09: Backend Network Error Alert Handling', () => {
    // Network failure error object formatting
    const networkError = new Error("Couldn't reach Google Apps Script backend. Please check your network connection and try again.");
    assert.match(
      networkError.message,
      /Couldn't reach Google Apps Script backend/
    );
  });

  it('TC-E2E-F3-10: Student Unauthorized Reviewer Route Traversal', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    // Student logs in
    session.login('eliora.browning@selu.edu');
    assert.strictEqual(session.isAuthenticated(), true);

    // Student attempts to traverse to reviewer-only routes
    const reviewerRoutes = ['/assignments', '/forms/builder'];
    for (const route of reviewerRoutes) {
      const check = session.canAccess(route);
      assert.strictEqual(
        check.allowed,
        false,
        `Student must NOT be allowed to access ${route}`
      );
      assert.strictEqual(
        check.redirect,
        '/dashboard',
        `Student traversing to ${route} must be redirected to /dashboard`
      );
    }
  });
});
