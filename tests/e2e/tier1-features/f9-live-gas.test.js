/**
 * tests/e2e/tier1-features/f9-live-gas.test.js
 *
 * Tier 1: Feature F9 - Live Google Apps Script Interaction Verification
 * Verifies HTTP transport rules (text/plain POST, redirect: follow, query key),
 * payload contracts, Google Sheets audit row logging, and offline fallback degradation.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from '../helpers/bundle-scanner.js';
import {
  loadWebEnv,
  postAppsScript,
  postGoogleSheetsAudit,
  resolveAppsScriptUrl,
} from '../helpers/api-client.js';

describe('Feature F9 (Tier 1): Live Google Apps Script Interaction Verification', () => {
  it('TC-T1-F9-01: Text/Plain POST Dispatch Without CORS Preflight in api.ts and googleSheetsService.ts', () => {
    const apiContent = readFile('Web/src/services/api.ts');
    const sheetsContent = readFile('Web/src/services/googleSheetsService.ts');
    assert.ok(apiContent, 'api.ts must exist');
    assert.ok(sheetsContent, 'googleSheetsService.ts must exist');

    // Both services must use text/plain;charset=utf-8 to avoid CORS preflight failures
    assert.match(
      apiContent,
      /'Content-Type':\s*'text\/plain;charset=utf-8'/,
      'api.ts must dispatch requests with text/plain;charset=utf-8'
    );
    assert.match(
      sheetsContent,
      /'Content-Type':\s*'text\/plain;charset=utf-8'/,
      'googleSheetsService.ts must dispatch requests with text/plain;charset=utf-8'
    );

    // Both services must use redirect: 'follow'
    assert.match(apiContent, /redirect:\s*'follow'/, "api.ts must specify redirect: 'follow'");
    assert.match(sheetsContent, /redirect:\s*'follow'/, "googleSheetsService.ts must specify redirect: 'follow'");
  });

  it('TC-T1-F9-02: API Key Parameter Verification', () => {
    const rawUrl = 'https://script.google.com/macros/s/AKfycbw7QOaoJQvCxc-1LaxJVlicq9wd00gYTOryX8vy_1XdGDSPTElR7dADKdBw7yXHXjAO2A/exec';
    const key = 'e81cc39b-3c52-4096-92ed-5054eee35d3e';

    const resolved = resolveAppsScriptUrl(rawUrl, key);
    assert.match(resolved, /\?key=e81cc39b-3c52-4096-92ed-5054eee35d3e/);
    assert.doesNotMatch(resolved, /\/a\/macros\//, 'Should strip workspace domain prefix if present');
  });

  it('TC-T1-F9-03: Action Payload Envelope Integrity', async () => {
    const res = await postAppsScript('login', {
      email: 'bonnie.achee@southeastern.edu',
    });

    assert.strictEqual(res.ok, true);
    assert.ok(res.data?.token);
    assert.strictEqual(res.data?.user?.fullName, 'Dr. Bonnie Achée');
    assert.deepStrictEqual(res.data?.user?.roles, ['Department Head']);
  });

  it('TC-T1-F9-04: Google Sheets Audit Row Append via submitToGoogleWorkspace', async () => {
    const auditRecord = {
      studentName: 'Eliora Browning',
      studentEmail: 'eliora.browning@selu.edu',
      submissionId: 101,
      formId: 'CS401',
      summary: 'Initial submission of Internship Application',
      responses: { employerName: 'Acme Software', jobTitle: 'Junior QA Engineer' },
    };

    const res = await postGoogleSheetsAudit(auditRecord);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data?.submissionId, 101);
  });

  it('TC-T1-F9-05: Offline / Local Mock Fallback Degradation', async () => {
    // When offline mode is active, mock dispatcher serves fixtures without network error
    const res = await postAppsScript('getForms', {}, { offline: true });
    assert.strictEqual(res.ok, true);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length >= 3);
  });
});
