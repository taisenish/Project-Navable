import { Image, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { config } from '@/services/config';
import { uwStaticMapStyles as styles } from '@/styles/uw-static-map.styles';
 
function buildBackendMapUrl(): string {
  return `${config.apiBaseUrl}/maps/uw-static?width=600&height=320&zoom=15`;
}

export function UwStaticMap() {
  return (
    <View style={styles.card}>
      <ThemedText type="defaultSemiBold">UW Campus Map</ThemedText>
      <Image
        accessibilityRole="image"
        accessibilityLabel="Google map centered on University of Washington campus"
        source={{ uri: buildBackendMapUrl() }}
        style={styles.mapImage}
      />
      <ThemedText>Center: University of Washington, Seattle</ThemedText>
    </View>
  );
}
