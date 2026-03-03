import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthSession } from '@/hooks/use-auth-session';
import { config } from '@/services/config';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signInWithGoogleIdToken, user, isLoading, error } = useAuthSession();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: config.googleWebClientId || undefined,
    iosClientId: config.googleIosClientId || undefined,
    androidClientId: config.googleAndroidClientId || undefined,
  });

  const hasClientId = useMemo(
    () => Boolean(config.googleWebClientId || config.googleIosClientId || config.googleAndroidClientId),
    []
  );

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type !== 'success') {
        return;
      }

      const token = response.authentication?.idToken;
      if (!token) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      try {
        await signInWithGoogleIdToken(token);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      } catch {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    void handleResponse();
  }, [response, signInWithGoogleIdToken]);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Sign In</ThemedText>
      <ThemedText>Use Google to continue to NavAble.</ThemedText>

      {!hasClientId ? (
        <ThemedText style={styles.error}>
          Google OAuth client IDs are missing. Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars.
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in with Google"
        disabled={!request || !hasClientId || isLoading}
        style={[styles.primaryButton, (!request || !hasClientId || isLoading) && styles.disabled]}
        onPress={() => void promptAsync()}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Continue with Google</ThemedText>}
      </Pressable>

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#c0392b',
  },
});
