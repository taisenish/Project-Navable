import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '../services/api';
import type { AuthUser } from '../types/api';

const AUTH_USER_KEY = 'navable:auth-user';

type SignInResult = {
  user: AuthUser;
  isNewUser: boolean;
};

type AuthSessionContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogleNative: (idToken: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (!mounted) {
          return;
        }
        setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const signInWithGoogleNative = useCallback(async (idToken: string): Promise<SignInResult> => {
    if (!idToken) {
      throw new Error('Missing Google ID token');
    }

    setError(null);
    const result = await api.loginWithGoogleNative({ id_token: idToken });
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
    return { user: result.user, isNewUser: result.is_new_user };
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error,
      signInWithGoogleNative,
      signOut,
    }),
    [error, isLoading, signInWithGoogleNative, signOut, user],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider');
  }
  return context;
}
