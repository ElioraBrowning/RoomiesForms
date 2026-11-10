/**
 * tests/e2e/tier2-boundary/f1-hygiene-boundary.test.js
 *
 * Tier 2: Feature F1 - Hygiene Boundary & Edge Cases
 * Verifies case-insensitivity, false-positive protection, env discipline,
 * git staging rejection, and automated scratch cleanup.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkIgnore,
  getGitStatus,
  getTrackedFiles,
  runGit,
  testIgnoreRule,
} from '../helpers/git-inspector.js';

describe('Feature F1 (Tier 2): Hygiene Boundary & Edge Cases', () => {
  it('TC-E2E-F1-06: Windows Case-Insensitivity File Pattern Matching', () => {
    // Windows NTFS is case-preserving but case-insensitive
    const caseVariants = ['TEST.GS', 'Appsscript.JSON', '.Clasp.Json', 'TEMP_AUDIT.JS'];
    for (const file of caseVariants) {
      const res = testIgnoreRule(file, '// case insensitive test');
      assert.strictEqual(
        res.ignored,
        true,
        `${file} must match ignore pattern regardless of uppercase/lowercase`
      );
      assert.strictEqual(
        res.reportedInStatus,
        false,
        `${file} must not leak into git status`
      );
    }
  });

  it('TC-E2E-F1-07: False-Positive Boundary Guard (Legitimate "temp" substrings)', () => {
    // Files like templates.ts or attemptCounter.ts must NOT be ignored by temp_*
    const legitimatePaths = ['Web/src/forms/templates.ts', 'Web/src/utils/attemptCounter.ts'];
    for (const file of legitimatePaths) {
      const res = checkIgnore(file);
      assert.strictEqual(
        res.ignored,
        false,
        `${file} must NOT be ignored (rule temp_* must only match prefix temp_)`
      );
    }
  });

  it('TC-E2E-F1-08: Environment Local vs Production File Discipline', () => {
    // .env.local must be ignored, while Web/.env must be tracked
    const localEnvIgnore = checkIgnore('.env.local');
    assert.strictEqual(localEnvIgnore.ignored, true, '.env.local must be ignored');

    const trackedFiles = getTrackedFiles('Web/.env');
    assert.ok(
      trackedFiles.includes('Web/.env'),
      'Web/.env must remain tracked as configuration template in git repository'
    );
  });

  it('TC-E2E-F1-09: Git Pre-Commit / Staging Rejection Guard', () => {
    // Attempting git add on an ignored file without -f must fail with non-zero exit
    const res = testIgnoreRule('Code.gs', '// staging test');
    assert.strictEqual(res.ignored, true);

    const addRes = runGit('add Code.gs');
    // If file doesn't exist or is ignored, git add will fail or refuse
    assert.strictEqual(
      addRes.success,
      false,
      'git add without -f on ignored Code.gs must fail'
    );
  });

  it('TC-E2E-F1-10: Automated Scratch File Cleanup Verification', () => {
    // Verify that after running scratch operations, no residual scratch files remain in status
    const statusItems = getGitStatus();
    const residualScratch = statusItems.filter((s) => /temp_|\.gs$|appsscript|\.clasp/i.test(s));
    assert.strictEqual(
      residualScratch.length,
      0,
      `Working tree must have zero residual scratch files. Found: ${residualScratch.join(', ')}`
    );
  });
});
