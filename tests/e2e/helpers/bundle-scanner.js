/**
 * tests/e2e/helpers/bundle-scanner.js
 *
 * Scans source files and build bundles for banned tokens (e.g. "Dean"),
 * orphaned dead code, and route registrations.
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const WEB_SRC = path.resolve(REPO_ROOT, 'Web/src');
const WEB_DIST = path.resolve(REPO_ROOT, 'Web/dist');

/**
 * Recursively retrieves all files matching extensions in a directory.
 */
export function getFilesRecursively(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.html', '.css']) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        results.push(...getFilesRecursively(fullPath, extensions));
      }
    } else if (entry.isFile()) {
      if (extensions.length === 0 || extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Searches for a RegExp or string pattern across files in a directory or file list.
 * Returns Array<{ file, line, text, match }>
 */
export function scanFilesForPattern(filesOrDir, regex) {
  const pattern = typeof regex === 'string' ? new RegExp(regex, 'gi') : regex;
  let resolvedTarget = filesOrDir;
  if (typeof filesOrDir === 'string') {
    resolvedTarget = path.isAbsolute(filesOrDir) ? filesOrDir : path.resolve(REPO_ROOT, filesOrDir);
  }
  const files = typeof resolvedTarget === 'string'
    ? (fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory() ? getFilesRecursively(resolvedTarget) : [resolvedTarget])
    : resolvedTarget;

  const matches = [];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (pattern.test(lineText)) {
        // Reset lastIndex for stateful RegExp
        pattern.lastIndex = 0;
        const relative = path.relative(REPO_ROOT, file);
        matches.push({
          file: relative,
          line: i + 1,
          text: lineText.trim(),
        });
      }
      pattern.lastIndex = 0;
    }
  }

  return matches;
}

/**
 * Specifically audits for Dean references in active UI files:
 * Returns all matches of dean tokens (including snake_case and PascalCase) across Web/src (or specified target).
 */
export function auditDeanReferences(targetDir = WEB_SRC) {
  return scanFilesForPattern(targetDir, /(?:^|[^a-zA-Z0-9])dean(?:$|[^a-zA-Z0-9])|selu_dean|Dean[A-Z]/i);
}

/**
 * Checks if a specific file exists relative to REPO_ROOT.
 */
export function fileExists(relativeFilePath) {
  return fs.existsSync(path.resolve(REPO_ROOT, relativeFilePath));
}

/**
 * Reads a file's content relative to REPO_ROOT.
 */
export function readFile(relativeFilePath) {
  const fullPath = path.resolve(REPO_ROOT, relativeFilePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}
