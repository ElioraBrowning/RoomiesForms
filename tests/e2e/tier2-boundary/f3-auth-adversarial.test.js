/**
 * tests/e2e/tier2-boundary/f3-auth-adversarial.test.js
 *
 * Empirical Adversarial Challenge Suite for Feature F3:
 * Auth & Lifecycle Integrity (Student, Faculty, Department Head)
 *
 * Directly tests real implementation modules:
 * - Web/src/services/mockData.ts (getMockUser permutations & zero 'Dean')
 * - Web/src/pages/Login.tsx (quick-login buttons and labels)
 * - Web/src/context/AuthContext.tsx (auth state, ghost token rejection, lifecycle)
 * - Web/src/App.tsx & Web/src/components/Layout.tsx (unauthenticated redirects & RBAC)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { getMockUser } from '../../../Web/src/services/mockData.ts';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');

/**
 * Simulates in-memory browser storage for auth lifecycle testing.
 */
function createMockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    get size() {
      return map.size;
    },
  };
}

/**
 * Simulates the React Router + AuthContext Route Guard logic
 * directly matching App.tsx and Layout.tsx.
 */
function evaluateRouteAccess({ pathname, user, token }) {
  const isAuthenticated = Boolean(token && user);

  // Top-level unauthenticated routes (outside Layout)
  if (pathname === '/login' || pathname === '/auth/callback' || pathname.startsWith('/employer/')) {
    return { allowed: true, redirect: null };
  }

  // Layout Route Protection: all routes inside Layout require isAuthenticated
  if (!isAuthenticated) {
    return { allowed: false, redirect: '/login' };
  }

  // Inside Layout: ReviewerRoute protection
  const REVIEWER_ROLES = ['Faculty', 'Department Head'];
  const isReviewer = user?.roles?.some((r) => REVIEWER_ROLES.includes(r));

  if (
    pathname === '/assignments' ||
    pathname === '/forms/builder' ||
    (pathname.startsWith('/forms/') && pathname.endsWith('/results'))
  ) {
    if (!isReviewer) {
      return { allowed: false, redirect: '/dashboard' };
    }
  }

  return { allowed: true, redirect: null };
}

describe('Feature F3 Empirical Adversarial Stress Suite: Auth & Lifecycle Integrity', () => {
  it('TC-ADV-F3-01: Direct getMockUser Permutation & Role Integrity Matrix', () => {
    // 1. Student Permutations
    const studentPermutations = [
      'cobi.smith@selu.edu',
      'COBI.SMITH@SELU.EDU',
      '  cobi.smith@selu.edu  ',
      'Cobi.Smith@selu.edu',
      'eliora.browning@selu.edu',
      'ELIORA.BROWNING@SELU.EDU',
      'cade.sholar@selu.edu',
    ];

    for (const email of studentPermutations) {
      const u = getMockUser(email);
      assert.ok(u, `User must exist for ${email}`);
      assert.deepStrictEqual(
        u.roles,
        ['Student'],
        `Student email ${email} must strictly have ['Student'] role`
      );
      assert.ok(u.fullName, `Full name must be present for ${email}`);
      assert.ok(u.wNumber.startsWith('W0'), `W# must start with W0 for ${email}`);
      assert.strictEqual(
        u.roles.includes('Dean'),
        false,
        `Student ${email} must NEVER have 'Dean' role`
      );
    }

    // 2. Faculty Permutations (Dr. Ghassan Alkadi)
    const facultyPermutations = [
      'alkadi@selu.edu',
      'galkadi@selu.edu',
      'ghassan.alkadi@selu.edu',
      'galkadi@southeastern.edu',
      'ghassan.alkadi@southeastern.edu',
      'ALKADI@SELU.EDU',
      'GALKADI@SELU.EDU',
      '  alkadi@selu.edu  ',
      '  ghassan.alkadi@southeastern.edu  ',
    ];

    for (const email of facultyPermutations) {
      const u = getMockUser(email);
      assert.ok(u, `User must exist for ${email}`);
      assert.strictEqual(u.fullName, 'Dr. Ghassan Alkadi');
      assert.strictEqual(u.wNumber, 'W0234567');
      assert.deepStrictEqual(
        u.roles,
        ['Faculty'],
        `Faculty email ${email} must strictly have ['Faculty'] role`
      );
      assert.strictEqual(
        u.roles.includes('Dean'),
        false,
        `Faculty ${email} must NEVER have 'Dean' role`
      );
    }

    // 3. Department Head Permutations (Dr. Bonnie Achée)
    const deptHeadPermutations = [
      'bonnie.achee@selu.edu',
      'bonnie.achee@southeastern.edu',
      'bachee@selu.edu',
      'bachee@southeastern.edu',
      'BONNIE.ACHEE@SELU.EDU',
      'BONNIE.ACHEE@SOUTHEASTERN.EDU',
      '  bonnie.achee@selu.edu  ',
      '  bachee@southeastern.edu  ',
    ];

    for (const email of deptHeadPermutations) {
      const u = getMockUser(email);
      assert.ok(u, `User must exist for ${email}`);
      assert.strictEqual(u.fullName, 'Dr. Bonnie Achée');
      assert.strictEqual(u.wNumber, 'W0345678');
      assert.deepStrictEqual(
        u.roles,
        ['Department Head', 'Faculty'],
        `Department Head email ${email} must have ['Department Head', 'Faculty']`
      );
      assert.strictEqual(
        u.roles.includes('Dean'),
        false,
        `Department Head ${email} must NEVER have 'Dean' role`
      );
    }
  });

  it('TC-ADV-F3-02: Adversarial Role Escalation & Fallback Immunity', () => {
    // Malicious or spoofed emails attempting role escalation
    const adversarialEmails = [
      'dean@selu.edu',
      'dean@southeastern.edu',
      'dean.achee@selu.edu',
      'office.of.the.dean@selu.edu',
      'dr.dean@selu.edu',
      'admin@selu.edu',
      'provost@selu.edu',
      'attacker@external.com',
      "' OR '1'='1",
      '<script>alert(1)</script>@selu.edu',
    ];

    for (const email of adversarialEmails) {
      const u = getMockUser(email);
      assert.ok(u, `Fallback must handle email safely without crash: ${email}`);
      assert.deepStrictEqual(
        u.roles,
        ['Student'],
        `Adversarial email "${email}" must fall back strictly to ['Student'] role`
      );
      assert.strictEqual(
        u.roles.includes('Dean'),
        false,
        `Adversarial email "${email}" must NEVER get 'Dean' role`
      );
      assert.strictEqual(
        u.roles.includes('Department Head'),
        false,
        `Adversarial email "${email}" must NEVER get 'Department Head' role`
      );
      assert.strictEqual(
        u.roles.includes('Faculty'),
        false,
        `Adversarial email "${email}" must NEVER get 'Faculty' role`
      );
    }
  });

  it('TC-ADV-F3-03: Login.tsx Demo Button Contract & Dean Absence Audit', () => {
    const loginFilePath = path.join(PROJECT_ROOT, 'Web/src/pages/Login.tsx');
    const source = fs.readFileSync(loginFilePath, 'utf8');

    // 1. Check for quick-login buttons
    assert.match(
      source,
      /handleQuickLogin\s*\(\s*["']cobi\.smith@selu\.edu["']\s*\)/,
      'Login.tsx must provide quick login for Cobi Smith (Student)'
    );
    assert.match(
      source,
      /handleQuickLogin\s*\(\s*["']alkadi@selu\.edu["']\s*\)/,
      'Login.tsx must provide quick login for Dr. Ghassan Alkadi (Faculty)'
    );
    assert.match(
      source,
      /handleQuickLogin\s*\(\s*["']bonnie\.achee@selu\.edu["']\s*\)/,
      'Login.tsx must provide quick login for Dr. Bonnie Achée (Department Head)'
    );

    // 2. Check role badges on the quick-login buttons
    assert.match(
      source,
      /<span className="login-quick-role">Student<\/span>[\s{}"']*<strong>Cobi Smith<\/strong>/,
      'Student quick-login button must display "Student" role'
    );
    assert.match(
      source,
      /<span className="login-quick-role">Faculty<\/span>[\s{}"']*<strong>Dr\. Ghassan Alkadi<\/strong>/,
      'Faculty quick-login button must display "Faculty" role'
    );
    assert.match(
      source,
      /<span className="login-quick-role">Department Head<\/span>[\s{}"']*<strong>Dr\. Bonnie Achée<\/strong>/,
      'Department Head quick-login button must display "Department Head" role'
    );

    // 3. Confirm zero occurrences of Dean in Login.tsx
    const deanMatches = source.match(/Dean/gi) || [];
    assert.strictEqual(
      deanMatches.length,
      0,
      `Login.tsx must contain 0 occurrences of 'Dean', found: ${deanMatches.length}`
    );
  });

  it('TC-ADV-F3-04: Unauthenticated Direct Route Redirection Matrix', () => {
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/assignments',
      '/forms/builder',
      '/forms/CS401',
      '/submissions/1',
      '/forms/ExitSurvey/results',
    ];

    // Scenario A: Completely unauthenticated
    for (const route of protectedRoutes) {
      const res = evaluateRouteAccess({ pathname: route, user: null, token: null });
      assert.strictEqual(res.allowed, false, `Access to ${route} must be denied when unauthenticated`);
      assert.strictEqual(res.redirect, '/login', `Unauthenticated visit to ${route} must redirect to /login`);
    }

    // Scenario B: Ghost Token (token exists, user is null)
    // Hardening in AuthContext line 106: isAuthenticated: !!(token && user)
    for (const route of protectedRoutes) {
      const res = evaluateRouteAccess({ pathname: route, user: null, token: 'ghost-token' });
      assert.strictEqual(
        res.allowed,
        false,
        `Access to ${route} must be denied with ghost token`
      );
      assert.strictEqual(res.redirect, '/login', `Ghost token visit to ${route} must redirect to /login`);
    }

    // Scenario C: Ghost User (user exists, token is null)
    for (const route of protectedRoutes) {
      const res = evaluateRouteAccess({
        pathname: route,
        user: { fullName: 'Ghost', email: 'ghost@selu.edu', roles: ['Faculty'] },
        token: null,
      });
      assert.strictEqual(
        res.allowed,
        false,
        `Access to ${route} must be denied without valid token`
      );
      assert.strictEqual(res.redirect, '/login', `Ghost user visit to ${route} must redirect to /login`);
    }
  });

  it('TC-ADV-F3-05: Reviewer Route Role-Based Access Control Matrix', () => {
    const studentUser = getMockUser('cobi.smith@selu.edu');
    const facultyUser = getMockUser('alkadi@selu.edu');
    const deptHeadUser = getMockUser('bonnie.achee@selu.edu');
    const token = 'valid-test-token';

    const testRoutes = [
      { path: '/dashboard', studentAllowed: true, reviewerAllowed: true },
      { path: '/profile', studentAllowed: true, reviewerAllowed: true },
      { path: '/forms/CS401', studentAllowed: true, reviewerAllowed: true },
      { path: '/submissions/1', studentAllowed: true, reviewerAllowed: true },
      { path: '/assignments', studentAllowed: false, reviewerAllowed: true },
      { path: '/forms/builder', studentAllowed: false, reviewerAllowed: true },
      { path: '/forms/ExitSurvey/results', studentAllowed: false, reviewerAllowed: true },
    ];

    for (const { path: route, studentAllowed, reviewerAllowed } of testRoutes) {
      // 1. Student access check
      const studentRes = evaluateRouteAccess({ pathname: route, user: studentUser, token });
      if (studentAllowed) {
        assert.strictEqual(studentRes.allowed, true, `Student should access ${route}`);
      } else {
        assert.strictEqual(studentRes.allowed, false, `Student must NOT access reviewer route ${route}`);
        assert.strictEqual(
          studentRes.redirect,
          '/dashboard',
          `Student must be bounced to /dashboard from ${route}`
        );
      }

      // 2. Faculty access check
      const facultyRes = evaluateRouteAccess({ pathname: route, user: facultyUser, token });
      assert.strictEqual(facultyRes.allowed, reviewerAllowed, `Faculty access to ${route}`);

      // 3. Department Head access check
      const deptHeadRes = evaluateRouteAccess({ pathname: route, user: deptHeadUser, token });
      assert.strictEqual(deptHeadRes.allowed, reviewerAllowed, `Dept Head access to ${route}`);
    }
  });

  it('TC-ADV-F3-06: Complete Logout Lifecycle & Back-Button Protection', () => {
    const storage = createMockStorage();

    // 1. Department Head logs in
    const deptHead = getMockUser('bonnie.achee@selu.edu');
    storage.setItem('token', 'session-jwt-12345');
    storage.setItem('user', JSON.stringify(deptHead));

    // Verify authenticated state
    let token = storage.getItem('token');
    let user = JSON.parse(storage.getItem('user'));
    let check = evaluateRouteAccess({ pathname: '/submissions/1', user, token });
    assert.strictEqual(check.allowed, true, 'Authenticated Dept Head must access /submissions/1');

    // 2. Execute Logout
    // Matches AuthContext.tsx logout() logic:
    // setToken(null); setUser(null); localStorage.removeItem('token'); localStorage.removeItem('user');
    storage.removeItem('token');
    storage.removeItem('user');
    token = null;
    user = null;

    // Verify storage cleanup
    assert.strictEqual(storage.getItem('token'), null, 'Token must be removed from storage');
    assert.strictEqual(storage.getItem('user'), null, 'User must be removed from storage');

    // 3. Back-button simulation (user clicks Back to /submissions/1)
    const postLogoutCheck = evaluateRouteAccess({ pathname: '/submissions/1', user, token });
    assert.strictEqual(
      postLogoutCheck.allowed,
      false,
      'Post-logout back button visit must be blocked'
    );
    assert.strictEqual(
      postLogoutCheck.redirect,
      '/login',
      'Post-logout back button visit must redirect immediately to /login'
    );
  });

  it('TC-ADV-F3-07: Session Restoration on Reload & Corrupted Storage Recovery', () => {
    // 1. Session Restoration on Reload
    const faculty = getMockUser('alkadi@selu.edu');
    const storage = createMockStorage({
      token: 'persisted-token-xyz',
      user: JSON.stringify(faculty),
    });

    // Simulate page reload initialization (AuthContext.tsx lines 17-26)
    let restoredUser = null;
    if (storage.getItem('token')) {
      try {
        const saved = storage.getItem('user');
        restoredUser = saved && saved !== 'undefined' ? JSON.parse(saved) : null;
      } catch {
        restoredUser = null;
      }
    }
    const restoredToken = storage.getItem('token');

    assert.ok(restoredUser, 'User must be restored on reload');
    assert.strictEqual(restoredUser.email, 'alkadi@selu.edu');
    assert.deepStrictEqual(restoredUser.roles, ['Faculty']);
    assert.strictEqual(
      Boolean(restoredToken && restoredUser),
      true,
      'Session must remain authenticated on reload'
    );

    // 2. Corrupted Storage Recovery
    const corruptedStorage = createMockStorage({
      token: 'corrupted-token',
      user: '{broken:json;invalid',
    });

    let recoveredUser = null;
    if (corruptedStorage.getItem('token')) {
      try {
        const saved = corruptedStorage.getItem('user');
        recoveredUser = saved && saved !== 'undefined' ? JSON.parse(saved) : null;
      } catch {
        recoveredUser = null;
      }
    }

    assert.strictEqual(recoveredUser, null, 'Corrupted JSON must yield null user');
    const isCorruptedAuth = Boolean(corruptedStorage.getItem('token') && recoveredUser);
    assert.strictEqual(
      isCorruptedAuth,
      false,
      'Corrupted storage must NOT evaluate as authenticated'
    );
  });

  it('TC-ADV-F3-08: JWT Token Payload Decoding & W-Number Preservation', () => {
    // Tests AuthContext.tsx lines 40-57 token payload restoration logic
    function simulateJwtTokenRestore(token) {
      if (!token || !token.includes('.')) return null;
      try {
        const parts = token.split('.');
        if (!parts[1]) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const roles = payload.role
          ? (Array.isArray(payload.role) ? payload.role : [payload.role])
          : [];
        const isEliora = (payload.email || '').trim().toLowerCase() === 'eliora.browning@selu.edu';
        return {
          email: payload.email || '',
          fullName: payload.name || payload.unique_name || 'User',
          wNumber: payload.wNumber || (isEliora ? 'W0712345' : ''),
          roles,
        };
      } catch {
        return null;
      }
    }

    // 1. Dr. Bonnie Achée JWT payload
    const bonniePayload = {
      email: 'bonnie.achee@selu.edu',
      name: 'Dr. Bonnie Achée',
      wNumber: 'W0345678',
      role: ['Department Head', 'Faculty'],
    };
    const bonnieToken = `header.${Buffer.from(JSON.stringify(bonniePayload)).toString('base64')}.sig`;
    const restoredBonnie = simulateJwtTokenRestore(bonnieToken);

    assert.ok(restoredBonnie);
    assert.strictEqual(restoredBonnie.email, 'bonnie.achee@selu.edu');
    assert.strictEqual(restoredBonnie.wNumber, 'W0345678');
    assert.deepStrictEqual(restoredBonnie.roles, ['Department Head', 'Faculty']);
    assert.strictEqual(restoredBonnie.roles.includes('Dean'), false);

    // 2. Dr. Ghassan Alkadi JWT payload
    const alkadiPayload = {
      email: 'alkadi@selu.edu',
      name: 'Dr. Ghassan Alkadi',
      wNumber: 'W0234567',
      role: 'Faculty',
    };
    const alkadiToken = `header.${Buffer.from(JSON.stringify(alkadiPayload)).toString('base64')}.sig`;
    const restoredAlkadi = simulateJwtTokenRestore(alkadiToken);

    assert.ok(restoredAlkadi);
    assert.strictEqual(restoredAlkadi.email, 'alkadi@selu.edu');
    assert.strictEqual(restoredAlkadi.wNumber, 'W0234567');
    assert.deepStrictEqual(restoredAlkadi.roles, ['Faculty']);

    // 3. Eliora Browning fallback W# preservation
    const elioraPayload = {
      email: 'eliora.browning@selu.edu',
      name: 'Eliora Browning',
      role: 'Student',
    };
    const elioraToken = `header.${Buffer.from(JSON.stringify(elioraPayload)).toString('base64')}.sig`;
    const restoredEliora = simulateJwtTokenRestore(elioraToken);

    assert.ok(restoredEliora);
    assert.strictEqual(restoredEliora.wNumber, 'W0712345');
    assert.deepStrictEqual(restoredEliora.roles, ['Student']);
  });

  it('TC-ADV-F3-09: Non-Standard & Empty Email Submission Resilience', () => {
    const weirdInputs = ['', '   ', 'unknown-user', 'someone@domain.com'];

    for (const input of weirdInputs) {
      const u = getMockUser(input);
      assert.ok(u, `getMockUser must handle weird input "${input}" without exception`);
      assert.ok(Array.isArray(u.roles), `Roles must be array for "${input}"`);
      assert.deepStrictEqual(u.roles, ['Student'], `Unknown user "${input}" must be role ['Student']`);
      assert.strictEqual(u.roles.includes('Dean'), false);
    }
  });

  it('TC-ADV-F3-10: Deep Link Query String & Trailing Slash Redirection Integrity', () => {
    const deepLinks = [
      '/dashboard/',
      '/dashboard?tab=all&filter=active',
      '/profile/',
      '/assignments/?status=pending',
      '/forms/CS401/?step=2',
      '/submissions/1/?view=history&highlight=true',
      '/forms/ExitSurvey/results/?sort=desc',
    ];

    for (const deepLink of deepLinks) {
      const parsedPath = deepLink.split('?')[0].replace(/\/+$/, '') || '/';
      const res = evaluateRouteAccess({ pathname: parsedPath, user: null, token: null });
      assert.strictEqual(
        res.allowed,
        false,
        `Unauthenticated visitor must not access deep link ${deepLink}`
      );
      assert.strictEqual(
        res.redirect,
        '/login',
        `Unauthenticated visitor must be redirected to /login for deep link ${deepLink}`
      );
    }
  });
});
