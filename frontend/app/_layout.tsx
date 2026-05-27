import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { AuthSessionProvider } from '../state/auth-session';
import { notificationService } from '../services/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Request notification permissions on startup
    void notificationService.requestPermissions();
  }, []);

  return (
    <AuthSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthSessionProvider>
  );
}
