import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';

import { MapCanvas } from '@/components/map/map-canvas';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouteCache } from '@/hooks/use-route-cache';
import { api } from '@/services/api';
import { mapStyles as styles } from '@/styles/map.styles';
import type { Alert, Poi, RouteResponse } from '@/types/api';

export default function MapScreen() {
  const { getRoute, getPois, savePois } = useRouteCache();
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [cachedRoute, fetchedPois, fetchedAlerts] = await Promise.all([
          getRoute(),
          api.getPois(),
          api.getAlerts(),
        ]);
        setRoute(cachedRoute);
        setPois(fetchedPois);
        setAlerts(fetchedAlerts);
        await savePois(fetchedPois);
      } catch (err) {
        const cachedPois = await getPois();
        setPois(cachedPois ?? []);
        setError(err instanceof Error ? err.message : 'Failed to load map overlays');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [getPois, getRoute, savePois]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isLoading ? <ActivityIndicator /> : null}
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <MapCanvas route={route} pois={pois} alerts={alerts} />

      <Link href="/route-details" asChild>
        <Pressable style={styles.button} accessibilityLabel="Open route details">
          <ThemedText style={styles.buttonText}>View Step-by-Step Directions</ThemedText>
        </Pressable>
      </Link>

      <Link href="/" asChild>
        <Pressable style={styles.secondaryButton} accessibilityLabel="Re-route and search again">
          <ThemedText>Re-route</ThemedText>
        </Pressable>
      </Link>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">Active Alerts</ThemedText>
        {alerts.map((alert) => (
          <ThemedText key={alert.id}>{`• ${alert.title} (${alert.severity})`}</ThemedText>
        ))}
      </ThemedView>
    </ScrollView>
  );
}
