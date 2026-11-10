/**
 * tests/e2e/helpers/auth-simulator.js
 *
 * Simulates authentication state, role evaluation, session persistence,
 * and authorization guards in the Node.js test environment.
 */

import { FIXTURE_USERS } from './test-fixtures.js';

export const REVIEWER_ROLES = ['Faculty', 'Department Head'];

export const ROLE_EQUIVALENCE = {
  'Faculty Evaluator': ['Faculty', 'Faculty Evaluator'],
  'Department Head Authorization': ['Department Head', 'Department Head Authorization'],
  'Departmental Authorization': ['Department Head', 'Departmental Authorization'],
};

/**
 * Creates an in-memory storage simulating browser localStorage.
 */
export function createStorage(initial = {}) {
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

/**
 * Checks whether user's roles satisfy a required role according to equivalence mapping.
 */
export function matchesRole(userRoles = [], requiredRole = '') {
  if (!requiredRole) return false;
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
  if (roles.includes(requiredRole)) return true;
  const mapped = ROLE_EQUIVALENCE[requiredRole];
  if (mapped) {
    return mapped.some((r) => roles.includes(r));
  }
  return false;
}

/**
 * Evaluates whether a user has reviewer permissions.
 * Strictly verifies against REVIEWER_ROLES (Faculty, Department Head; NO Dean).
 */
export function isReviewer(user) {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((r) => REVIEWER_ROLES.includes(r));
}

/**
 * Evaluates whether a user can access the CS Placement Analytics view:
 * - CS Department Head (Dr. Bonnie Achée or 'Department Head' role)
 * - Designated CS Faculty (Dr. Ghassan Alkadi 'galkadi@selu.edu' or isDesignated)
 */
export function canAccessAnalytics(user) {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  const roles = user.roles || [];

  if (roles.includes('Department Head') || email === 'bonnie.achee@southeastern.edu') {
    return true;
  }
  if (email === 'galkadi@selu.edu' || user.isDesignated) {
    return true;
  }
  return false;
}

/**
 * Evaluates isMyTurn logic for a submission and current user.
 */
export function evaluateIsMyTurn(user, submission) {
  if (!user || !submission) return false;
  if (!isReviewer(user)) return false;
  if (submission.status !== 'Pending') return false;

  // Synthesize currentStep if missing
  const activeStep =
    submission.currentStep ||
    (submission.approvals &&
      submission.approvals.find(
        (a) => a.status === 'Pending Review' || (a.status !== 'Approved' && !a.actionDate && !a.approvedBy)
      ));

  const requiredRole = activeStep?.requiredRole?.name || activeStep?.roleName;

  if (requiredRole) {
    return matchesRole(user.roles, requiredRole);
  }

  // Fallback: if pending and user is reviewer
  return true;
}

/**
 * Simulates the AuthContext session lifecycle backed by a storage interface.
 */
export class AuthSession {
  constructor(storage = createStorage()) {
    this.storage = storage;
    this.token = this.storage.getItem('token');
    this.user = this._loadUser();
  }

  _loadUser() {
    const raw = this.storage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupted storage recovery: clear corrupted items
      this.storage.removeItem('token');
      this.storage.removeItem('user');
      return null;
    }
  }

  login(emailOrUser) {
    let userData;
    if (typeof emailOrUser === 'string') {
      const email = emailOrUser.toLowerCase().trim();
      userData = Object.values(FIXTURE_USERS).find((u) => u.email.toLowerCase() === email);
      if (!userData) {
        throw new Error(`User with email "${emailOrUser}" not found in fixtures`);
      }
    } else {
      userData = emailOrUser;
    }

    const token = `sim-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.token = token;
    this.user = { ...userData };

    this.storage.setItem('token', token);
    this.storage.setItem('user', JSON.stringify(this.user));
    return this.user;
  }

  logout() {
    this.token = null;
    this.user = null;
    this.storage.removeItem('token');
    this.storage.removeItem('user');
  }

  isAuthenticated() {
    return Boolean(this.token && this.user);
  }

  canAccess(route) {
    if (!this.isAuthenticated()) {
      return { allowed: false, redirect: '/login' };
    }

    const path = route.split('?')[0].replace(/\/+$/, '') || '/';

    if (path === '/assignments' || path === '/forms/builder') {
      if (!isReviewer(this.user)) {
        return { allowed: false, redirect: '/dashboard' };
      }
    }

    if (path === '/analytics') {
      if (!canAccessAnalytics(this.user)) {
        return { allowed: false, redirect: '/dashboard' };
      }
    }

    if (path.startsWith('/forms/') && path.endsWith('/results')) {
      if (!isReviewer(this.user)) {
        return { allowed: false, redirect: '/dashboard' };
      }
    }

    return { allowed: true, redirect: null };
  }
}
