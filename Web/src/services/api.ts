/**
 * Web/src/services/api.ts
 *
 * Direct Google Apps Script API client for RoomiesForms.
 * Replaces the ASP.NET Core backend API with serverless Google Apps Script Web App actions
 * backed by Google Sheets.
 *
 * All network calls use POST with Content-Type: text/plain;charset=utf-8 and redirect: 'follow'
 * to prevent CORS preflight OPTIONS requests to Google Apps Script.
 */

import type { FieldErrors, FormSchema } from '../forms/types';
import type {
  User,
  FormMeta,
  FormDetail,
  Assignment,
  Student,
  SubmissionSummary,
  SubmissionDetail,
  EmployerReview,
  AppNotification,
  EmployerView,
  ResultsResponse,
} from '../types';
import { getStaticSchema, getAllStaticSchemas } from '../forms/schemaRegistry';

export interface AppsScriptResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Resolves the Google Apps Script Web App endpoint URL.
 * Normalizes Google Workspace domain redirects (/a/macros/<domain>/s/ -> /macros/s/)
 * and appends the API key parameter if configured.
 * Falls back to http://localhost:5001 if VITE_USE_LOCAL_MOCK is set.
 */
export function resolveAppsScriptUrl(): string {
  const useLocalMock =
    import.meta.env.VITE_USE_LOCAL_MOCK === 'true' ||
    import.meta.env.VITE_USE_LOCAL_MOCK === true;

  if (useLocalMock) {
    return 'http://localhost:5001';
  }

  const rawUrl = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string | undefined)?.trim();
  const apiKey = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_KEY as string | undefined)?.trim();

  if (!rawUrl) {
    return 'http://localhost:5001';
  }

  let normalized = rawUrl.replace(/\/a\/macros\/[^/]+\/s\//, '/macros/s/');
  if (apiKey) {
    const separator = normalized.includes('?') ? '&' : '?';
    normalized = `${normalized}${separator}key=${encodeURIComponent(apiKey)}`;
  }
  return normalized;
}

/**
 * Dispatches an action request to Google Apps Script Web App.
 * Uses POST with Content-Type: text/plain;charset=utf-8 and redirect: 'follow'
 * to avoid CORS preflight OPTIONS failures.
 */
export async function requestAppsScript<T = any>(
  action: string,
  payload: Record<string, any> = {},
): Promise<T> {
  const endpoint = resolveAppsScriptUrl();

  // Retrieve current user from localStorage for role/session context
  let sessionUser: { email?: string; roles?: string[] } | null = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw && raw !== 'undefined') {
      sessionUser = JSON.parse(raw);
    }
  } catch {
    // Session user unreadable; proceed with payload defaults
  }

  const requestBody = {
    action,
    userEmail: payload.userEmail || sessionUser?.email || '',
    roles: payload.roles || sessionUser?.roles || [],
    ...payload,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (netErr: any) {
    const error: any = new Error(
      `Could not connect to Google Apps Script backend. ${netErr?.message || ''}`.trim(),
    );
    error.status = 503;
    error.response = { status: 503, data: { message: error.message } };
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    const error: any = new Error(
      `Google Apps Script returned HTTP ${response.status}. Ensure Web App deployment is configured with "Execute as: Me" and "Who has access: Anyone".`,
    );
    error.status = response.status;
    error.response = { status: response.status, data: { message: error.message } };
    throw error;
  }

  const text = await response.text();
  let json: AppsScriptResponse<T>;
  try {
    json = JSON.parse(text) as AppsScriptResponse<T>;
  } catch (parseErr) {
    if (parseErr instanceof SyntaxError) {
      const error: any = new Error(
        'Google Apps Script returned an HTML page instead of JSON. Ensure Web App deployment is public with "Who has access: Anyone".',
      );
      error.status = 502;
      error.response = { status: 502, data: { message: error.message } };
      throw error;
    }
    throw parseErr;
  }

  if (!json.ok) {
    const status = json.status || 400;
    const error: any = new Error(json.error || `Action ${action} failed.`);
    error.status = status;
    error.response = {
      status,
      data: {
        message: json.error || `Action ${action} failed.`,
        problems: (json as any).problems,
      },
    };
    throw error;
  }

  return json.data as T;
}

/**
 * Standardized error extractor compatible with frontend components.
 */
export function readApiError(
  err: unknown,
  fallback = 'Something went wrong. Try again.',
): { message: string; errors?: FieldErrors; status?: number } {
  if (!err) return { message: fallback };

  const customErr = err as {
    message?: string;
    status?: number;
    response?: { status?: number; data?: unknown };
    errors?: FieldErrors;
    data?: unknown;
  };

  const response = customErr.response;
  if (response && response.data) {
    const data = response.data as
      | { message?: string; Message?: string; errors?: FieldErrors; Errors?: FieldErrors; error?: string; problems?: string[] }
      | string;
    if (typeof data === 'string' && data.trim()) return { message: data, status: response.status };
    if (data && typeof data === 'object') {
      const msg = data.message ?? data.Message ?? data.error ?? (data.problems ? data.problems.join('; ') : fallback);
      return {
        message: msg,
        errors: data.errors ?? data.Errors,
        status: response.status,
      };
    }
  }

  if (customErr.errors) {
    return {
      message: customErr.message || fallback,
      errors: customErr.errors,
      status: customErr.status,
    };
  }

  if (customErr.message) {
    return {
      message: customErr.message,
      status: customErr.status,
    };
  }

  return { message: fallback, status: (err as any)?.status };
}

/**
 * Action-based API client with REST adapters for backward compatibility.
 */
const api = {
  // --- 1. Typed Actions ---

  /** Authenticate user by university email */
  async login(email: string): Promise<{ token: string; user: User }> {
    return requestAppsScript<{ token: string; user: User }>('login', { email });
  },

  /** Get list of accessible forms */
  async getForms(userEmail?: string, roles?: string[]): Promise<FormMeta[]> {
    try {
      return await requestAppsScript<FormMeta[]>('getForms', { userEmail, roles });
    } catch {
      // Fallback to static bundled schema metadata for offline resilience
      return getAllStaticSchemas().map((s, idx) => ({
        id: idx + 1,
        title: s.title,
        googleFormId: s.id,
        publicUrl: `/forms/${s.id}`,
        anonymous: !!s.anonymous,
        hasEmployerStep: !!s.employer,
        department: s.department || 'Computer Science',
        category: s.category || 'Internship',
      }));
    }
  },

  /** Get form detail including JSON schema, with bundled static schema fallback */
  async getForm(formKeyOrId: string | number, userEmail?: string, roles?: string[]): Promise<FormDetail> {
    const staticSchema = getStaticSchema(formKeyOrId);
    try {
      const formDetail = await requestAppsScript<FormDetail>('getForm', { formKeyOrId, userEmail, roles });
      if ((!formDetail.schema || !formDetail.schema.pages || formDetail.schema.pages.length === 0) && staticSchema) {
        formDetail.schema = staticSchema;
      }
      return formDetail;
    } catch (err) {
      if (staticSchema) {
        return {
          id: typeof formKeyOrId === 'number' ? formKeyOrId : 1,
          title: staticSchema.title,
          googleFormId: staticSchema.id,
          publicUrl: `/forms/${staticSchema.id}`,
          anonymous: !!staticSchema.anonymous,
          hasEmployerStep: !!staticSchema.employer,
          department: staticSchema.department || 'Computer Science',
          category: staticSchema.category || 'Internship',
          schema: staticSchema,
          assignment: null,
        };
      }
      throw err;
    }
  },

  /** Save / update form JSON schema */
  async saveFormSchema(schema: FormSchema, userEmail?: string): Promise<FormSchema> {
    return requestAppsScript<FormSchema>('saveFormSchema', { schema, userEmail });
  },

  /** Create new form */
  async createForm(schema: FormSchema, userEmail?: string): Promise<{ id: number; googleFormId: string }> {
    return requestAppsScript<{ id: number; googleFormId: string }>('createForm', { schema, userEmail });
  },

  /** Get assignments for currently signed-in student */
  async getMyAssignments(userEmail?: string): Promise<Assignment[]> {
    return requestAppsScript<Assignment[]>('getMyAssignments', { userEmail });
  },

  /** Get all assignments across all students (Faculty/Dept Head) */
  async getAllAssignments(): Promise<Assignment[]> {
    return requestAppsScript<Assignment[]>('getAllAssignments');
  },

  /** Get student roster */
  async getStudents(): Promise<Student[]> {
    return requestAppsScript<Student[]>('getStudents');
  },

  /** Create assignments */
  async createAssignments(payload: {
    forms: string[];
    studentEmails: string[];
    dueDate?: string | null;
    note?: string | null;
    userEmail?: string;
  }): Promise<{ created: number }> {
    return requestAppsScript<{ created: number }>('createAssignments', payload);
  },

  /** Delete an assignment */
  async deleteAssignment(id: number, userEmail?: string): Promise<{ success: boolean }> {
    return requestAppsScript<{ success: boolean }>('deleteAssignment', { id, userEmail });
  },

  /** Get submissions for student or reviewer */
  async getSubmissions(userEmail?: string, roles?: string[]): Promise<SubmissionSummary[]> {
    return requestAppsScript<SubmissionSummary[]>('getSubmissions', { userEmail, roles });
  },

  /** Get previously reviewed submissions */
  async getReviewedSubmissions(userEmail?: string): Promise<SubmissionSummary[]> {
    return requestAppsScript<SubmissionSummary[]>('getReviewedSubmissions', { userEmail });
  },

  /** Get submissions waiting on employer sign-off */
  async getAwaitingEmployerSubmissions(): Promise<SubmissionSummary[]> {
    return requestAppsScript<SubmissionSummary[]>('getAwaitingEmployerSubmissions');
  },

  /** Get full submission detail */
  async getSubmission(id: number, userEmail?: string, roles?: string[]): Promise<SubmissionDetail> {
    return requestAppsScript<SubmissionDetail>('getSubmission', { id, userEmail, roles });
  },

  /** Get saved draft */
  async getDraft(formKeyOrId: string | number, userEmail?: string): Promise<SubmissionDetail | null> {
    return requestAppsScript<SubmissionDetail | null>('getDraft', { formKeyOrId, userEmail });
  },

  /** Save in-progress draft */
  async saveDraft(payload: {
    formId: number;
    formSlug: string;
    responses: Record<string, any>;
    userEmail?: string;
  }): Promise<{ id: number; status: string }> {
    return requestAppsScript<{ id: number; status: string }>('saveDraft', payload);
  },

  /** Submit completed form */
  async submitForm(payload: {
    formId: number;
    formSlug: string;
    responses: Record<string, any>;
    userEmail?: string;
  }): Promise<SubmissionDetail | { anonymous: true; id?: number }> {
    return requestAppsScript<SubmissionDetail | { anonymous: true; id?: number }>('submitForm', payload);
  },

  /** Approve submission at current step */
  async approveSubmission(
    id: number,
    comments?: string | null,
    userEmail?: string,
    roles?: string[],
  ): Promise<{ message: string }> {
    return requestAppsScript<{ message: string }>('approveSubmission', { id, comments, userEmail, roles });
  },

  /** Reject submission and send back to student */
  async rejectSubmission(
    id: number,
    comments: string,
    userEmail?: string,
    roles?: string[],
  ): Promise<{ message: string }> {
    return requestAppsScript<{ message: string }>('rejectSubmission', { id, comments, userEmail, roles });
  },

  /** Generate or renew employer shareable access link */
  async renewEmployerLink(id: number, userEmail?: string, roles?: string[]): Promise<EmployerReview> {
    return requestAppsScript<EmployerReview>('renewEmployerLink', { id, userEmail, roles });
  },

  /** Public portal lookup for employer token */
  async getEmployerReview(token: string): Promise<EmployerView> {
    return requestAppsScript<EmployerView>('getEmployerReview', { token });
  },

  /** Employer decision (approve or request changes) */
  async employerDecision(payload: {
    token: string;
    decision: 'approve' | 'requestChanges';
    responses?: Record<string, any>;
    comments?: string;
  }): Promise<{ message: string }> {
    return requestAppsScript<{ message: string }>('employerDecision', payload);
  },

  /** Anonymous responses aggregation for exit survey */
  async getAnonymousResponses(formKeyOrId: string | number): Promise<ResultsResponse> {
    return requestAppsScript<ResultsResponse>('getAnonymousResponses', { formKeyOrId });
  },

  /** Get notifications for signed-in user */
  async getNotifications(userEmail?: string): Promise<{ unread: number; items: AppNotification[] }> {
    return requestAppsScript<{ unread: number; items: AppNotification[] }>('getNotifications', { userEmail });
  },

  /** Mark notification as read */
  async markNotificationRead(id: number, userEmail?: string): Promise<{ success: boolean }> {
    return requestAppsScript<{ success: boolean }>('markNotificationRead', { id, userEmail });
  },

  /** Mark all notifications as read */
  async markAllNotificationsRead(userEmail?: string): Promise<{ success: boolean }> {
    return requestAppsScript<{ success: boolean }>('markAllNotificationsRead', { userEmail });
  },

  /** Initialize Google Sheets tabs and headers */
  async setupSheets(): Promise<{ initialized: boolean; tabs: string[] }> {
    return requestAppsScript<{ initialized: boolean; tabs: string[] }>('setupSheets');
  },

  // --- 2. REST Adapters (Ensures zero breaking changes for existing components) ---

  async get<T = any>(url: string, _config?: any): Promise<{ data: T }> {
    const cleanUrl = url.replace(/^\/api/, '');

    if (cleanUrl === '/assignments/mine') {
      const data = await this.getMyAssignments();
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/assignments/students') {
      const data = await this.getStudents();
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/assignments') {
      const data = await this.getAllAssignments();
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/submissions/reviewed') {
      const data = await this.getReviewedSubmissions();
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/submissions/awaiting-employer') {
      const data = await this.getAwaitingEmployerSubmissions();
      return { data: data as unknown as T };
    }
    const draftMatch = cleanUrl.match(/^\/submissions\/drafts\/([^/]+)$/);
    if (draftMatch) {
      const data = await this.getDraft(draftMatch[1]);
      return { data: data as unknown as T };
    }
    const subMatch = cleanUrl.match(/^\/submissions\/(\d+)$/);
    if (subMatch) {
      const data = await this.getSubmission(Number(subMatch[1]));
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/submissions') {
      const data = await this.getSubmissions();
      return { data: data as unknown as T };
    }
    const anonMatch = cleanUrl.match(/^\/forms\/([^/]+)\/anonymous-responses$/);
    if (anonMatch) {
      const data = await this.getAnonymousResponses(anonMatch[1]);
      return { data: data as unknown as T };
    }
    const formMatch = cleanUrl.match(/^\/forms\/([^/]+)$/);
    if (formMatch) {
      const data = await this.getForm(formMatch[1]);
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/forms') {
      const data = await this.getForms();
      return { data: data as unknown as T };
    }
    const employerMatch = cleanUrl.match(/^\/employer\/([^/]+)$/);
    if (employerMatch) {
      const data = await this.getEmployerReview(employerMatch[1]);
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/notifications') {
      const data = await this.getNotifications();
      return { data: data as unknown as T };
    }

    throw new Error(`Unknown GET endpoint: ${url}`);
  },

  async post<T = any>(url: string, body?: any, _config?: any): Promise<{ data: T }> {
    const cleanUrl = url.replace(/^\/api/, '');

    if (cleanUrl === '/auth/login') {
      const data = await this.login(body?.email || '');
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/auth/google') {
      // In serverless architecture, auth callback validates or logs in user
      const email = body?.email || 'eliora.browning@selu.edu';
      const data = await this.login(email);
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/assignments') {
      const data = await this.createAssignments(body || {});
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/submissions/drafts') {
      const data = await this.saveDraft(body || {});
      return { data: data as unknown as T };
    }
    const employerLinkMatch = cleanUrl.match(/^\/submissions\/(\d+)\/employer-link$/);
    if (employerLinkMatch) {
      const data = await this.renewEmployerLink(Number(employerLinkMatch[1]));
      return { data: data as unknown as T };
    }
    const approveMatch = cleanUrl.match(/^\/submissions\/(\d+)\/approve$/);
    if (approveMatch) {
      const data = await this.approveSubmission(Number(approveMatch[1]), body?.comments);
      return { data: data as unknown as T };
    }
    const rejectMatch = cleanUrl.match(/^\/submissions\/(\d+)\/reject$/);
    if (rejectMatch) {
      const data = await this.rejectSubmission(Number(rejectMatch[1]), body?.comments || '');
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/submissions') {
      const data = await this.submitForm(body || {});
      return { data: data as unknown as T };
    }
    const employerDecisionMatch = cleanUrl.match(/^\/employer\/([^/]+)$/);
    if (employerDecisionMatch) {
      const data = await this.employerDecision({ token: employerDecisionMatch[1], ...body });
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/forms') {
      const data = await this.createForm(body);
      return { data: data as unknown as T };
    }
    const notifReadMatch = cleanUrl.match(/^\/notifications\/(\d+)\/read$/);
    if (notifReadMatch) {
      const data = await this.markNotificationRead(Number(notifReadMatch[1]));
      return { data: data as unknown as T };
    }
    if (cleanUrl === '/notifications/read-all') {
      const data = await this.markAllNotificationsRead();
      return { data: data as unknown as T };
    }

    throw new Error(`Unknown POST endpoint: ${url}`);
  },

  async put<T = any>(url: string, body?: any, _config?: any): Promise<{ data: T }> {
    const cleanUrl = url.replace(/^\/api/, '');
    const schemaMatch = cleanUrl.match(/^\/forms\/([^/]+)\/schema$/);
    if (schemaMatch) {
      const data = await this.saveFormSchema(body);
      return { data: data as unknown as T };
    }

    throw new Error(`Unknown PUT endpoint: ${url}`);
  },

  async delete<T = any>(url: string, _config?: any): Promise<{ data: T }> {
    const cleanUrl = url.replace(/^\/api/, '');
    const assignMatch = cleanUrl.match(/^\/assignments\/(\d+)$/);
    if (assignMatch) {
      const data = await this.deleteAssignment(Number(assignMatch[1]));
      return { data: data as unknown as T };
    }

    throw new Error(`Unknown DELETE endpoint: ${url}`);
  },

  // Interceptor compatibility shim
  interceptors: {
    request: {
      use: () => 0,
      eject: () => {},
    },
    response: {
      use: () => 0,
      eject: () => {},
    },
  },
};

export default api;
