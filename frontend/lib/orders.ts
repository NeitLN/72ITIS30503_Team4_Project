import { getApiBaseUrl } from './api';
import { getStoredToken } from './auth';

export async function createOrder(payload: Record<string, unknown>) {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}/api/orders`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: { message: 'Network error or backend is offline' } };
  }
}
