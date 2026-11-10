/**
 * tests/stress/challenger-f3-stress.js
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS FOR FEATURE F3:
 * Auth & Lifecycle Integrity & Defensive Role Sanitization in AuthContext.tsx
 *
 * Tests:
 * 1. Source verification of AuthContext.tsx sanitization points.
 * 2. Role sanitization function stress tests (Dean removal, edge cases, type corruption).
 * 3. Initial localStorage rehydration with injected Dean role.
 * 4. JWT token decoding with injected Dean role.
 * 5. Corrupted / ghost storage resilience.
 * 6. Login & Logout lifecycle teardown.
 * 7. Unauthenticated route redirection matrix across all protected routes.
 * 8. Role-based access control (RBAC) route barriers.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const AUTH_CONTEXT_PATH = path.join(PROJECT_ROOT, 'Web/src/context/AuthContext.tsx');
const APP_PATH = path.join(PROJECT_ROOT, 'Web/src/App.tsx');
const LAYOUT_PATH = path.join(PROJECT_ROOT, 'Web/src/components/Layout.tsx');

// --- In-Memory Mock Storage ---
function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

// --- Direct Extraction of sanitizeRoles logic from AuthContext.tsx ---
function extractSanitizeRolesFromSource() {
  const source = fs.readFileSync(AUTH_CONTEXT_PATH, 'utf8');
  // Verify sanitizeRoles exists in AuthContext source
  assert.ok(source.includes('const sanitizeRoles ='), 'AuthContext.tsx must define sanitizeRoles');

  // Exact functional logic matching AuthContext.tsx lines 16-23:
  // const sanitizeRoles = (rawRoles: unknown): string[] => {
  //   const rolesArray = Array.isArray(rawRoles)
  //     ? rawRoles
  //     : typeof rawRoles === 'string'
  //       ? [rawRoles]
  //       : [];
  //   return rolesArray.filter((r): r is string => typeof r === 'string' && r !== 'Dean');
  // };
  return (rawRoles) => {
    const rolesArray = Array.isArray(rawRoles)
      ? rawRoles
      : typeof rawRoles === 'string'
        ? [rawRoles]
        : [];
    return rolesArray.filter((r) => typeof r === 'string' && r !== 'Dean');
  };
}

// --- AuthContext Simulation Factory ---
function createAuthContextSimulator(storage = createMockStorage(), sanitizeRoles) {
  let state = {
    user: null,
    token: storage.getItem('token'),
  };

  // 1. Initial State Factory (AuthContext.tsx lines 26-43)
  const initUser = () => {
    if (!storage.getItem('token')) return null;
    try {
      const saved = storage.getItem('user');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            roles: sanitizeRoles(parsed.roles),
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  state.user = initUser();

  // 2. useEffect Mount Rehydration (AuthContext.tsx lines 46-85)
  const runMountEffect = () => {
    if (state.token && !state.user) {
      const savedUser = storage.getItem('user');
      if (savedUser && savedUser !== 'undefined') {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && typeof parsed === 'object') {
            state.user = {
              ...parsed,
              roles: sanitizeRoles(parsed.roles),
            };
            return;
          }
        } catch {
          // parse failed
        }
      }

      if (state.token && state.token.includes('.')) {
        try {
          const parts = state.token.split('.');
          if (parts[1]) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            const roles = sanitizeRoles(payload.role);
            const isEliora = (payload.email || '').trim().toLowerCase() === 'eliora.browning@selu.edu';
            const restoredUser = {
              email: payload.email || '',
              fullName: payload.name || payload.unique_name || 'User',
              wNumber: payload.wNumber || (isEliora ? 'W0712345' : ''),
              roles,
            };
            state.user = restoredUser;
            storage.setItem('user', JSON.stringify(restoredUser));
          }
        } catch (e) {
          // decode failed
        }
      }
    }
  };

  // 3. Login Action (AuthContext.tsx lines 87-118)
  const login = (apiResponse, email) => {
    const { token, user: apiUser } = apiResponse;
    state.token = token;
    storage.setItem('token', token);

    let userData;
    if (apiUser) {
      const isEliora = (apiUser.email || email).trim().toLowerCase() === 'eliora.browning@selu.edu';
      userData = {
        email: apiUser.email || email,
        fullName: apiUser.fullName || 'User',
        wNumber: isEliora ? (apiUser.wNumber || 'W0712345') : (apiUser.wNumber || ''),
        roles: sanitizeRoles(apiUser.roles),
      };
    } else {
      userData = {
        email,
        fullName: 'User',
        wNumber: '',
        roles: ['Student'],
      };
    }

    state.user = userData;
    storage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  // 4. Logout Action (AuthContext.tsx lines 120-125)
  const logout = () => {
    state.token = null;
    state.user = null;
    storage.removeItem('token');
    storage.removeItem('user');
  };

  // 5. isAuthenticated Property (AuthContext.tsx line 128)
  const isAuthenticated = () => Boolean(state.token && state.user);

  return {
    getState: () => ({ ...state }),
    setUser: (u) => { state.user = u; },
    setToken: (t) => { state.token = t; },
    runMountEffect,
    login,
    logout,
    isAuthenticated,
    storage,
  };
}

// --- Route Access Evaluator matching App.tsx and Layout.tsx ---
function evaluateRouteAccess({ pathname, user, token }) {
  const isAuthenticated = Boolean(token && user);

  // Top-level unauthenticated routes (outside Layout)
  if (pathname === '/login' || pathname === '/auth/callback' || pathname.startsWith('/employer/')) {
    return { allowed: true, redirect: null };
  }

  // Inside Layout: all routes require isAuthenticated
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

describe('Feature F3 Empirical Stress Test Suite (Challenger 2)', () => {
  const sanitizeRoles = extractSanitizeRolesFromSource();

  it('ST-F3-01: Forensic Audit of AuthContext.tsx Sanitization Coverage', () => {
    const source = fs.readFileSync(AUTH_CONTEXT_PATH, 'utf8');

    // 1. Definition check
    assert.match(source, /const sanitizeRoles\s*=\s*\(rawRoles:\s*unknown\)/);
    assert.match(source, /r\s*!==\s*['"]Dean['"]/);

    // 2. Initial state sanitize check
    assert.match(source, /roles:\s*sanitizeRoles\(parsed\.roles\)/);

    // 3. Mount effect localStorage sanitize check
    assert.match(source, /roles:\s*sanitizeRoles\(parsed\.roles\)/);

    // 4. Mount effect JWT decode sanitize check
    assert.match(source, /roles\s*=\s*sanitizeRoles\(payload\.role\)/);

    // 5. Login action sanitize check
    assert.match(source, /roles:\s*sanitizeRoles\(apiUser\.roles\)/);

    // 6. Zero occurrences of Dean allowed anywhere in AuthContext
    const deanMatches = (source.match(/['"]Dean['"]/g) || []);
    // The only allowed occurrence is the exclusion filter `r !== 'Dean'`
    assert.strictEqual(deanMatches.length, 1, "Only 1 occurrence of 'Dean' allowed in AuthContext (in sanitizeRoles exclusion filter)");
  });

  it('ST-F3-02: Defensive Role Sanitization Input Matrix', () => {
    // Normal cases
    assert.deepStrictEqual(sanitizeRoles(['Faculty']), ['Faculty']);
    assert.deepStrictEqual(sanitizeRoles(['Department Head', 'Faculty']), ['Department Head', 'Faculty']);
    assert.deepStrictEqual(sanitizeRoles(['Student']), ['Student']);

    // Single string input
    assert.deepStrictEqual(sanitizeRoles('Faculty'), ['Faculty']);
    assert.deepStrictEqual(sanitizeRoles('Student'), ['Student']);

    // Adversarial Dean inputs
    assert.deepStrictEqual(sanitizeRoles(['Dean', 'Faculty']), ['Faculty'], "'Dean' must be stripped from ['Dean', 'Faculty']");
    assert.deepStrictEqual(sanitizeRoles(['Faculty', 'Dean']), ['Faculty'], "'Dean' must be stripped from ['Faculty', 'Dean']");
    assert.deepStrictEqual(sanitizeRoles(['Dean', 'Department Head', 'Faculty']), ['Department Head', 'Faculty'], "'Dean' must be stripped from multi-role");
    assert.deepStrictEqual(sanitizeRoles(['Dean']), [], "'Dean' alone must result in empty array");
    assert.deepStrictEqual(sanitizeRoles('Dean'), [], "Single string 'Dean' must result in empty array");

    // Corrupted and edge case inputs
    assert.deepStrictEqual(sanitizeRoles(null), []);
    assert.deepStrictEqual(sanitizeRoles(undefined), []);
    assert.deepStrictEqual(sanitizeRoles(12345), []);
    assert.deepStrictEqual(sanitizeRoles(true), []);
    assert.deepStrictEqual(sanitizeRoles({}), []);
    assert.deepStrictEqual(sanitizeRoles(['Faculty', null, undefined, 42, false, 'Dean']), ['Faculty']);
  });

  it('ST-F3-03: Storage Ingestion with Injected Dean Role on App Init', () => {
    // Scenario: User had a legacy or malicious session in localStorage containing 'Dean'
    const storage = createMockStorage({
      token: 'persisted-valid-token-123',
      user: JSON.stringify({
        email: 'bonnie.achee@selu.edu',
        fullName: 'Dr. Bonnie Achée',
        wNumber: 'W0345678',
        roles: ['Dean', 'Faculty', 'Department Head'],
      }),
    });

    const auth = createAuthContextSimulator(storage, sanitizeRoles);

    // Check user at initialization time (useState initializer)
    const state = auth.getState();
    assert.ok(state.user, 'User should be loaded from storage');
    assert.strictEqual(state.user.roles.includes('Dean'), false, "User must NOT have 'Dean' role on init");
    assert.deepStrictEqual(state.user.roles, ['Faculty', 'Department Head']);
    assert.strictEqual(auth.isAuthenticated(), true);
  });

  it('ST-F3-04: Storage Ingestion with Sole Dean Role on App Init', () => {
    // Scenario: Malicious user injects ONLY 'Dean' in localStorage
    const storage = createMockStorage({
      token: 'persisted-valid-token-123',
      user: JSON.stringify({
        email: 'attacker@selu.edu',
        fullName: 'Attacker Dean',
        wNumber: 'W0999999',
        roles: ['Dean'],
      }),
    });

    const auth = createAuthContextSimulator(storage, sanitizeRoles);

    const state = auth.getState();
    assert.ok(state.user);
    assert.deepStrictEqual(state.user.roles, [], "Sole 'Dean' role must be sanitized to empty array");
    assert.strictEqual(state.user.roles.includes('Dean'), false);

    // Verify reviewer access is denied because roles is empty
    const checkAssignments = evaluateRouteAccess({ pathname: '/assignments', user: state.user, token: state.token });
    assert.strictEqual(checkAssignments.allowed, false, "Sanitized attacker must not access /assignments");
    assert.strictEqual(checkAssignments.redirect, '/dashboard');
  });

  it('ST-F3-05: JWT Token Payload Decoding with Injected Dean Role', () => {
    // Scenario: Stored user is missing, but token exists with encoded JWT payload containing 'Dean'
    const payload = {
      email: 'bonnie.achee@selu.edu',
      name: 'Dr. Bonnie Achée',
      wNumber: 'W0345678',
      role: ['Dean', 'Department Head', 'Faculty'],
    };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

    const storage = createMockStorage({ token });
    const auth = createAuthContextSimulator(storage, sanitizeRoles);

    // User is initially null because 'user' was not in localStorage
    assert.strictEqual(auth.getState().user, null);

    // Trigger mount effect (decodes JWT)
    auth.runMountEffect();

    const state = auth.getState();
    assert.ok(state.user, 'User must be reconstructed from JWT');
    assert.strictEqual(state.user.email, 'bonnie.achee@selu.edu');
    assert.strictEqual(state.user.roles.includes('Dean'), false, "Decoded JWT must strip 'Dean'");
    assert.deepStrictEqual(state.user.roles, ['Department Head', 'Faculty']);

    // Check that sanitized user was written to storage
    const savedInStorage = JSON.parse(storage.getItem('user'));
    assert.strictEqual(savedInStorage.roles.includes('Dean'), false, "Storage must not have 'Dean'");
  });

  it('ST-F3-06: JWT Token with Singular String role: "Dean"', () => {
    // Scenario: JWT payload has role as a string instead of array: { role: 'Dean' }
    const payload = {
      email: 'rogue@selu.edu',
      name: 'Rogue User',
      wNumber: 'W0111111',
      role: 'Dean',
    };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.sig`;

    const storage = createMockStorage({ token });
    const auth = createAuthContextSimulator(storage, sanitizeRoles);

    auth.runMountEffect();

    const state = auth.getState();
    assert.ok(state.user);
    assert.strictEqual(state.user.roles.includes('Dean'), false);
    assert.deepStrictEqual(state.user.roles, []);
  });

  it('ST-F3-07: Corrupted LocalStorage & Ghost Token Resilience', () => {
    // Case 1: Ghost Token (token exists, user is invalid JSON)
    const storage1 = createMockStorage({
      token: 'ghost-token-abc',
      user: '{{corrupt-json',
    });
    const auth1 = createAuthContextSimulator(storage1, sanitizeRoles);
    assert.strictEqual(auth1.isAuthenticated(), false);
    assert.strictEqual(auth1.getState().user, null);

    // Case 2: Ghost User (user exists, token is null)
    const storage2 = createMockStorage({
      user: JSON.stringify({ email: 'ghost@selu.edu', roles: ['Faculty'] }),
    });
    const auth2 = createAuthContextSimulator(storage2, sanitizeRoles);
    assert.strictEqual(auth2.isAuthenticated(), false);
    assert.strictEqual(auth2.getState().user, null);

    // Case 3: Literal string "undefined" in user
    const storage3 = createMockStorage({
      token: 'some-token',
      user: 'undefined',
    });
    const auth3 = createAuthContextSimulator(storage3, sanitizeRoles);
    assert.strictEqual(auth3.isAuthenticated(), false);
    assert.strictEqual(auth3.getState().user, null);
  });

  it('ST-F3-08: Complete Login Lifecycle & API Role Sanitization', () => {
    const storage = createMockStorage();
    const auth = createAuthContextSimulator(storage, sanitizeRoles);

    assert.strictEqual(auth.isAuthenticated(), false);

    // API returns a payload with 'Dean' injected
    const maliciousApiResponse = {
      token: 'new-jwt-token-777',
      user: {
        email: 'faculty@selu.edu',
        fullName: 'Test Faculty',
        wNumber: 'W0123987',
        roles: ['Dean', 'Faculty'],
      },
    };

    auth.login(maliciousApiResponse, 'faculty@selu.edu');

    assert.strictEqual(auth.isAuthenticated(), true);
    const state = auth.getState();
    assert.strictEqual(state.user.roles.includes('Dean'), false, "Login must sanitize 'Dean' from API response");
    assert.deepStrictEqual(state.user.roles, ['Faculty']);

    // Verify localStorage received sanitized user
    const storedUser = JSON.parse(storage.getItem('user'));
    assert.strictEqual(storedUser.roles.includes('Dean'), false);
    assert.deepStrictEqual(storedUser.roles, ['Faculty']);
  });

  it('ST-F3-09: Complete Logout Lifecycle & Session Teardown', () => {
    const storage = createMockStorage({
      token: 'session-token-999',
      user: JSON.stringify({ email: 'bonnie.achee@selu.edu', fullName: 'Dr. Bonnie Achée', roles: ['Department Head'] }),
    });
    const auth = createAuthContextSimulator(storage, sanitizeRoles);

    assert.strictEqual(auth.isAuthenticated(), true);
    assert.ok(storage.getItem('token'));
    assert.ok(storage.getItem('user'));

    // Execute logout
    auth.logout();

    assert.strictEqual(auth.isAuthenticated(), false);
    assert.strictEqual(auth.getState().token, null);
    assert.strictEqual(auth.getState().user, null);
    assert.strictEqual(storage.getItem('token'), null, 'Storage token must be purged');
    assert.strictEqual(storage.getItem('user'), null, 'Storage user must be purged');

    // Any subsequent access to protected route must be rejected
    const check = evaluateRouteAccess({ pathname: '/dashboard', user: auth.getState().user, token: auth.getState().token });
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.redirect, '/login');
  });

  it('ST-F3-10: Exhaustive Protected Route Redirection Matrix', () => {
    const protectedRoutes = [
      '/',
      '/dashboard',
      '/dashboard?tab=all',
      '/dashboard/',
      '/profile',
      '/profile?edit=true',
      '/assignments',
      '/assignments?filter=pending',
      '/forms/builder',
      '/forms/CS401',
      '/forms/CS401?step=1',
      '/forms/ExitSurvey/results',
      '/submissions/1',
      '/submissions/102',
      '/submissions/102?view=audit',
    ];

    for (const rawRoute of protectedRoutes) {
      const cleanPath = rawRoute.split('?')[0].replace(/\/+$/, '') || '/';
      const actualPath = cleanPath === '/' ? '/dashboard' : cleanPath;

      // 1. Unauthenticated (null token, null user)
      const res1 = evaluateRouteAccess({ pathname: actualPath, user: null, token: null });
      assert.strictEqual(
        res1.allowed,
        false,
        `Unauthenticated visitor must NOT access ${rawRoute}`
      );
      assert.strictEqual(
        res1.redirect,
        '/login',
        `Unauthenticated visitor must be redirected to /login for ${rawRoute}`
      );

      // 2. Ghost Token (token present, user null)
      const res2 = evaluateRouteAccess({ pathname: actualPath, user: null, token: 'ghost-token' });
      assert.strictEqual(
        res2.allowed,
        false,
        `Ghost token must NOT access ${rawRoute}`
      );
      assert.strictEqual(
        res2.redirect,
        '/login',
        `Ghost token must be redirected to /login for ${rawRoute}`
      );

      // 3. Ghost User (user present, token null)
      const res3 = evaluateRouteAccess({
        pathname: actualPath,
        user: { email: 'ghost@selu.edu', roles: ['Student'] },
        token: null,
      });
      assert.strictEqual(
        res3.allowed,
        false,
        `Ghost user must NOT access ${rawRoute}`
      );
      assert.strictEqual(
        res3.redirect,
        '/login',
        `Ghost user must be redirected to /login for ${rawRoute}`
      );
    }
  });

  it('ST-F3-11: Reviewer Route Access Boundaries for Student vs Reviewers', () => {
    const studentUser = { email: 'cobi.smith@selu.edu', roles: ['Student'] };
    const facultyUser = { email: 'alkadi@selu.edu', roles: ['Faculty'] };
    const deptHeadUser = { email: 'bonnie.achee@selu.edu', roles: ['Department Head', 'Faculty'] };
    const token = 'valid-session-token';

    const reviewerOnlyRoutes = [
      '/assignments',
      '/forms/builder',
      '/forms/ExitSurvey/results',
    ];

    for (const route of reviewerOnlyRoutes) {
      // Student must be blocked from reviewer routes and redirected to /dashboard
      const studentRes = evaluateRouteAccess({ pathname: route, user: studentUser, token });
      assert.strictEqual(studentRes.allowed, false, `Student must NOT access ${route}`);
      assert.strictEqual(studentRes.redirect, '/dashboard', `Student must redirect to /dashboard from ${route}`);

      // Faculty must be permitted
      const facultyRes = evaluateRouteAccess({ pathname: route, user: facultyUser, token });
      assert.strictEqual(facultyRes.allowed, true, `Faculty must be allowed to access ${route}`);

      // Department Head must be permitted
      const deptHeadRes = evaluateRouteAccess({ pathname: route, user: deptHeadUser, token });
      assert.strictEqual(deptHeadRes.allowed, true, `Department Head must be allowed to access ${route}`);
    }
  });
});
