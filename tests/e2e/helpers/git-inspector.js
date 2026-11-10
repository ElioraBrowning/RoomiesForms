/**
 * tests/e2e/helpers/git-inspector.js
 *
 * Programmatic git inspection helper for E2E tests:
 * Verifies .gitignore rules, tracked files in index, and working tree cleanliness.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

/**
 * Runs a git command in REPO_ROOT and returns trimmed stdout.
 * If command fails with non-zero exit code, returns { stdout, stderr, status }.
 */
export function runGit(commandArgs, options = {}) {
  try {
    const stdout = execSync(`git ${commandArgs}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    return { success: true, status: 0, stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    return {
      success: false,
      status: error.status ?? 1,
      stdout: error.stdout ? error.stdout.toString().trim() : '',
      stderr: error.stderr ? error.stderr.toString().trim() : '',
    };
  }
}

/**
 * Checks git ignore status for one or more file paths.
 * Returns { ignored: boolean, matches: Array<{ file, rule, line }> }
 */
export function checkIgnore(filePaths) {
  const isArray = Array.isArray(filePaths);
  const pathsArray = isArray ? filePaths : [filePaths];

  const results = pathsArray.map((p) => {
    const res = runGit(`check-ignore -v "${p.replace(/"/g, '\\"')}"`);
    let match = null;
    if (res.stdout) {
      const parts = res.stdout.trim().split('\t');
      match = { raw: res.stdout.trim(), ruleInfo: parts[0] || '', filePath: parts[1] || p };
    }
    return {
      filePath: p,
      ignored: res.status === 0 && Boolean(match),
      match,
      status: res.status,
    };
  });

  const matches = results.filter((r) => r.ignored).map((r) => r.match);
  const allIgnored = pathsArray.length > 0 && results.every((r) => r.ignored);

  return {
    ignored: isArray ? allIgnored : (results[0]?.ignored ?? false),
    allIgnored,
    anyIgnored: matches.length > 0,
    results,
    matches,
    status: allIgnored ? 0 : 1,
    rawOutput: matches.map((m) => m.raw).join('\n'),
  };
}

/**
 * Convenience check returning true if filePath matches any .gitignore rule.
 */
export function isIgnored(filePath) {
  const res = checkIgnore(filePath);
  return res.ignored || res.matches.length > 0;
}

/**
 * Retrieves tracked files from git index, optionally filtered by RegExp.
 */
export function getTrackedFiles(pattern = null) {
  const res = runGit('ls-files');
  if (!res.success) return [];
  const files = res.stdout.split('\n').map((f) => f.trim()).filter(Boolean);
  if (!pattern) return files;
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return files.filter((f) => regex.test(f));
}

/**
 * Returns porcelain git status items.
 */
export function getGitStatus() {
  const res = runGit('status --porcelain');
  if (!res.success) return [];
  if (!res.stdout) return [];
  return res.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

/**
 * Safely creates a test file, checks if git ignores it, and removes it.
 * Returns { ignored, statusClean, fileName }
 */
export function testIgnoreRule(relativeFilePath, content = '// temporary test content\n') {
  const fullPath = path.resolve(REPO_ROOT, relativeFilePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(fullPath, content, 'utf8');
    const ignoreRes = checkIgnore(relativeFilePath);
    const statusItems = getGitStatus();
    const reportedInStatus = statusItems.some((s) => s.includes(relativeFilePath));
    return {
      filePath: relativeFilePath,
      ignored: ignoreRes.ignored || ignoreRes.matches.length > 0,
      matches: ignoreRes.matches,
      reportedInStatus,
    };
  } finally {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
