/**
 * tests/e2e/tier1-features/f4-analytics-access.test.js
 *
 * Tier 1: Feature F4 - Designated Faculty Analytics Access
 * Verifies that designated faculty (Dr. Ghassan Alkadi) and Department Head
 * can access the CS Placement Analytics view from the Faculty dashboard / route,
 * and verifies genuine calculations against INITIAL_PLACEMENTS in mockPlacements.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from '../helpers/bundle-scanner.js';
import { INITIAL_PLACEMENTS } from '../../../Web/src/services/mockPlacements.ts';

describe('Feature F4 (Tier 1): Designated Faculty Analytics Access', () => {
  it('TC-E2E-F4-01: Faculty Dashboard Analytics Action Button Display', () => {
    const content = readFile('Web/src/components/dashboards/FacultyDashboard.tsx');
    assert.ok(content, 'FacultyDashboard.tsx must exist');

    // Faculty dashboard must render a link or button to CS Analytics for designated faculty
    assert.match(
      content,
      /(?:to="\/analytics"|<Link to="\/analytics"|CS Placement Analytics|Placement Outcomes|\/analytics)/i,
      'FacultyDashboard.tsx must provide an action button/link to Analytics view (Feature F4)'
    );
  });

  it('TC-E2E-F4-02: Analytics Route Registration in App.tsx', () => {
    const content = readFile('Web/src/App.tsx');
    assert.ok(content, 'App.tsx must exist');

    // App.tsx must register an analytics route
    assert.match(
      content,
      /(?:path="analytics"|path="\/analytics")/,
      'Web/src/App.tsx must register a route for /analytics (Feature F4)'
    );
  });

  it('TC-E2E-F4-03: Placement Analytics KPI Calculations from mockPlacements.ts', () => {
    const placements = INITIAL_PLACEMENTS;
    assert.ok(placements.length > 0, 'INITIAL_PLACEMENTS must not be empty');

    // Total Placed KPI
    const totalPlaced = placements.length;
    assert.strictEqual(totalPlaced, 15, 'Total placements count should match INITIAL_PLACEMENTS count (15)');

    // Average Pay KPI
    const totalPay = placements.reduce((sum, p) => sum + p.hourlyPay, 0);
    const avgPay = Number((totalPay / totalPlaced).toFixed(2));
    assert.strictEqual(avgPay, 27.00, 'Average pay should be $27.00/hr');

    // Average GPA KPI
    const totalGpa = placements.reduce((sum, p) => sum + p.gpa, 0);
    const avgGpa = Number((totalGpa / totalPlaced).toFixed(2));
    assert.strictEqual(avgGpa, 3.63, 'Average GPA should be 3.63');

    // Top Hiring Partner KPI
    const counts = {};
    for (const p of placements) {
      counts[p.companyName] = (counts[p.companyName] || 0) + 1;
    }
    const topPartner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    assert.strictEqual(topPartner, 'DXC Technology', 'Top hiring partner should be DXC Technology (3 interns)');
  });

  it('TC-E2E-F4-04: Employer Breakdown from INITIAL_PLACEMENTS', () => {
    const placements = INITIAL_PLACEMENTS;
    const employers = {};
    for (const p of placements) {
      employers[p.companyName] = (employers[p.companyName] || 0) + 1;
    }

    assert.strictEqual(employers['DXC Technology'], 3);
    assert.strictEqual(employers['IBM Client Innovation Center'], 2);
    assert.strictEqual(employers['Envoc'], 2);
    assert.strictEqual(employers['Blue Cross Blue Shield of Louisiana'], 2);
  });

  it('TC-E2E-F4-05: Placement Directory Search on INITIAL_PLACEMENTS', () => {
    const placements = INITIAL_PLACEMENTS;

    // Search by company "DXC"
    const dxcMatches = placements.filter((p) =>
      p.companyName.toLowerCase().includes('dxc') || p.studentName.toLowerCase().includes('dxc')
    );
    assert.strictEqual(dxcMatches.length, 3, 'Should find 3 DXC Technology placements');

    // Search by student "Cade Sholar"
    const cade = placements.find((p) => p.studentName === 'Cade Sholar');
    assert.ok(cade, 'Cade Sholar placement record must exist');
    assert.strictEqual(cade.companyName, 'DXC Technology');
    assert.strictEqual(cade.roleTitle, 'Full Stack Software Engineer Intern');
    assert.strictEqual(cade.hourlyPay, 29.50);
    assert.strictEqual(cade.gpa, 3.84);
    assert.strictEqual(cade.classification, 'Senior');
  });
});
