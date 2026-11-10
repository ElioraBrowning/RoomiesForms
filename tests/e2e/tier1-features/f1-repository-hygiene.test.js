/**
 * tests/e2e/tier1-features/f1-repository-hygiene.test.js
 *
 * Tier 1: Feature F1 - Repository Hygiene Hardening
 * Verifies .gitignore rules for Google Apps Script (*.gs), clasp files, and scratch files.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkIgnore,
  getTrackedFiles,
  testIgnoreRule,
} from '../helpers/git-inspector.js';

describe('Feature F1 (Tier 1): Repository Hygiene Hardening', () => {
  it('TC-E2E-F1-01: Root Google Apps Script (*.gs) Ignore Enforcement', () => {
    const result = testIgnoreRule('Code.gs', '// Apps Script root test\nfunction doGet() {}');
    assert.strictEqual(
      result.ignored,
      true,
      'Code.gs must be ignored by .gitignore'
    );
    assert.strictEqual(
      result.reportedInStatus,
      false,
      'Code.gs must not appear in untracked files in git status'
    );
  });

  it('TC-E2E-F1-02: Clasp Configuration & Credential File Ignore Enforcement', () => {
    const files = ['.clasp.json', '.clasprc.json', 'appsscript.json'];
    for (const file of files) {
      const res = testIgnoreRule(file, '{"scriptId": "test-id"}');
      assert.strictEqual(
        res.ignored,
        true,
        `${file} must be ignored by .gitignore`
      );
      assert.strictEqual(
        res.reportedInStatus,
        false,
        `${file} must not appear in git status`
      );
    }
  });

  it('TC-E2E-F1-03: Temporary Scratch Files (temp_*) Ignore Enforcement', () => {
    const scratchFiles = ['temp_script.js', 'temp_diff.patch', 'Web/temp_edit.ts'];
    for (const file of scratchFiles) {
      const res = testIgnoreRule(file, '// temporary scratchpad');
      assert.strictEqual(
        res.ignored,
        true,
        `${file} must match temp_* ignore rule`
      );
      assert.strictEqual(
        res.reportedInStatus,
        false,
        `${file} must not appear in git status`
      );
    }
  });

  it('TC-E2E-F1-04: Repository Index Forensic Cleanliness Audit', () => {
    const trackedBackendFiles = getTrackedFiles(/\.gs$|appsscript|\.clasp|temp_/i);
    assert.strictEqual(
      trackedBackendFiles.length,
      0,
      `Git index must track zero backend scripts or scratch files. Found: ${trackedBackendFiles.join(', ')}`
    );
  });

  it('TC-E2E-F1-05: Nested Subdirectory .gs File Ignore Propagation', () => {
    const nestedFiles = ['Web/src/services/backend.gs', 'Backend/Services/sync.gs'];
    for (const file of nestedFiles) {
      const res = testIgnoreRule(file, '// nested gs file');
      assert.strictEqual(
        res.ignored,
        true,
        `Nested file ${file} must be ignored by *.gs pattern`
      );
      assert.strictEqual(
        res.reportedInStatus,
        false,
        `Nested file ${file} must not appear in git status`
      );
    }
  });
});
