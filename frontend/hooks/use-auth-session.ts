import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api';
import { config } from '@/services/config';
import { storage } from '@/utils/storage';
import type { AuthUser } from '@/types/api';

const AUTH_USER_KEY = 'navable:auth-user';

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const cached = await storage.get<AuthUser>(AUTH_USER_KEY);
    setUser(cached);
    setIsLoading(false);
  }, []);

  const signInWithGoogleIdToken = useCallback(async (idToken: string) => {
    if (!idToken) {
      throw new Error('Missing Google ID token');
    }

    setError(null);
    try {
      const result = await api.loginWithGoogle({ id_token: idToken });
      await storage.set(AUTH_USER_KEY, result.user);
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await storage.set<AuthUser | null>(AUTH_USER_KEY, null);
    setUser(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    user,
    userId: user?.user_id ?? config.defaultUserId,
    isLoading,
    error,
    refresh,
    signInWithGoogleIdToken,
    signOut,
  };
}
