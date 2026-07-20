import { getApiBaseUrl } from './api';
import { getStoredToken } from './auth';

export type CircularLifecycle = 'deadstock' | 'pre_loved' | 'repaired' | 'upcycled';
export type CircularBreakdown = Record<CircularLifecycle, number>;

interface ImpactBase {
  methodologyVersion: '1.0';
  generatedAt: string;
  activeLifecycleBreakdown: CircularBreakdown;
}

export interface PlatformImpact extends ImpactBase {
  scope: 'platform';
  metrics: {
    activeUserListings: number;
    activeJourneyListings: number;
    journeyCoveragePercent: number;
    activeCircularListings: number;
    completedCircularUnits: number;
  };
  completedLifecycleBreakdown: CircularBreakdown;
}

export interface ProfileImpact extends ImpactBase {
  scope: 'profile';
  metrics: {
    activeUserListings: number;
    activeJourneyListings: number;
    journeyCoveragePercent: number;
    activeCircularListings: number;
    circularUnitsSold: number;
    circularUnitsPurchased: number;
  };
  soldLifecycleBreakdown: CircularBreakdown;
  purchasedLifecycleBreakdown: CircularBreakdown;
}

export interface PublicSellerImpact extends ImpactBase {
  scope: 'public_seller';
  metrics: {
    activeCircularListings: number;
    completedCircularUnitsSold: number;
  };
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: { message: string } };

async function readImpact<T>(path: string, token?: string | null): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok || !body.success) {
    throw new Error(!body.success ? body.error.message : 'Không thể tải dữ liệu tác động.');
  }
  return body.data;
}

export function getPlatformImpact() {
  return readImpact<PlatformImpact>('/api/sustainability/impact');
}

export function getMyImpact() {
  return readImpact<ProfileImpact>('/api/profile/me/impact', getStoredToken());
}

export function getPublicSellerImpact(username: string) {
  return readImpact<PublicSellerImpact>(`/api/sellers/${encodeURIComponent(username)}/impact`);
}
