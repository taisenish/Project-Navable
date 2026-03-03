import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouteCache } from '@/hooks/use-route-cache';
import type { RouteResponse } from '@/types/api';

export default function RouteDetailsScreen() {
  const { getRoute } = useRouteCache();
  const [route, setRoute] = useState<RouteResponse | null>(null);

  useEffect(() => {
    getRoute().then(setRoute);
  }, [getRoute]);

  if (!route) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>No cached route found. Go back and generate a route first.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Route Details</ThemedText>
      <ThemedText>{`Distance: ${route.leg.distance_meters}m`}</ThemedText>
      <ThemedText>{`Duration: ${route.leg.duration_seconds}s`}</ThemedText>

      {route.leg.steps.map((step, idx) => (
        <View key={`${idx}-${step.instruction}`} style={styles.step} accessible accessibilityRole="summary">
          <ThemedText type="defaultSemiBold">{`Step ${idx + 1}`}</ThemedText>
          <ThemedText>{step.instruction}</ThemedText>
          <ThemedText>{`Distance: ${step.distance_meters}m`}</ThemedText>
          {step.accessibility_note ? <ThemedText>{step.accessibility_note}</ThemedText> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  step: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    gap: 6,
  },
});
