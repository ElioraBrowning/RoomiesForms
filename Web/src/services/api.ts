import axios from 'axios';
import type { FieldErrors } from '../forms/types';
import {
  MOCK_FORMS,
  MOCK_SUBMISSIONS,
  MOCK_SUBMISSION_DETAILS,
  MOCK_ASSIGNMENTS,
  MOCK_NOTIFICATIONS,
  getMockUser,
} from './mockData';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Automatically inject JWT token into all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// OFFLINE / LIVE-DEMO FALLBACK INTERCEPTOR
// When the backend is running, this interceptor does nothing and passes real data.
// If the backend is unreachable (network error), it safely serves mock data
// so presentations and local UI development continue uninterrupted.
// ============================================================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only intercept true network errors (backend offline / connection refused)
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
    if (!isNetworkError) {
      return Promise.reject(error);
    }

    const url = error.config?.url || '';
    const method = (error.config?.method || 'get').toLowerCase();
    const cleanUrl = url.replace(/^\/api/, '').replace(/^\//, '');

    console.warn(`[RoomiesForms Offline Fallback] Backend offline. Providing mock data for: [${method.toUpperCase()}] ${cleanUrl}`);

    // POST /auth/login
    if (cleanUrl.startsWith('auth/login') && method === 'post') {
      let email = 'cade.sholar@selu.edu';
      try {
        if (typeof error.config.data === 'string') {
          const parsed = JSON.parse(error.config.data);
          if (parsed.email) email = parsed.email;
        } else if (error.config.data?.email) {
          email = error.config.data.email;
        }
      } catch {
        // use default email
      }
      const user = getMockUser(email);
      return Promise.resolve({
        data: {
          token: 'offline-demo-token',
          user,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      });
    }

    // GET /assignments or /assignments/mine or /assignments/students
    if (cleanUrl.startsWith('assignments') && method === 'get') {
      if (cleanUrl.includes('students')) {
        return Promise.resolve({
          data: [
            { id: 1, fullName: 'Cade Sholar', email: 'cade.sholar@selu.edu' },
            { id: 2, fullName: 'Eliora Browning', email: 'eliora.browning@selu.edu' },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
        });
      }
      return Promise.resolve({ data: MOCK_ASSIGNMENTS, status: 200, statusText: 'OK', headers: {}, config: error.config });
    }

    // GET /notifications
    if (cleanUrl.startsWith('notifications') && method === 'get') {
      return Promise.resolve({ data: MOCK_NOTIFICATIONS, status: 200, statusText: 'OK', headers: {}, config: error.config });
    }

    // GET /forms or /forms/:id
    if (cleanUrl.startsWith('forms') && method === 'get') {
      const parts = cleanUrl.split('/');
      if (parts.length > 1 && parts[1]) {
        const idOrSlug = parts[1];
        const form =
          MOCK_FORMS.find((f) => f.id === Number(idOrSlug) || f.googleFormId.toLowerCase() === idOrSlug.toLowerCase()) ||
          MOCK_FORMS[0];
        return Promise.resolve({ data: form, status: 200, statusText: 'OK', headers: {}, config: error.config });
      }
      return Promise.resolve({ data: MOCK_FORMS, status: 200, statusText: 'OK', headers: {}, config: error.config });
    }

    // GET /submissions/reviewed
    if (cleanUrl.includes('submissions/reviewed') && method === 'get') {
      const reviewed = MOCK_SUBMISSIONS.filter((s) => s.status === 'Completed' || s.status === 'Approved');
      return Promise.resolve({ data: reviewed, status: 200, statusText: 'OK', headers: {}, config: error.config });
    }

    // GET /submissions/awaiting-employer
    if (cleanUrl.includes('submissions/awaiting-employer') && method === 'get') {
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config: error.config });
    }

    // GET /submissions/drafts/:id
    if (cleanUrl.startsWith('submissions/drafts') && method === 'get') {
      const parts = cleanUrl.split('/');
      const formId = Number(parts[2]);
      const detail = Object.values(MOCK_SUBMISSION_DETAILS).find((d) => d.form.id === formId && d.status === 'Draft');
      return Promise.resolve({
        data: detail ? { id: detail.id, responses: detail.responses, status: detail.status } : null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      });
    }

    // GET /submissions or /submissions/:id
    if (cleanUrl.startsWith('submissions') && method === 'get') {
      const parts = cleanUrl.split('/');
      if (parts.length > 1 && parts[1] && parts[1] !== 'queue') {
        const id = Number(parts[1]);
        const detail = MOCK_SUBMISSION_DETAILS[id] || {
          id,
          form: MOCK_FORMS[0],
          student: getMockUser('cade.sholar@selu.edu'),
          status: 'Pending',
          responses: {},
        };
        return Promise.resolve({ data: detail, status: 200, statusText: 'OK', headers: {}, config: error.config });
      }

      // Check current user role to see if faculty queue vs student submissions
      const savedUserStr = localStorage.getItem('user');
      let isFaculty = false;
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          isFaculty = u.roles?.includes('Faculty') || u.roles?.includes('Department Head');
        } catch {
          // ignore
        }
      }

      const submissions = isFaculty
        ? MOCK_SUBMISSIONS.filter((s) => s.status === 'Pending' || s.status === 'Rejected')
        : MOCK_SUBMISSIONS;

      return Promise.resolve({ data: submissions, status: 200, statusText: 'OK', headers: {}, config: error.config });
    }

    // POST /submissions or POST /submissions/drafts
    if (cleanUrl.startsWith('submissions') && method === 'post') {
      return Promise.resolve({
        data: { id: Date.now(), message: 'Offline submission saved successfully' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      });
    }

    // PUT /submissions/:id/review
    if (cleanUrl.includes('review') && method === 'put') {
      return Promise.resolve({
        data: { message: 'Offline review recorded successfully' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      });
    }

    // Fallback for any other unhandled endpoint
    return Promise.resolve({
      data: { message: 'Offline simulated response' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: error.config,
    });
  }
);

/** A readable message and any per-question errors from a failed request. */
export function readApiError(err: unknown, fallback = 'Something went wrong. Try again.'): { message: string; errors?: FieldErrors; status?: number } {
  const response = (err as { response?: { status?: number; data?: unknown } })?.response;
  if (!response) {
    return { message: "Couldn't reach the server. Check that the backend is running." };
  }
  const data = response.data as { message?: string; Message?: string; errors?: FieldErrors; Errors?: FieldErrors } | string | undefined;
  if (typeof data === 'string' && data.trim()) return { message: data, status: response.status };
  if (data && typeof data === 'object') {
    return {
      message: data.message ?? data.Message ?? fallback,
      errors: data.errors ?? data.Errors,
      status: response.status,
    };
  }
  return { message: fallback, status: response.status };
}

export default api;
