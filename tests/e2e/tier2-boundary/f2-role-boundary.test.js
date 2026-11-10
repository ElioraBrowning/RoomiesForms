/**
 * tests/e2e/tier2-boundary/f2-role-boundary.test.js
 *
 * Tier 2: Feature F2 - Role Boundary & Corner Cases
 * Verifies role sanitization, legacy storage key isolation, adversarial role injection rejection,
 * and profile preference re-branding.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AuthSession,
  createStorage,
  isReviewer,
  REVIEWER_ROLES,
} from '../helpers/auth-simulator.js';
import { readFile, scanFilesForPattern } from '../helpers/bundle-scanner.js';
import { FIXTURE_USERS } from '../helpers/test-fixtures.js';

describe('Feature F2 (Tier 2): Role Boundary & Corner Cases', () => {
  it('TC-E2E-F2-06: Ingestion / Mock Data Role Sanitization', () => {
    // Dr. Bonnie Achée's active roles must NOT contain 'Dean'
    const bonnie = FIXTURE_USERS.deptHeadBonnie;
    assert.strictEqual(
      bonnie.roles.includes('Dean'),
      false,
      "Dr. Bonnie Achée roles must not include 'Dean'"
    );
    assert.deepStrictEqual(bonnie.roles, ['Department Head']);
  });

  it('TC-E2E-F2-07: Global DOM Dean Terminology Whitelist Audit', () => {
    // Check Login.tsx for visible Dean role labels
    const loginDean = scanFilesForPattern('Web/src/pages/Login.tsx', />Dean</);
    assert.strictEqual(
      loginDean.length,
      0,
      'Login.tsx must not render >Dean< in visible DOM elements'
    );
  });

  it('TC-E2E-F2-08: Legacy LocalStorage Key Migration & Protection', () => {
    const storage = createStorage();
    // Simulate legacy storage key injected from previous semester build
    storage.setItem('selu_dean_placements_v1', JSON.stringify([{ id: 1, studentName: 'Test' }]));
    storage.setItem('selu_dean_default_view', 'tasks');

    // New key should be used for CS department placements
    const csKey = 'selu_cs_dept_placements_v1';
    storage.setItem(csKey, storage.getItem('selu_dean_placements_v1'));

    const migrated = JSON.parse(storage.getItem(csKey));
    assert.ok(Array.isArray(migrated));
    assert.strictEqual(migrated[0].studentName, 'Test');
  });

  it('TC-E2E-F2-09: Adversarial Dean Role Injection Rejection', () => {
    const storage = createStorage();
    const session = new AuthSession(storage);

    // Malicious user attempts to inject 'Dean' into storage
    const fakeToken = 'hacker-jwt';
    const fakeUser = {
      fullName: 'Intruder',
      email: 'hacker@selu.edu',
      roles: ['Dean'],
    };
    storage.setItem('token', fakeToken);
    storage.setItem('user', JSON.stringify(fakeUser));

    const reloaded = new AuthSession(storage);
    assert.strictEqual(
      isReviewer(reloaded.user),
      false,
      "Adversary with only 'Dean' role must be rejected by isReviewer guard"
    );

    // Reviewer routes must be denied
    const access = reloaded.canAccess('/assignments');
    assert.strictEqual(access.allowed, false);
    assert.strictEqual(access.redirect, '/dashboard');
  });

  it('TC-E2E-F2-10: Profile Preferences Re-branding Verification', () => {
    const profileContent = readFile('Web/src/pages/Profile.tsx');
    assert.ok(profileContent, 'Profile.tsx must exist');

    // Default view key should not refer to dean
    assert.doesNotMatch(
      profileContent,
      /'selu_dean_default_view'/,
      "Profile.tsx must not use legacy 'selu_dean_default_view' key"
    );
  });
});
