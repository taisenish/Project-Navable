import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: 'NavAble' }} />
        <Stack.Screen name="map" options={{ title: 'Campus Map' }} />
        <Stack.Screen name="route-details" options={{ title: 'Route Details' }} />
        <Stack.Screen name="settings" options={{ title: 'Accessibility Settings' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
