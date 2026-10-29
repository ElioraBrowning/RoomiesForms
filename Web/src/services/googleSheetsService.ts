export interface SubmissionPayload {
  studentName: string;
  studentEmail: string;
  submissionId: string | number;
  formId: string | number;
  summary?: string;
  responses: Record<string, any>;
}

const URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

export async function submitToGoogleWorkspace(payload: SubmissionPayload): Promise<{ ok: boolean; error?: string }> {
  if (!URL) {
    console.warn("VITE_GOOGLE_APPS_SCRIPT_URL is not configured.");
    return { ok: false, error: "Apps Script URL not set" };
  }

  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || 'Failed to append row to Google Sheet.');
  }
  return result;
}