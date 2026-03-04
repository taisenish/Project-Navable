import 'react-native-gesture-handler';

import { Stack } from 'expo-router';

import { AuthSessionProvider } from '../state/auth-session';

export default function RootLayout() {
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
