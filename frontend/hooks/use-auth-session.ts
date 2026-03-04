import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api';
import { config } from '@/services/config';
import { storage } from '@/utils/storage';
import type { AuthUser } from '@/types/api';

const AUTH_USER_KEY = 'navable:auth-user';

type SignInResult = {
  user: AuthUser;
  isNewUser: boolean;
};

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

  const persistUser = useCallback(async (nextUser: AuthUser) => {
    await storage.set(AUTH_USER_KEY, nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const signInWithGoogleNative = useCallback(async (idToken: string): Promise<SignInResult> => {
    if (!idToken) {
      throw new Error('Missing Google ID token');
    }

    setError(null);
    try {
      const result = await api.loginWithGoogleNative({ id_token: idToken });
      const user = await persistUser(result.user);
      return { user, isNewUser: result.is_new_user };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google native sign-in failed');
      throw err;
    }
  }, [persistUser]);

  const signInWithGoogleWeb = useCallback(async (code: string, redirectUri: string): Promise<SignInResult> => {
    if (!code || !redirectUri) {
      throw new Error('Missing web auth code or redirect URI');
    }

    setError(null);
    try {
      const result = await api.loginWithGoogleWeb({ code, redirect_uri: redirectUri });
      const user = await persistUser(result.user);
      return { user, isNewUser: result.is_new_user };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google web sign-in failed');
      throw err;
    }
  }, [persistUser]);

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
    signInWithGoogleNative,
    signInWithGoogleWeb,
    signOut,
  };
}
