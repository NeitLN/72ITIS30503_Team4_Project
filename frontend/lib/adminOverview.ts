import { apiFetch } from './api';
import { getStoredToken } from './auth';

export interface AdminOverviewData {
  generatedAt: string;
  metrics: {
    totalUsers: number;
    activeSellers: number;
    activeProducts: number;
    totalOrders: number;
    totalTransactions: number;
    transactionValue: number;
  };
  attention: {
    pendingTransactions: number;
    processingOrders: number;
    failedPayments: number;
    cancellationRequests: number;
  };
  transactionStatuses: {
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  recentOrders: {
    id: string;
    order_code: string;
    buyer_name: string;
    seller_count: number;
    status: string;
    payment_method: string;
    total_amount: number;
    created_at: string;
  }[];
  recentTransactions: {
    id: string;
    order_id: string;
    order_code: string;
    state: string;
    payment_method: string;
    amount: number;
    created_at: string;
  }[];
  marketplaceActivity: {
    activeProducts: number;
    newProducts7d: number;
    soldProducts: number;
    hiddenProducts: number;
    newSellers7d: number;
    completedOrders7d: number;
  };
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const token = getStoredToken();
  const res = await apiFetch<{ success: boolean; data: AdminOverviewData }>('/api/admin/overview', {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.data;
}
