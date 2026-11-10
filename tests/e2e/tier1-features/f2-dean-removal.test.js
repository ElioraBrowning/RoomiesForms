/**
 * tests/e2e/tier1-features/f2-dean-removal.test.js
 *
 * Tier 1: Feature F2 - Dean Role & Terminology Removal
 * Verifies that all Dean roles, quick login badges, letterheads, navigation references,
 * and review workflows are stripped and scoped strictly to CS Department Head.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  auditDeanReferences,
  readFile,
  scanFilesForPattern,
} from '../helpers/bundle-scanner.js';
import { REVIEWER_ROLES } from '../helpers/auth-simulator.js';

describe('Feature F2 (Tier 1): Dean Role & Terminology Removal', () => {
  it('TC-E2E-F2-01: Demo Quick-Login Badge Department Head Scoping', () => {
    const loginContent = readFile('Web/src/pages/Login.tsx');
    assert.ok(loginContent, 'Login.tsx must exist');

    // Run auditDeanReferences on Login.tsx
    const loginDeanMatches = auditDeanReferences('Web/src/pages/Login.tsx');
    assert.strictEqual(
      loginDeanMatches.length,
      0,
      'Login.tsx must contain zero Dean references'
    );

    // Must have quick login for Bonnie Achée
    assert.match(
      loginContent,
      /bonnie\.achee/i,
      'Login.tsx must contain quick login for Dr. Bonnie Achée'
    );

    // Badge text must be Department Head, not Dean
    const matches = scanFilesForPattern('Web/src/pages/Login.tsx', /login-quick-role/);
    assert.ok(matches.length > 0, 'Login.tsx must render quick login roles');

    // Confirm no quick role button says "Dean"
    const deanQuickRoles = scanFilesForPattern('Web/src/pages/Login.tsx', /<span className="login-quick-role">Dean<\/span>/i);
    assert.strictEqual(
      deanQuickRoles.length,
      0,
      'Login.tsx must not contain any <span className="login-quick-role">Dean</span> badge'
    );

    // Confirm Department Head badge is rendered
    const deptHeadQuickRoles = scanFilesForPattern('Web/src/pages/Login.tsx', /login-quick-role.*Department Head/i);
    assert.ok(
      deptHeadQuickRoles.length > 0,
      'Login.tsx must render <span className="login-quick-role">Department Head</span>'
    );
  });

  it('TC-E2E-F2-02: Department Head Dashboard Main Letterhead Scoping', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentHeadDashboard.tsx')
      || readFile('Web/src/components/dashboards/DeanDashboard.tsx');
    assert.ok(content, 'Department Head dashboard component must exist');

    // Must contain CS Department header
    assert.match(
      content,
      /Department of Computer Science/i,
      'Dashboard letterhead must reference Department of Computer Science'
    );
    assert.match(
      content,
      /Office of the Department Head/i,
      'Dashboard letterhead must reference Office of the Department Head'
    );

    // Must NOT contain Office of the Dean
    assert.doesNotMatch(
      content,
      /Office of the Dean/i,
      'Dashboard letterhead must not reference Office of the Dean'
    );
  });

  it('TC-E2E-F2-03: Print Summary Letterhead Scoping', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentHeadDashboard.tsx')
      || readFile('Web/src/components/dashboards/DeanDashboard.tsx');
    assert.ok(content, 'Dashboard component must exist');

    // Check print letterhead does not refer to College of Science & Technology · Office of the Dean
    assert.doesNotMatch(
      content,
      /College of Science & Technology\s*·\s*Office of the Dean/i,
      'Print letterhead must not contain College of Science & Technology · Office of the Dean'
    );
  });

  it('TC-E2E-F2-04: Navigation Bar & Reviewer Role Segregation', () => {
    const appContent = readFile('Web/src/App.tsx');
    const layoutContent = readFile('Web/src/components/Layout.tsx');
    assert.ok(appContent && layoutContent, 'App.tsx and Layout.tsx must exist');

    // In App.tsx, REVIEWER_ROLES must not contain 'Dean'
    assert.match(
      appContent,
      /REVIEWER_ROLES\s*=\s*\[.*'Faculty'.*'Department Head'.*\]/s,
      'App.tsx REVIEWER_ROLES must include Faculty and Department Head'
    );
    assert.doesNotMatch(
      appContent,
      /REVIEWER_ROLES\s*=\s*\[[^\]]*'Dean'[^\]]*\]/s,
      "App.tsx REVIEWER_ROLES must not include 'Dean'"
    );

    // In Layout.tsx, reviewer check must not include 'Dean'
    assert.doesNotMatch(
      layoutContent,
      /\['Faculty',\s*'Department Head',\s*'Dean'\]/,
      "Layout.tsx isReviewer must not include 'Dean'"
    );

    const layoutDeanMatches = auditDeanReferences('Web/src/components/Layout.tsx');
    assert.strictEqual(
      layoutDeanMatches.length,
      0,
      'Layout.tsx must contain zero Dean references'
    );

    // Auth simulator REVIEWER_ROLES must match
    assert.deepStrictEqual(
      REVIEWER_ROLES,
      ['Faculty', 'Department Head'],
      "REVIEWER_ROLES in test helpers must strictly be ['Faculty', 'Department Head']"
    );
  });

  it('TC-E2E-F2-05: Task Center Header & CMPS 400 Scoping', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx')
      || readFile('Web/src/components/dashboards/DeanTaskCenter.tsx');
    assert.ok(content, 'Task Center component must exist');

    // Header must reference Department of Computer Science or Task Center
    assert.match(
      content,
      /Task Center|Approvals/i,
      'Task center must reference Task Center or Approvals'
    );

    // Must not refer to Office of the Dean
    assert.doesNotMatch(
      content,
      /Office of the Dean/i,
      'Task center must not reference Office of the Dean'
    );
  });
});
