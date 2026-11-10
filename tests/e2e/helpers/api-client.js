/**
 * tests/e2e/helpers/api-client.js
 *
 * HTTP transport client and contract simulator for Google Apps Script Web App
 * and Google Sheets audit logging.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  FIXTURE_FORMS,
  FIXTURE_PLACEMENTS,
  FIXTURE_SUBMISSIONS,
  FIXTURE_SURVEY_RESPONSES,
  FIXTURE_USERS,
} from './test-fixtures.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

let dynamicSubmissions = FIXTURE_SUBMISSIONS.map((s) => JSON.parse(JSON.stringify(s)));

export function resetMockSubmissions() {
  dynamicSubmissions = FIXTURE_SUBMISSIONS.map((s) => JSON.parse(JSON.stringify(s)));
}

export function getMockSubmissions() {
  return dynamicSubmissions;
}

/**
 * Loads environment variables from Web/.env
 */
export function loadWebEnv() {
  const envPath = path.resolve(REPO_ROOT, 'Web/.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key) {
        env[key.trim()] = rest.join('=').trim();
      }
    }
  }
  return {
    url: process.env.VITE_GOOGLE_APPS_SCRIPT_URL || env.VITE_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbw7QOaoJQvCxc-1LaxJVlicq9wd00gYTOryX8vy_1XdGDSPTElR7dADKdBw7yXHXjAO2A/exec',
    key: process.env.VITE_GOOGLE_APPS_SCRIPT_KEY || env.VITE_GOOGLE_APPS_SCRIPT_KEY || 'e81cc39b-3c52-4096-92ed-5054eee35d3e',
  };
}

/**
 * Normalizes Google Apps Script URL by stripping enterprise workspace domain redirects
 * and ensuring ?key= query parameter is appended.
 */
export function resolveAppsScriptUrl(rawUrl, key = null) {
  let url = (rawUrl || '').trim();
  // Strip Google Workspace tenant prefix e.g. /a/macros/southeastern.edu/s/ -> /macros/s/
  url = url.replace(/\/a\/macros\/[^/]+\/s\//, '/macros/s/');

  if (key && !url.includes('key=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}key=${encodeURIComponent(key)}`;
  }
  return url;
}

/**
 * Mock dispatcher executing contracts in-memory (offline / fast contract mode).
 */
export function mockAppsScriptDispatcher(action, payload = {}) {
  switch (action) {
    case 'login': {
      const email = (payload.email || '').toLowerCase().trim();
      const user = Object.values(FIXTURE_USERS).find((u) => u.email.toLowerCase() === email);
      if (!user) {
        return { ok: false, error: 'User not found' };
      }
      return {
        ok: true,
        data: {
          token: `mock-jwt-${Date.now()}`,
          user: { ...user },
        },
      };
    }
    case 'getForms':
      return { ok: true, data: FIXTURE_FORMS };

    case 'getForm': {
      const form = FIXTURE_FORMS.find((f) => f.id === payload.id || f.formKey === payload.formKey);
      if (!form) return { ok: false, error: 'Form not found' };
      return { ok: true, data: form };
    }

    case 'getSubmissions':
      return { ok: true, data: dynamicSubmissions };

    case 'getSubmission': {
      const sub = dynamicSubmissions.find((s) => s.id === Number(payload.id));
      if (!sub) return { ok: false, error: 'Submission not found' };
      return { ok: true, data: sub };
    }

    case 'approveSubmission': {
      const sub = dynamicSubmissions.find((s) => s.id === Number(payload.id));
      if (!sub) return { ok: false, error: 'Submission not found' };
      if (sub.approvals && sub.approvals.length > 0) {
        const stepToApprove = sub.approvals.find((a) => a.status === 'Pending Review') ||
                              sub.approvals.find((a) => a.status !== 'Approved') ||
                              sub.approvals[0];
        if (stepToApprove) {
          stepToApprove.status = 'Approved';
          stepToApprove.actionDate = new Date().toISOString();
          stepToApprove.approvedBy = payload.userEmail || 'reviewer@selu.edu';
        }
        const nextStep = sub.approvals.find((a) => a.status === 'Queued');
        if (nextStep) {
          nextStep.status = 'Pending Review';
        } else {
          sub.status = 'Approved';
        }
      } else {
        sub.status = 'Approved';
      }
      return {
        ok: true,
        data: {
          id: sub.id,
          status: 'Approved',
          submissionStatus: sub.status,
          comments: payload.comments || '',
          actor: payload.userEmail || 'reviewer@selu.edu',
        },
      };
    }

    case 'rejectSubmission': {
      const sub = dynamicSubmissions.find((s) => s.id === Number(payload.id));
      if (!sub) return { ok: false, error: 'Submission not found' };
      sub.status = 'Rejected';
      if (sub.approvals && sub.approvals.length > 0) {
        const stepToReject = sub.approvals.find((a) => a.status === 'Pending Review') || sub.approvals[0];
        if (stepToReject) {
          stepToReject.status = 'Rejected';
          stepToReject.actionDate = new Date().toISOString();
          stepToReject.approvedBy = payload.userEmail || 'reviewer@selu.edu';
        }
      }
      return {
        ok: true,
        data: {
          id: sub.id,
          status: 'Rejected',
          feedback: payload.feedback || payload.comments || '',
          actor: payload.userEmail || 'reviewer@selu.edu',
        },
      };
    }

    case 'getAnonymousResponses': {
      return {
        ok: true,
        data: FIXTURE_SURVEY_RESPONSES,
      };
    }

    case 'submitForm': {
      const newId = payload.id
        ? Number(payload.id)
        : payload.submissionId
          ? Number(payload.submissionId)
          : 999;

      const existing = dynamicSubmissions.find((s) => s.id === newId);
      if (existing) {
        existing.status = 'Pending';
        existing.summary = payload.summary || existing.summary || 'Resubmitted Form';
        existing.responses = { ...existing.responses, ...(payload.responses || {}) };
        if (existing.approvals && existing.approvals.length > 0) {
          existing.approvals[0].status = 'Pending Review';
          for (let i = 1; i < existing.approvals.length; i++) {
            existing.approvals[i].status = 'Queued';
          }
        }
        return {
          ok: true,
          data: existing,
        };
      }

      const newSubmission = {
        id: newId,
        formId: payload.formId || 1,
        formKey: typeof payload.formId === 'string' && payload.formId.startsWith('CS') ? payload.formId : 'CS401',
        formTitle: payload.formTitle || (payload.formId === 'CS401' ? 'CS 401: Internship Application' : 'Form Submission'),
        studentId: payload.studentId || 99,
        studentName: payload.studentName || 'Marcus Vance',
        studentEmail: payload.studentEmail || 'marcus.vance@selu.edu',
        status: 'Pending',
        currentStepOrder: 1,
        currentStep: {
          stepOrder: 1,
          roleName: 'Faculty Evaluator',
          requiredRole: { name: 'Faculty Evaluator' },
        },
        approvals: [
          { stepOrder: 1, roleName: 'Faculty Evaluator', status: 'Pending Review', actionDate: null, approvedBy: null },
          { stepOrder: 2, roleName: 'Department Head Authorization', status: 'Queued', actionDate: null, approvedBy: null },
        ],
        responses: payload.responses || {},
        auditLogs: [],
        summary: payload.summary || 'New Submission',
      };

      dynamicSubmissions.push(newSubmission);

      return {
        ok: true,
        data: newSubmission,
      };
    }

    default:
      return { ok: false, error: `Unknown action "${action}"` };
  }
}

/**
 * Dispatches an action to Google Apps Script.
 * Uses live HTTP when options.live is true; otherwise evaluates against mock dispatcher.
 */
export async function postAppsScript(action, payload = {}, options = {}) {
  const isLive = Boolean(options.live || process.env.TEST_LIVE === 'true');

  if (!isLive) {
    return mockAppsScriptDispatcher(action, payload);
  }

  const { url: baseUrl, key } = loadWebEnv();
  const endpoint = resolveAppsScriptUrl(options.url || baseUrl, options.key || key);

  const bodyString = JSON.stringify({ action, ...payload });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Apps Script returned HTTP ${res.status}. Web App deployment may need public access.`);
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        const error = new Error('Google Apps Script returned an HTML page (likely Google Workspace login redirect).');
        error.status = 502;
        error.html = text;
        throw error;
      }
      throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Request timed out after ${options.timeoutMs || 10000}ms`);
      timeoutErr.status = 503;
      throw timeoutErr;
    }
    throw err;
  }
}

/**
 * Dispatches an audit row write via submitToGoogleWorkspace contract.
 * In offline mode, simulates successful append.
 * In live mode, POSTs normalized submission payload directly (without action wrapper)
 * matching Web/src/services/googleSheetsService.ts contract.
 */
export async function postGoogleSheetsAudit(auditRecord, options = {}) {
  const isLive = Boolean(options.live || process.env.TEST_LIVE === 'true');

  const normalizedPayload = {
    studentName: auditRecord.studentName || auditRecord.responses?.studentName || auditRecord.responses?.name || '',
    studentEmail: auditRecord.studentEmail || auditRecord.responses?.email || 'unknown@selu.edu',
    submissionId: auditRecord.submissionId || auditRecord.formId || `sub-${Date.now()}`,
    formId: auditRecord.formId || '',
    summary: auditRecord.summary || '',
    responses: auditRecord.responses || {},
    timestamp: new Date().toISOString(),
  };

  if (!isLive) {
    return { ok: true, data: { appended: true, ...normalizedPayload } };
  }

  const { url: baseUrl, key } = loadWebEnv();
  const endpoint = resolveAppsScriptUrl(options.url || baseUrl, options.key || key);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(normalizedPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Apps Script returned HTTP ${res.status}.`);
    }
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed.ok) {
        return { ok: true, data: { appended: true, ...normalizedPayload } };
      }
      return parsed;
    } catch {
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        const error = new Error('Google Apps Script returned an HTML page (login redirect).');
        error.status = 502;
        throw error;
      }
      throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Request timed out after ${options.timeoutMs || 10000}ms`);
      timeoutErr.status = 503;
      throw timeoutErr;
    }
    throw err;
  }
}
