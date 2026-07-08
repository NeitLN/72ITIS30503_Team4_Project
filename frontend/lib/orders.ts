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

export async function listAllOrdersForAdmin() {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}/api/orders`;

  try {
    const res = await fetch(url, {
      method: 'GET',
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

export async function updateOrderStatus(orderId: string, status: string) {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}/api/orders/${orderId}/status`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: { message: 'Network error or backend is offline' } };
  }
}

export async function listMyOrders() {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}/api/orders/my`;

  try {
    const res = await fetch(url, {
      method: 'GET',
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

export async function validateCoupon(payload: { code: string; items: Record<string, unknown>[] }) {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}/api/orders/validate-coupon`;

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
