import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api';
import { config } from '@/services/config';
import type { AccessibilityPreferences } from '@/types/api';

const defaultPreferences: AccessibilityPreferences = {
  avoid_stairs: true,
  max_slope_percent: 8,
  allowed_surfaces: ['paved', 'brick', 'mixed'],
  avoid_closures: true,
};

export function usePreferences(userId: string = config.defaultUserId) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const record = await api.getPreferences(userId);
      setPreferences(record.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const save = useCallback(async (next: AccessibilityPreferences) => {
    setError(null);
    setPreferences(next);
    try {
      await api.setPreferences({ user_id: userId, preferences: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save preferences');
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { preferences, save, refresh, isLoading, error };
}
