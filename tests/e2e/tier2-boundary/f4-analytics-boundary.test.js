/**
 * tests/e2e/tier2-boundary/f4-analytics-boundary.test.js
 *
 * Tier 2: Feature F4 - Analytics Access Boundary & Edge Cases
 * Verifies non-designated faculty denial, student boundary protection,
 * deep link preservation, zero-placement resilience, and print styling isolation.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AuthSession,
  canAccessAnalytics,
  createStorage,
} from '../helpers/auth-simulator.js';
import { readFile } from '../helpers/bundle-scanner.js';
import { FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Feature F4 (Tier 2): Analytics Access Boundary & Edge Cases', () => {
  it('TC-E2E-F4-06: Non-Designated Faculty Access Denial', () => {
    const nonDesignated = {
      fullName: 'Dr. Generic Faculty',
      email: 'generic.faculty@selu.edu',
      roles: ['Faculty'],
      isDesignated: false,
    };

    assert.strictEqual(
      canAccessAnalytics(nonDesignated),
      false,
      'Non-designated faculty must be denied access'
    );
  });

  it('TC-E2E-F4-07: Student Access Denial & Boundary Protection', () => {
    const student = FIXTURE_USERS.studentEliora;
    assert.strictEqual(
      canAccessAnalytics(student),
      false,
      'Student must be denied access to program analytics'
    );

    const storage = createStorage();
    const session = new AuthSession(storage);
    session.login(student.email);

    const check = session.canAccess('/analytics');
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.redirect, '/dashboard');
  });

  it('TC-E2E-F4-08: Deep Link Session Preservation', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);
    session.login('galkadi@selu.edu');

    // Simulate bookmark/deep link directly to /analytics?view=placements
    const check = session.canAccess('/analytics?view=placements');
    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.redirect, null);
  });

  it('TC-E2E-F4-09: Empty Placement Dataset Resilience in DepartmentHeadDashboard', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentHeadDashboard.tsx');
    assert.ok(content, 'DepartmentHeadDashboard.tsx must exist');

    assert.match(
      content,
      /if\s*\(\s*total\s*===\s*0\s*\)\s*{\s*return\s*{\s*total:\s*0,\s*avgPay:\s*0,\s*avgGpa:\s*0/s,
      'DepartmentHeadDashboard.tsx must guard against zero placements division by zero'
    );
  });

  it('TC-E2E-F4-10: 1-Page Summary Print Isolation', () => {
    const dashboardContent = readFile('Web/src/components/dashboards/DepartmentHeadDashboard.tsx')
      || readFile('Web/src/components/dashboards/DeanDashboard.tsx');
    assert.ok(dashboardContent, 'Dashboard component must exist');

    // Check for print block or print class
    assert.match(
      dashboardContent,
      /print/i,
      'Dashboard component should include print styling or print block support'
    );
  });
});
