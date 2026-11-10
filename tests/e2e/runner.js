#!/usr/bin/env node

/**
 * tests/e2e/runner.js
 *
 * Unified CLI Test Runner for RoomiesForms 4-Tier E2E Test Suite.
 * Built on native Node.js 24 `node:test` and `node:test/reporters`.
 *
 * Usage:
 *   node tests/e2e/runner.js
 *   node tests/e2e/runner.js --tier=1
 *   node tests/e2e/runner.js --tier=2
 *   node tests/e2e/runner.js --tier=3
 *   node tests/e2e/runner.js --tier=4
 *   node tests/e2e/runner.js --feature=F2
 *   node tests/e2e/runner.js --live
 *   node tests/e2e/runner.js --verbose
 */

import fs from 'node:fs';
import path from 'node:path';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';

const SUITE_ROOT = path.resolve(import.meta.dirname);

// Tier directory mappings
const TIER_DIRS = {
  1: path.join(SUITE_ROOT, 'tier1-features'),
  2: path.join(SUITE_ROOT, 'tier2-boundary'),
  3: path.join(SUITE_ROOT, 'tier3-integration'),
  4: path.join(SUITE_ROOT, 'tier4-scenarios'),
};

function parseArgs(args) {
  const options = {
    tier: null,
    feature: null,
    live: false,
    verbose: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--tier=')) {
      options.tier = parseInt(arg.split('=')[1], 10);
    } else if (arg === '-t' && args[args.indexOf(arg) + 1]) {
      options.tier = parseInt(args[args.indexOf(arg) + 1], 10);
    } else if (arg.startsWith('--feature=' )) {
      options.feature = arg.split('=')[1].toUpperCase();
    } else if (arg === '-f' && args[args.indexOf(arg) + 1]) {
      options.feature = args[args.indexOf(arg) + 1].toUpperCase();
    } else if (arg === '--live') {
      options.live = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
RoomiesForms E2E Test Suite Runner
----------------------------------
Usage:
  node tests/e2e/runner.js [options]

Options:
  --tier=<1|2|3|4>    Run only tests belonging to the specified tier:
                        1 = Tier 1: Smoke & Feature Coverage
                        2 = Tier 2: Boundary & Corner Cases
                        3 = Tier 3: Cross-Feature Pairwise Interactions
                        4 = Tier 4: Real-World Scenarios
  --feature=<F1..F10> Run tests filtered by feature ID (e.g. --feature=F2)
  --live              Execute tests in live mode against Google Apps Script backend
  --verbose, -v       Verbose diagnostic logs
  --help, -h          Show this help message

Examples:
  node tests/e2e/runner.js
  node tests/e2e/runner.js --tier=1
  node tests/e2e/runner.js --feature=F6
  node tests/e2e/runner.js --tier=2 --feature=F3
  node tests/e2e/runner.js --live
`);
}

function collectTestFiles(options) {
  let searchDirs = [];

  if (options.tier && TIER_DIRS[options.tier]) {
    searchDirs = [TIER_DIRS[options.tier]];
  } else {
    searchDirs = Object.values(TIER_DIRS);
  }

  const testFiles = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.test.js')) {
        const fullPath = path.join(dir, entry.name);

        if (options.feature) {
          const featureTag = options.feature.toLowerCase(); // e.g. "f2"
          // Match e.g. f2-dean-removal.test.js or test containing f2
          const baseName = entry.name.toLowerCase();
          if (!baseName.includes(featureTag)) {
            continue;
          }
        }

        testFiles.push(fullPath);
      }
    }
  }

  return testFiles.sort();
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.tier !== null && !TIER_DIRS[options.tier]) {
    console.error(`\n✖ Error: Invalid tier "${options.tier}". Valid tiers are 1, 2, 3, 4.`);
    process.exit(1);
  }

  if (options.live) {
    process.env.TEST_LIVE = 'true';
  }
  if (options.verbose) {
    process.env.TEST_VERBOSE = 'true';
  }

  console.log('='.repeat(70));
  console.log('ROOMIESFORMS AUTOMATED E2E TEST SUITE');
  console.log(`Node.js Version : ${process.version}`);
  console.log(`Execution Mode  : ${options.live ? 'LIVE (Google Apps Script Integration)' : 'OFFLINE / CONTRACT (Deterministic)'}`);
  if (options.tier) console.log(`Tier Filter     : Tier ${options.tier}`);
  if (options.feature) console.log(`Feature Filter  : ${options.feature}`);
  console.log('='.repeat(70));

  const testFiles = collectTestFiles(options);

  if (testFiles.length === 0) {
    console.error('\n✖ Error: No matching test files found for current filters.');
    process.exit(1);
  }

  console.log(`\nExecuting ${testFiles.length} test suite file(s)...`);
  if (options.verbose) {
    for (const f of testFiles) {
      console.log(`  - ${path.relative(SUITE_ROOT, f)}`);
    }
  }
  console.log('');

  const startTime = Date.now();
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const failures = [];

  const testStream = run({
    files: testFiles,
    concurrency: false, // Sequential execution for predictable diagnostic output
  });

  testStream.on('test:pass', (data) => {
    // Top-level or subtest pass
    if (data.details?.type !== 'suite') {
      passCount++;
    }
  });

  testStream.on('test:fail', (data) => {
    if (data.details?.type !== 'suite') {
      failCount++;
      failures.push({
        name: data.name,
        file: data.file ? path.relative(SUITE_ROOT, data.file) : 'unknown',
        error: data.details?.error?.message || 'Assertion failed',
        stack: data.details?.error?.stack,
      });
    }
  });

  // Pipe to spec reporter for standard TAP/spec output formatting
  testStream.compose(new spec()).pipe(process.stdout);

  await new Promise((resolve) => {
    testStream.on('end', resolve);
  });

  const durationMs = Date.now() - startTime;

  console.log('\n' + '='.repeat(70));
  console.log('E2E TEST RUN SUMMARY');
  console.log('='.repeat(70));
  console.log(`Files Executed   : ${testFiles.length}`);
  console.log(`Tests Passed     : ${passCount}`);
  console.log(`Tests Failed     : ${failCount}`);
  console.log(`Total Duration   : ${(durationMs / 1000).toFixed(2)}s (${durationMs}ms)`);

  if (failures.length > 0) {
    console.log('\nFailing Test Cases:');
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.file}] ${f.name}`);
      console.log(`     Error: ${f.error}`);
    });
    console.log('='.repeat(70));
    process.exit(1);
  } else {
    console.log('\n✔ All executed tests passed successfully!');
    console.log('='.repeat(70));
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\nFatal runner error:', err);
  process.exit(1);
});
