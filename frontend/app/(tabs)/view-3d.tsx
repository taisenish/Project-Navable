import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { TopBar } from '../../components/top-bar';

type ExpoMapsModule = {
  AppleMaps?: {
    View: React.ComponentType<Record<string, unknown>>;
  };
};

function loadExpoMaps(): ExpoMapsModule | null {
  try {
    return require('expo-maps') as ExpoMapsModule;
  } catch {
    return null;
  }
}

const U_DISTRICT_CENTER = {
  latitude: 47.6553,
  longitude: -122.3035,
};

export default function View3DScreen() {
  const expoMaps = useMemo(loadExpoMaps, []);
  const AppleMapsView = expoMaps?.AppleMaps?.View;

  const canRenderNative3D = Platform.OS === 'ios' && Boolean(AppleMapsView);

  return (
    <View style={styles.screen}>
      <TopBar />
      {canRenderNative3D && AppleMapsView ? (
        <View style={styles.mapWrap}>
          <AppleMapsView
            style={styles.map}
            cameraPosition={{
              coordinates: U_DISTRICT_CENTER,
              zoom: 15.6,
              heading: 24,
              pitch: 62,
            }}
            properties={{
              isTrafficEnabled: false,
              selectionEnabled: true,
            }}
            uiSettings={{
              compassEnabled: true,
              myLocationButtonEnabled: false,
              scaleBarEnabled: true,
              togglePitchEnabled: true,
            }}
          />
          <View style={styles.badge}>
            <Text style={styles.badgeTitle}>U District 3D</Text>
            <Text style={styles.badgeBody}>Pinch, pan, and rotate to explore buildings.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>3D View Unavailable</Text>
          <Text style={styles.subtitle}>
            3D map rendering requires iOS native `expo-maps` in a development build.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#10131F',
  },
  map: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#C2C8DA',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 420,
  },
  badge: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    backgroundColor: 'rgba(13, 16, 26, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(169, 138, 242, 0.45)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  badgeTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  badgeBody: {
    marginTop: 2,
    color: '#D8DCEF',
    fontSize: 12,
  },
});
