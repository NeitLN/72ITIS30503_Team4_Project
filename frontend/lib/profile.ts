import { getApiBaseUrl } from './api';
import { getStoredToken } from './auth';

export interface MyProfile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export type ProfileResponse =
  | { success: true; data: MyProfile }
  | { success: false; error: { message: string; details?: Record<string, string> } };

function authHeaders(extra?: Record<string, string>) {
  const token = getStoredToken();
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function getMyProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/profile/me`, { headers: authHeaders() });
  return res.json();
}

export async function updateMyProfile(fields: {
  display_name?: string;
  username?: string;
  bio?: string;
  location?: string;
}): Promise<ProfileResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/profile/me`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(fields),
  });
  return res.json();
}

/**
 * Multipart upload — deliberately does NOT set Content-Type so the browser
 * generates the multipart boundary itself (same pattern as lib/products.ts).
 */
export async function uploadAvatar(file: File): Promise<ProfileResponse> {
  const form = new FormData();
  form.append('avatar', file);
  const res = await fetch(`${getApiBaseUrl()}/api/profile/me/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return res.json();
}
