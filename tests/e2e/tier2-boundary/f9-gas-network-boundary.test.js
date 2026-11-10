/**
 * tests/e2e/tier2-boundary/f9-gas-network-boundary.test.js
 *
 * Tier 2: Feature F9 - Live Google Apps Script Network Boundary & Edge Cases
 * Verifies 401/403 permission diagnostics, HTML redirect 502 conversion,
 * workspace domain URL sanitization, large payload serialization, and timeout handling.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { postAppsScript, resolveAppsScriptUrl } from '../helpers/api-client.js';

describe('Feature F9 (Tier 2): Live Google Apps Script Network Boundary & Edge Cases', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url.includes('status-403')) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
      } else if (req.url.includes('html-redirect')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<!DOCTYPE html><html><head><title>Google Accounts Sign in</title></head></html>');
      } else if (req.url.includes('timeout')) {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        }, 300);
      } else if (req.url.includes('large-payload')) {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, receivedLength: body.length }));
        });
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server?.close();
  });

  it('TC-T2-F9-01: Google Apps Script 401 / 403 Permission Denied Diagnostic', async () => {
    await assert.rejects(
      postAppsScript('login', {}, { live: true, url: `${baseUrl}/status-403` }),
      (err) => {
        assert.match(err.message, /HTTP 403/);
        assert.match(err.message, /public access/i);
        return true;
      }
    );
  });

  it('TC-T2-F9-02: HTML Login Redirect (502 SyntaxError) Handling', async () => {
    await assert.rejects(
      postAppsScript('login', {}, { live: true, url: `${baseUrl}/html-redirect` }),
      (err) => {
        assert.strictEqual(err.status, 502);
        assert.match(err.message, /HTML page/);
        assert.match(err.message, /login redirect/i);
        return true;
      }
    );
  });

  it('TC-T2-F9-03: Workspace Domain Prefix URL Normalization', () => {
    const enterpriseUrl =
      'https://script.google.com/a/macros/southeastern.edu/s/AKfycbw7QOaoJQvCxc-1LaxJVlicq9wd00gYTOryX8vy_1XdGDSPTElR7dADKdBw7yXHXjAO2A/exec';
    const key = 'test-key';

    const normalized = resolveAppsScriptUrl(enterpriseUrl, key);
    assert.strictEqual(
      normalized.includes('/a/macros/southeastern.edu/'),
      false,
      'Workspace domain prefix must be stripped'
    );
    assert.strictEqual(
      normalized.includes('/macros/s/AKfycbw7QOaoJQvCxc-1LaxJVlicq9wd00gYTOryX8vy_1XdGDSPTElR7dADKdBw7yXHXjAO2A/exec'),
      true
    );
    assert.match(normalized, /\?key=test-key/);
  });

  it('TC-T2-F9-04: Large Form Response Payload (> 50KB)', async () => {
    const largeProposalText = 'A'.repeat(55000);
    const res = await postAppsScript(
      'submitForm',
      {
        formId: 'CS420',
        responses: {
          detailedArchitecture: largeProposalText,
        },
      },
      { live: true, url: `${baseUrl}/large-payload` }
    );

    assert.strictEqual(res.ok, true);
    assert.ok(res.receivedLength > 55000, 'Payload delivered over wire must be > 55,000 bytes');
  });

  it('TC-T2-F9-05: Live Backend Timeout & 503 Fallback Recovery', async () => {
    await assert.rejects(
      postAppsScript('login', {}, { live: true, url: `${baseUrl}/timeout`, timeoutMs: 30 }),
      (err) => {
        assert.strictEqual(err.status, 503);
        assert.match(err.message, /timed out/);
        return true;
      }
    );
  });
});
