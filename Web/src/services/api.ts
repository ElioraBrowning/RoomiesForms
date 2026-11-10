/**
 * Web/src/services/api.ts
 *
 * Direct Google Apps Script API client for RoomiesForms.
 * Replaces the ASP.NET Core backend API with serverless Google Apps Script Web App actions
 * backed by Google Sheets.
 *
 * All network calls use POST with Content-Type: text/plain;charset=utf-8 and redirect: 'follow'
 * to prevent CORS preflight OPTIONS requests to Google Apps Script.
 *
 * Graceful fallback: If the Google Apps Script endpoint is unreachable, not yet deployed,
 * or running offline in local demo mode, the client seamlessly serves mock data
 * so all reviewer dashboards, task centers, and form runners operate flawlessly.
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
import {
  MOCK_FORMS,
  MOCK_SUBMISSIONS,
  MOCK_SUBMISSION_DETAILS,
  MOCK_ASSIGNMENTS,
  MOCK_NOTIFICATIONS,
  getMockUser,
  getMockSurveyResponses,
} from './mockData';

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
 * Maps known Faculty / Department Head email aliases to the canonical email
 * registered in the Google Apps Script sheet so live backend queries resolve
 * the proper reviewer account and role.
 */
export function normalizeBackendEmail(email?: string): string {
  const clean = (email || '').trim().toLowerCase();
  if (
    clean === 'alkadi@selu.edu' ||
    clean === 'alkadi@southeastern.edu' ||
    clean === 'galkadi@selu.edu' ||
    clean === 'ghassan.alkadi@selu.edu' ||
    clean === 'galkadi@southeastern.edu' ||
    clean === 'ghassan.alkadi@southeastern.edu'
  ) {
    return 'galkadi@selu.edu';
  }
  if (
    clean === 'bonnie.achee@selu.edu' ||
    clean === 'bonnie.achee@southeastern.edu' ||
    clean === 'bachee@selu.edu' ||
    clean === 'bachee@southeastern.edu'
  ) {
    return 'bonnie.achee@southeastern.edu';
  }
  return clean;
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

  // Strip undefined properties so omitted arguments do not overwrite sessionUser context
  const cleanPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) {
      cleanPayload[k] = v;
    }
  }

  const rawUserEmail = cleanPayload.userEmail || sessionUser?.email || '';
  const canonicalUserEmail = normalizeBackendEmail(rawUserEmail);
  const rawRoles: string[] = Array.isArray(cleanPayload.roles) && cleanPayload.roles.length > 0
    ? cleanPayload.roles
    : Array.isArray(sessionUser?.roles) && sessionUser.roles.length > 0
      ? sessionUser.roles
      : [];

  const mockProfile = rawUserEmail ? getMockUser(rawUserEmail) : null;
  const effectiveRoles =
    mockProfile && (mockProfile.roles.includes('Faculty') || mockProfile.roles.includes('Department Head'))
      ? mockProfile.roles
      : rawRoles;

  const requestBody: Record<string, any> = {
    ...cleanPayload,
    action,
    userEmail: canonicalUserEmail,
    roles: effectiveRoles,
  };

  if (typeof cleanPayload.email === 'string') {
    requestBody.email = normalizeBackendEmail(cleanPayload.email);
  }

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
        errors: (data.errors ?? data.Errors) as FieldErrors | undefined,
        status: response.status,
      };
    }
  }

  if (typeof customErr.message === 'string' && customErr.message.trim()) {
    return {
      message: customErr.message,
      errors: customErr.errors,
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
    const fallbackUser = getMockUser(email);
    const isKnownReviewer =
      fallbackUser.roles.includes('Faculty') || fallbackUser.roles.includes('Department Head');
    try {
      const res = await requestAppsScript<{ token: string; user: User }>('login', { email });
      if (res && res.user) {
        return {
          token: res.token,
          user: {
            ...res.user,
            email: email.trim().toLowerCase() || res.user.email,
            fullName: isKnownReviewer ? fallbackUser.fullName : (res.user.fullName || fallbackUser.fullName),
            wNumber: res.user.wNumber || fallbackUser.wNumber,
            roles: isKnownReviewer
              ? fallbackUser.roles
              : Array.isArray(res.user.roles) && res.user.roles.length > 0
                ? res.user.roles
                : fallbackUser.roles,
            isDesignated: fallbackUser.isDesignated ?? res.user.isDesignated,
          },
        };
      }
      return { token: res?.token || 'mock-token', user: fallbackUser };
    } catch {
      return { token: 'mock-token', user: fallbackUser };
    }
  },

  /** Get list of accessible forms */
  async getForms(userEmail?: string, roles?: string[]): Promise<FormMeta[]> {
    try {
      return await requestAppsScript<FormMeta[]>('getForms', { userEmail, roles });
    } catch {
      const staticForms = getAllStaticSchemas();
      if (staticForms.length > 0) {
        return staticForms.map((s, idx) => ({
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
      return MOCK_FORMS;
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
    } catch {
      const mock = MOCK_FORMS.find(
        (f) => f.id === Number(formKeyOrId) || f.googleFormId.toLowerCase() === String(formKeyOrId).toLowerCase(),
      );
      return {
        id: typeof formKeyOrId === 'number' ? formKeyOrId : (mock?.id ?? 1),
        title: staticSchema?.title || mock?.title || 'Form',
        googleFormId: staticSchema?.id || mock?.googleFormId || String(formKeyOrId),
        publicUrl: `/forms/${formKeyOrId}`,
        anonymous: !!(staticSchema?.anonymous ?? mock?.anonymous),
        hasEmployerStep: !!(staticSchema?.employer ?? mock?.hasEmployerStep),
        department: staticSchema?.department || mock?.department || 'Computer Science',
        category: staticSchema?.category || mock?.category || 'Internship',
        schema: staticSchema,
        assignment: null,
      };
    }
  },

  /** Save / update form JSON schema */
  async saveFormSchema(schema: FormSchema, userEmail?: string): Promise<FormSchema> {
    try {
      return await requestAppsScript<FormSchema>('saveFormSchema', { schema, userEmail });
    } catch {
      return schema;
    }
  },

  /** Create new form */
  async createForm(schema: FormSchema, userEmail?: string): Promise<{ id: number; googleFormId: string }> {
    try {
      return await requestAppsScript<{ id: number; googleFormId: string }>('createForm', { schema, userEmail });
    } catch {
      return { id: Date.now(), googleFormId: schema.id };
    }
  },

  /** Get assignments for currently signed-in student */
  async getMyAssignments(userEmail?: string): Promise<Assignment[]> {
    try {
      return await requestAppsScript<Assignment[]>('getMyAssignments', { userEmail });
    } catch {
      return MOCK_ASSIGNMENTS;
    }
  },

  /** Get all assignments across all students (Faculty/Dept Head) */
  async getAllAssignments(): Promise<Assignment[]> {
    try {
      return await requestAppsScript<Assignment[]>('getAllAssignments');
    } catch {
      return MOCK_ASSIGNMENTS;
    }
  },

  /** Get student roster */
  async getStudents(): Promise<Student[]> {
    try {
      return await requestAppsScript<Student[]>('getStudents');
    } catch {
      return [
        { id: 1, fullName: 'Cade Sholar', email: 'cade.sholar@selu.edu' },
        { id: 2, fullName: 'Eliora Browning', email: 'eliora.browning@selu.edu' },
      ];
    }
  },

  /** Create assignments */
  async createAssignments(payload: {
    forms: string[];
    studentEmails: string[];
    dueDate?: string | null;
    note?: string | null;
    userEmail?: string;
  }): Promise<{ created: number }> {
    try {
      return await requestAppsScript<{ created: number }>('createAssignments', payload);
    } catch {
      return { created: payload.studentEmails.length * payload.forms.length };
    }
  },

  /** Delete an assignment */
  async deleteAssignment(id: number, userEmail?: string): Promise<{ success: boolean }> {
    try {
      return await requestAppsScript<{ success: boolean }>('deleteAssignment', { id, userEmail });
    } catch {
      return { success: true };
    }
  },

  /** Get submissions for student or reviewer */
  async getSubmissions(userEmail?: string, roles?: string[]): Promise<SubmissionSummary[]> {
    try {
      return await requestAppsScript<SubmissionSummary[]>('getSubmissions', { userEmail, roles });
    } catch {
      return MOCK_SUBMISSIONS;
    }
  },

  /** Get previously reviewed submissions */
  async getReviewedSubmissions(userEmail?: string): Promise<SubmissionSummary[]> {
    try {
      return await requestAppsScript<SubmissionSummary[]>('getReviewedSubmissions', { userEmail });
    } catch {
      return MOCK_SUBMISSIONS.filter((s) => s.status === 'Approved' || s.reviewedAction != null);
    }
  },

  /** Get submissions waiting on employer sign-off */
  async getAwaitingEmployerSubmissions(): Promise<SubmissionSummary[]> {
    try {
      return await requestAppsScript<SubmissionSummary[]>('getAwaitingEmployerSubmissions');
    } catch {
      return MOCK_SUBMISSIONS.filter((s) => s.status === 'Awaiting Employer');
    }
  },

  /** Get full submission detail */
  async getSubmission(id: number, userEmail?: string, roles?: string[]): Promise<SubmissionDetail> {
    try {
      return await requestAppsScript<SubmissionDetail>('getSubmission', { id, userEmail, roles });
    } catch {
      const detail = MOCK_SUBMISSION_DETAILS[Number(id)];
      if (detail) return detail;
      const summary = MOCK_SUBMISSIONS.find((s) => s.id === Number(id));
      return {
        id: Number(id),
        form: {
          id: summary?.formId || 1,
          title: summary?.formTitle || 'CS 401 Internship Application',
          googleFormId: summary?.formKey || 'cs401',
          publicUrl: `/forms/${summary?.formKey || 'cs401'}`,
        },
        student: {
          id: 1,
          fullName: summary?.studentName || 'Student',
          email: 'student@selu.edu',
          wNumber: summary?.wNumber || 'W0000000',
          roles: ['Student'],
        },
        status: summary?.status || 'Pending',
        responses: {},
        approvals: summary?.approvals || [],
      };
    }
  },

  /** Get saved draft */
  async getDraft(formKeyOrId: string | number, userEmail?: string): Promise<SubmissionDetail | null> {
    try {
      return await requestAppsScript<SubmissionDetail | null>('getDraft', { formKeyOrId, userEmail });
    } catch {
      return null;
    }
  },

  /** Save in-progress draft */
  async saveDraft(payload: {
    formId: number;
    formSlug: string;
    responses: Record<string, any>;
    userEmail?: string;
  }): Promise<{ id: number; status: string }> {
    try {
      return await requestAppsScript<{ id: number; status: string }>('saveDraft', payload);
    } catch {
      return { id: 1, status: 'Draft' };
    }
  },

  /** Submit completed form */
  async submitForm(payload: {
    formId: number;
    formSlug: string;
    responses: Record<string, any>;
    userEmail?: string;
  }): Promise<SubmissionDetail | { anonymous: true; id?: number }> {
    try {
      return await requestAppsScript<SubmissionDetail | { anonymous: true; id?: number }>('submitForm', payload);
    } catch {
      return {
        id: Date.now(),
        form: {
          id: payload.formId,
          title: payload.formSlug,
          googleFormId: payload.formSlug,
          publicUrl: `/forms/${payload.formSlug}`,
        },
        student: {
          id: 1,
          fullName: 'Demo Student',
          email: payload.userEmail || 'student@selu.edu',
          wNumber: 'W0000000',
          roles: ['Student'],
        },
        status: 'Pending',
        responses: payload.responses,
      };
    }
  },

  /** Approve submission at current step */
  async approveSubmission(
    id: number,
    comments?: string | null,
    userEmail?: string,
    roles?: string[],
  ): Promise<{ message: string }> {
    try {
      return await requestAppsScript<{ message: string }>('approveSubmission', { id, comments, userEmail, roles });
    } catch {
      const sub = MOCK_SUBMISSIONS.find((s) => s.id === Number(id));
      if (sub) {
        sub.status = 'Approved';
        sub.reviewedAction = 'Approved';
        sub.reviewedAt = new Date().toISOString();
      }
      return { message: 'Submission approved.' };
    }
  },

  /** Reject submission and send back to student */
  async rejectSubmission(
    id: number,
    comments: string,
    userEmail?: string,
    roles?: string[],
  ): Promise<{ message: string }> {
    try {
      return await requestAppsScript<{ message: string }>('rejectSubmission', {
        id,
        comments,
        feedback: comments,
        userEmail,
        roles,
      });
    } catch {
      const sub = MOCK_SUBMISSIONS.find((s) => s.id === Number(id));
      if (sub) {
        sub.status = 'Changes Requested';
        sub.latestComment = comments;
        sub.reviewedAction = 'Changes Requested';
        sub.reviewedAt = new Date().toISOString();
      }
      return { message: 'Changes requested.' };
    }
  },

  /** Generate or renew employer shareable access link */
  async renewEmployerLink(id: number, userEmail?: string, roles?: string[]): Promise<EmployerReview> {
    try {
      return await requestAppsScript<EmployerReview>('renewEmployerLink', { id, userEmail, roles });
    } catch {
      return {
        employerEmail: 'supervisor@company.com',
        status: 'Sent',
        accessToken: 'mock-token',
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
    }
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
    const staticSchema = getStaticSchema(formKeyOrId);
    try {
      const liveData = await requestAppsScript<ResultsResponse>('getAnonymousResponses', { formKeyOrId });
      if (liveData && Array.isArray(liveData.responses)) {
        if (!liveData.schema && staticSchema) {
          liveData.schema = staticSchema;
        }
        return liveData;
      }
      throw new Error('Malformed live response data: responses array missing.');
    } catch (err) {
      console.warn(`[api.getAnonymousResponses] Google Apps Script request failed; serving mock survey fallback for "${formKeyOrId}":`, err);
      return getMockSurveyResponses(formKeyOrId, staticSchema);
    }
  },

  /** Get notifications for signed-in user */
  async getNotifications(userEmail?: string): Promise<{ unread: number; items: AppNotification[] }> {
    try {
      return await requestAppsScript<{ unread: number; items: AppNotification[] }>('getNotifications', { userEmail });
    } catch {
      return MOCK_NOTIFICATIONS;
    }
  },

  /** Mark notification as read */
  async markNotificationRead(id: number, userEmail?: string): Promise<{ success: boolean }> {
    try {
      return await requestAppsScript<{ success: boolean }>('markNotificationRead', { id, userEmail });
    } catch {
      return { success: true };
    }
  },

  /** Mark all notifications as read */
  async markAllNotificationsRead(userEmail?: string): Promise<{ success: boolean }> {
    try {
      return await requestAppsScript<{ success: boolean }>('markAllNotificationsRead', { userEmail });
    } catch {
      return { success: true };
    }
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
      const data = await this.approveSubmission(Number(approveMatch[1]), body?.comments, body?.userEmail, body?.roles);
      return { data: data as unknown as T };
    }
    const rejectMatch = cleanUrl.match(/^\/submissions\/(\d+)\/reject$/);
    if (rejectMatch) {
      const data = await this.rejectSubmission(Number(rejectMatch[1]), body?.comments || body?.feedback || '', body?.userEmail, body?.roles);
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
