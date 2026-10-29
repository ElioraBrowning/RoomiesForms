import axios from 'axios';
import type { FieldErrors } from '../forms/types';

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
