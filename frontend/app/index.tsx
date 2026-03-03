import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthSession } from '@/hooks/use-auth-session';
import { usePreferences } from '@/hooks/use-preferences';
import { useRouteCache } from '@/hooks/use-route-cache';
import { api } from '@/services/api';
import { parseCoordinate } from '@/utils/coordinates';

export default function SearchScreen() {
  const [originRaw, setOriginRaw] = useState('47.6517,-122.3082');
  const [destinationRaw, setDestinationRaw] = useState('47.6557,-122.3094');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, userId, signOut, isLoading: isAuthLoading } = useAuthSession();
  const { preferences } = usePreferences(userId);
  const { saveRoute } = useRouteCache();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user]);

  const requestRoute = async () => {
    const origin = parseCoordinate(originRaw);
    const destination = parseCoordinate(destinationRaw);

    if (!origin || !destination) {
      setError('Use format: lat,lng (example: 47.6517,-122.3082)');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const route = await api.createRoute({ origin, destination, preferences });
      await saveRoute(route);
      if (route.warnings.length > 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        AccessibilityInfo.announceForAccessibility('Route generated with accessibility warnings');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility('Accessible route generated successfully');
      }
      router.push('/map');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get directions');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Campus Navigator</ThemedText>
      <ThemedText>Accessible routing for UW using Google + campus data.</ThemedText>
      {user ? <ThemedText>{`Signed in as ${user.email}`}</ThemedText> : null}

      <View style={styles.form}>
        <ThemedText type="defaultSemiBold">Origin (lat,lng)</ThemedText>
        <TextInput
          accessibilityLabel="Origin coordinate"
          accessibilityHint="Enter latitude and longitude separated by a comma"
          value={originRaw}
          onChangeText={setOriginRaw}
          style={styles.input}
        />

        <ThemedText type="defaultSemiBold">Destination (lat,lng)</ThemedText>
        <TextInput
          accessibilityLabel="Destination coordinate"
          accessibilityHint="Enter latitude and longitude separated by a comma"
          value={destinationRaw}
          onChangeText={setDestinationRaw}
          style={styles.input}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Generate accessible route"
        onPress={requestRoute}
        style={styles.primaryButton}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Get Route</ThemedText>}
      </Pressable>

      <Link href="/settings" asChild>
        <Pressable accessibilityRole="button" style={styles.secondaryButton}>
          <ThemedText>Adjust Accessibility Preferences</ThemedText>
        </Pressable>
      </Link>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={styles.secondaryButton}
        onPress={() => void signOut()}>
        <ThemedText>Sign Out</ThemedText>
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
  },
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8a8a8a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111',
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#c0392b',
  },
});
