import { getApiBaseUrl } from './api';
import { getStoredToken } from './auth';

export interface CreateListingResult {
  id: string;
  slug: string;
  name: string;
  status: string;
  thumbnail: string;
}

export type CreateListingResponse =
  | { success: true; data: CreateListingResult }
  | { success: false; error: { message: string; details?: Record<string, string> } };

/**
 * Submits a new listing as multipart/form-data. Deliberately does NOT set a
 * Content-Type header — the browser must generate the multipart boundary
 * itself. The Supabase access/session concept doesn't apply here: this app
 * authenticates via the existing backend-issued Bearer token (see
 * hooks/useAuth.tsx), attached the same way every other authenticated
 * request (e.g. lib/orders.ts) already does.
 */
export async function createListing(formData: FormData): Promise<CreateListingResponse> {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}/api/products`;

  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  return data;
}
