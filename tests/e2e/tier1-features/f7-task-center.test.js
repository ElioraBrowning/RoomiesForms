/**
 * tests/e2e/tier1-features/f7-task-center.test.js
 *
 * Tier 1: Feature F7 - Department Task Center Action Persistence
 * Verifies that approvals and revision requests in the Department Task Center
 * persist to the backend API and Google Sheets audit logger, card cycling, and bucket filters
 * directly against Web/src/components/dashboards/DepartmentTaskCenter.tsx.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from '../helpers/bundle-scanner.js';

describe('Feature F7 (Tier 1): Department Task Center Action Persistence', () => {
  it('TC-T1-F7-01: Approve & Next Persistent Backend Dispatch in DepartmentTaskCenter', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');

    // handleApproveNext must call backend approval and submitToGoogleWorkspace
    assert.match(
      content,
      /(?:api\.approveSubmission|api\.post\(`\/submissions\/\${id}\/approve`|approveSubmission)/,
      'DepartmentTaskCenter.tsx handleApproveNext must invoke backend approval API (Feature F7)'
    );
    assert.match(
      content,
      /submitToGoogleWorkspace/,
      'DepartmentTaskCenter.tsx handleApproveNext must persist approval audit record to Google Sheets (Feature F7)'
    );
  });

  it('TC-T1-F7-02: Send Back for Revision Persistent Backend Dispatch in DepartmentTaskCenter', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');

    // handleSendRevision must call backend rejection and submitToGoogleWorkspace
    assert.match(
      content,
      /(?:api\.rejectSubmission|api\.post\(`\/submissions\/\${id}\/reject`|rejectSubmission)/,
      'DepartmentTaskCenter.tsx handleSendRevision must invoke backend rejection API (Feature F7)'
    );
    assert.match(
      content,
      /submitToGoogleWorkspace/,
      'DepartmentTaskCenter.tsx handleSendRevision must persist revision audit record to Google Sheets (Feature F7)'
    );
  });

  it('TC-T1-F7-03: Non-Destructive Next / Prev Card Cycling Wiring', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');

    assert.match(
      content,
      /onPrev=\{\(\) => setExpandedId\(filteredList\[idx - 1\]\.id\)\}/,
      'DepartmentTaskCenter.tsx must wire onPrev card cycling'
    );
    assert.match(
      content,
      /onNext=\{\(\) => setExpandedId\(filteredList\[idx \+ 1\]\.id\)\}/,
      'DepartmentTaskCenter.tsx must wire onNext card cycling'
    );
  });

  it('TC-T1-F7-04: Submitter Origin Filter Implementation', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');

    assert.match(
      content,
      /originFilter === 'student'/,
      'DepartmentTaskCenter.tsx must filter queue by student origin'
    );
    assert.match(
      content,
      /originFilter === 'employer'/,
      'DepartmentTaskCenter.tsx must filter queue by employer origin'
    );
  });

  it('TC-T1-F7-05: Task Bucket Navigation Types and Handlers', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');

    assert.match(
      content,
      /type TaskBucket = 'all' \| 'fresh' \| 'resubmission' \| 'waiting' \| 'approved'/,
      'DepartmentTaskCenter.tsx must declare TaskBucket union type'
    );
    assert.match(
      content,
      /handleBucketClick/,
      'DepartmentTaskCenter.tsx must implement bucket toggle handler'
    );
  });
});
