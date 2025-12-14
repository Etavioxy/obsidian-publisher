/**
 * API Client - Handle all server communication
 */

import { authStore, LoginResponse } from './state/auth';

const API_BASE = typeof window !== 'undefined' && window.location.origin
  ? `${window.location.origin}/api`
  : 'http://localhost:8080/api';

const AUTH_BASE = typeof window !== 'undefined' && window.location.origin
  ? `${window.location.origin}/auth`
  : 'http://localhost:8080/auth';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make authenticated request with token in header
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = authStore.getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid, clear auth
    authStore.clear();
  }

  return response;
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = `HTTP ${response.status}`;

    try {
      const data = await response.json();
      errorCode = data.code || errorCode;
      errorMessage = data.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(response.status, errorCode, errorMessage);
  }

  return response.json();
}

/**
 * Auth APIs
 */
export const authAPI = {
  async register(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  async me() {
    const response = await fetchWithAuth(`${AUTH_BASE}/me`);
    return handleResponse(response);
  },
};

/**
 * User APIs
 */
export const userAPI = {
  async getProfile() {
    const response = await fetchWithAuth(`${API_BASE}/../user/profile`);
    return handleResponse(response);
  },

  async updateProfile(username: string) {
    const response = await fetchWithAuth(`${API_BASE}/../user/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return handleResponse(response);
  },

  async getStats() {
    const response = await fetchWithAuth(`${API_BASE}/../user/stats`);
    return handleResponse(response);
  },

  async deleteAccount() {
    const response = await fetchWithAuth(`${API_BASE}/../user/account`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

/**
 * Sites APIs
 */
export const sitesAPI = {
  async listAll() {
    const response = await fetch(`${API_BASE}/sites`);
    return handleResponse(response);
  },

  async upload(formData: FormData) {
    const response = await fetchWithAuth(`${API_BASE}/sites`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async update(siteId: string, description: string) {
    const response = await fetchWithAuth(`${API_BASE}/sites/${siteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    return handleResponse(response);
  },

  async delete(siteId: string) {
    const response = await fetchWithAuth(`${API_BASE}/sites/${siteId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};
