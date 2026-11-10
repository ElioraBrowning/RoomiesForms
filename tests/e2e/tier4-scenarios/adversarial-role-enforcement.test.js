/**
 * tests/e2e/tier4-scenarios/adversarial-role-enforcement.test.js
 *
 * Tier 4 Scenario 4: Adversarial Role Enforcement & Client Storage Tampering
 * Security stress test simulating an adversary attempting client-side privilege escalation:
 * Dean role injection -> Tampered JWT -> Deep link traversal -> Git pollution attempt.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthSession, createStorage, isReviewer } from '../helpers/auth-simulator.js';
import { getGitStatus, testIgnoreRule } from '../helpers/git-inspector.js';

describe('Tier 4 Scenario 4: Adversarial Role Enforcement & Tampering', () => {
  it('Enforces strict security boundaries against role tampering and privilege escalation', () => {
    const storage = createStorage();

    // 1. Adversary injects fabricated user object with 'Dean' and 'SuperAdmin'
    const adversarialUser = {
      fullName: 'Malicious Actor',
      email: 'intruder@external.org',
      roles: ['Dean', 'SuperAdmin', 'System Administrator'],
    };
    storage.setItem('user', JSON.stringify(adversarialUser));
    storage.setItem('token', 'fabricated-bearer-token');

    const session = new AuthSession(storage);
    assert.strictEqual(session.isAuthenticated(), true);

    // Guard test: isReviewer must evaluate to FALSE because only ['Faculty', 'Department Head'] are recognized
    assert.strictEqual(
      isReviewer(session.user),
      false,
      "Adversary roles must not satisfy isReviewer guard"
    );

    // Deep link traversal to reviewer routes must be denied and redirected to /dashboard
    const assignmentsCheck = session.canAccess('/assignments');
    assert.strictEqual(assignmentsCheck.allowed, false);
    assert.strictEqual(assignmentsCheck.redirect, '/dashboard');

    const formBuilderCheck = session.canAccess('/forms/builder');
    assert.strictEqual(formBuilderCheck.allowed, false);
    assert.strictEqual(formBuilderCheck.redirect, '/dashboard');

    // 2. Adversary attempts to generate untracked script files to compromise repo
    const testResult = testIgnoreRule('temp_hacker_exploit.gs', '// exploit');
    assert.strictEqual(testResult.ignored, true);

    const status = getGitStatus();
    const leaked = status.filter((s) => /hacker_exploit/i.test(s));
    assert.strictEqual(leaked.length, 0, 'No exploit files must leak into git index');
  });
});
