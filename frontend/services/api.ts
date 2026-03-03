import { config } from '@/services/config';
import type {
  Alert,
  GoogleLoginRequest,
  GoogleLoginResponse,
  Poi,
  RouteRequest,
  RouteResponse,
  UserPreferenceRecord,
} from '@/types/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const fallback = await response.text();
    throw new Error(fallback || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  getPois: () => request<Poi[]>('/poi'),
  getAlerts: () => request<Alert[]>('/alerts'),
  createRoute: (payload: RouteRequest) =>
    request<RouteResponse>('/route', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPreferences: (userId: string) =>
    request<UserPreferenceRecord>(`/user/preferences?user_id=${encodeURIComponent(userId)}`),
  setPreferences: (record: UserPreferenceRecord) =>
    request<UserPreferenceRecord>('/user/preferences', {
      method: 'POST',
      body: JSON.stringify(record),
    }),
  loginWithGoogle: (payload: GoogleLoginRequest) =>
    request<GoogleLoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
