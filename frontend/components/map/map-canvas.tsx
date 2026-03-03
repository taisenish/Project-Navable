import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Alert, Poi, RouteResponse } from '@/types/api';

type Props = {
  route: RouteResponse | null;
  pois: Poi[];
  alerts: Alert[];
};

export function MapCanvas({ route, pois, alerts }: Props) {
  return (
    <ThemedView style={styles.wrapper}>
      <ThemedText type="subtitle">Campus Map Overlay</ThemedText>
      <ThemedText>
        {route
          ? `Polyline points: ${route.polyline.length} | Distance: ${route.leg.distance_meters}m`
          : 'No active route.'}
      </ThemedText>
      <View style={styles.row}>
        <ThemedText accessibilityLabel={`Points of interest count ${pois.length}`}>POIs: {pois.length}</ThemedText>
        <ThemedText accessibilityLabel={`Alert count ${alerts.length}`}>Alerts: {alerts.length}</ThemedText>
      </View>
      {route?.warnings?.length ? (
        <View>
          <ThemedText type="defaultSemiBold">Warnings</ThemedText>
          {route.warnings.map((warning) => (
            <ThemedText key={warning}>{`• ${warning}`}</ThemedText>
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
