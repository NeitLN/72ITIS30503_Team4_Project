import { getApiBaseUrl } from './api';

export type AuthUser = {
  id: string;
  name: string;
  full_name?: string;
  username?: string | null;
  email: string;
  role: 'customer' | 'admin' | 'seller';
};

export type AuthResponse = {
  success: boolean;
  data?: {
    token: string;
    user: AuthUser;
  };
  error?: {
    message: string;
  };
};

export const AUTH_TOKEN_KEY = 'stylehub:auth-token';
export const AUTH_USER_KEY = 'stylehub:auth-user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export async function loginUser(payload: Record<string, unknown>): Promise<AuthResponse> {
  const url = `${getApiBaseUrl()}/api/auth/login`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: { message: 'Network error or backend is offline' } };
  }
}

export async function registerUser(payload: Record<string, unknown>): Promise<AuthResponse> {
  const url = `${getApiBaseUrl()}/api/auth/register`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: { message: 'Network error or backend is offline' } };
  }
}

export async function fetchCurrentUser(token: string): Promise<AuthResponse> {
  const url = `${getApiBaseUrl()}/api/auth/me`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: { message: 'Network error or backend is offline' } };
  }
}

export async function logoutUser(token?: string): Promise<AuthResponse> {
  const url = `${getApiBaseUrl()}/api/auth/logout`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: { message: 'Network error or backend is offline' } };
  }
}
