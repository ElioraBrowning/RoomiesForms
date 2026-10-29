export interface SubmissionPayload {
  studentName: string;
  studentEmail: string;
  submissionId: string | number;
  formId: string | number;
  summary?: string;
  responses: Record<string, any>;
}

const RAW_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string | undefined;
const API_KEY = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_KEY as string | undefined;

/**
 * Strips workspace domain prefixes (`/a/macros/<domain>/s/...` -> `/macros/s/...`)
 * because `/a/macros/<domain>/` forces an interactive Google Workspace login redirect
 * that blocks cross-origin fetch requests.
 */
function resolveAppsScriptUrl(rawUrl?: string, apiKey?: string): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  let normalized = rawUrl.trim().replace(/\/a\/macros\/[^/]+\/s\//, '/macros/s/');
  if (apiKey && apiKey.trim()) {
    const separator = normalized.includes('?') ? '&' : '?';
    normalized = `${normalized}${separator}key=${encodeURIComponent(apiKey.trim())}`;
  }
  return normalized;
}

export async function submitToGoogleWorkspace(payload: SubmissionPayload): Promise<{ ok: boolean; error?: string }> {
  const endpoint = resolveAppsScriptUrl(RAW_URL, API_KEY);
  if (!endpoint) {
    console.warn('VITE_GOOGLE_APPS_SCRIPT_URL is not configured.');
    return { ok: false, error: 'Apps Script URL not set' };
  }

  const normalizedPayload: SubmissionPayload = {
    ...payload,
    studentName: payload.studentName || (payload.responses?.studentName as string) || (payload.responses?.name as string) || '',
    studentEmail: payload.studentEmail || (payload.responses?.email as string) || 'unknown@selu.edu',
    submissionId: payload.submissionId || payload.formId || `sub-${Date.now()}`,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(normalizedPayload),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Google Apps Script returned HTTP ${response.status}. Ensure the Apps Script Web App deployment has "Execute as: Me" and "Who has access: Anyone".`,
    );
  }

  const text = await response.text();
  try {
    const result = JSON.parse(text) as { ok?: boolean; error?: string };
    if (!result.ok) {
      throw new Error(result.error || 'Failed to append row to Google Sheet.');
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(
        'Google Apps Script returned an HTML login/error page instead of JSON. Ensure the Web App deployment has "Who has access: Anyone".',
      );
    }
    throw err;
  }
}
