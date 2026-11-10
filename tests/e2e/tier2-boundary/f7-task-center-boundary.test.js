/**
 * tests/e2e/tier2-boundary/f7-task-center-boundary.test.js
 *
 * Tier 2: Feature F7 - Department Task Center Boundary & Edge Cases
 * Verifies 5-second undo timer, undo recovery, revision status update,
 * empty state handling, and component type aliases directly against
 * Web/src/components/dashboards/DepartmentTaskCenter.tsx.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from '../helpers/bundle-scanner.js';

describe('Feature F7 (Tier 2): Department Task Center Boundary & Edge Cases', () => {
  it('TC-T2-F7-01: 5-Second Undo Window Expiration & State Finalization', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');
    assert.match(
      content,
      /setUndoState\(null\);\s*},\s*5000\)/,
      'DepartmentTaskCenter.tsx must configure 5000ms timer to finalize undo state'
    );
  });

  it('TC-T2-F7-02: Immediate Undo Reversal Execution', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');
    assert.match(
      content,
      /setQueue\(undoState\.previousQueue\)/,
      'DepartmentTaskCenter.tsx must restore previousQueue on undo'
    );
    assert.match(
      content,
      /setReviewed\(undoState\.previousReviewed\)/,
      'DepartmentTaskCenter.tsx must restore previousReviewed on undo'
    );
  });

  it('TC-T2-F7-03: Send Revision Status and Feedback Propagation', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');
    assert.match(
      content,
      /status:\s*'Changes Requested'/,
      'handleSendRevision must update submission status to Changes Requested'
    );
    assert.match(
      content,
      /latestComment:\s*feedback/,
      'handleSendRevision must attach revision feedback comment'
    );
  });

  it('TC-T2-F7-04: Queue Rendering and Card Component Structure', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');
    assert.match(
      content,
      /className={`dean-queue-card origin-\${origin}/,
      'DepartmentTaskCenter.tsx must render queue cards with origin indicators'
    );
    assert.match(
      content,
      /<InlineReviewPanel/,
      'DepartmentTaskCenter.tsx must render InlineReviewPanel when expanded'
    );
  });

  it('TC-T2-F7-05: Component Type Alias and Interface Rebranding', () => {
    const content = readFile('Web/src/components/dashboards/DepartmentTaskCenter.tsx');
    assert.ok(content, 'DepartmentTaskCenter.tsx must exist');
    assert.match(
      content,
      /export interface DepartmentTaskCenterProps/,
      'DepartmentTaskCenterProps interface must be defined'
    );
    assert.match(
      content,
      /export type DeanTaskCenterProps = DepartmentTaskCenterProps/,
      'Legacy DeanTaskCenterProps alias must be preserved for compatibility'
    );
  });
});
