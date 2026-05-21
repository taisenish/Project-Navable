import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Image, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { config } from '../../services/config';
import type { Alert as CampusAlert } from '../../types/api';

const AnimatedImage = Animated.createAnimatedComponent(Image);
const MIN_SCALE = 1.25;
const MAX_SCALE = 4;

function getMapUrl() {
  return `${config.apiBaseUrl}/maps/uw-static?width=1200&height=800&zoom=14`;
}

type InteractiveMapProps = {
  mapUrl?: string;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  isNavigating?: boolean;
  cameraHeading?: number;
  userLocation?: {
    lat: number;
    lng: number;
    heading?: number;
  } | null;
  alerts?: CampusAlert[];
  onAlertSelect?: (alert: CampusAlert) => void;
  onUserMapGesture?: () => void;
};

function latLngToWorldPixels(lat: number, lng: number, zoom: number) {
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function PulsingAlertRing({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2.2, { duration: 1500 }),
      -1,
      false
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 1500 }),
      -1,
      false
    );
  }, [scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: color,
          zIndex: -1,
        },
        ringStyle,
      ]}
    />
  );
}

export function InteractiveMap({
  mapUrl,
  centerLat = 47.6553,
  centerLng = -122.3035,
  zoom = 14,
  isNavigating = false,
  cameraHeading = 0,
  userLocation,
  alerts = [],
  onAlertSelect,
  onUserMapGesture,
}: InteractiveMapProps) {
  const viewportW = useSharedValue(1);
  const viewportH = useSharedValue(1);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const scale = useSharedValue(MIN_SCALE);
  const startScale = useSharedValue(MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    const height = event.nativeEvent.layout.height;
    viewportW.value = width;
    viewportH.value = height;
    setViewport({ width, height });
  };

  const pan = Gesture.Pan()
    .enabled(!isNavigating)
    .onStart(() => {
      if (onUserMapGesture) {
        onUserMapGesture();
      }
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxX = (viewportW.value * scale.value - viewportW.value) / 2;
      const maxY = (viewportH.value * scale.value - viewportH.value) / 2;
      const nextX = startX.value + event.translationX;
      const nextY = startY.value + event.translationY;

      translateX.value = Math.max(-maxX, Math.min(nextX, maxX));
      translateY.value = Math.max(-maxY, Math.min(nextY, maxY));
    });

  const pinch = Gesture.Pinch()
    .enabled(!isNavigating)
    .onStart(() => {
      if (onUserMapGesture) {
        onUserMapGesture();
      }
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(startScale.value * event.scale, MAX_SCALE));
      scale.value = nextScale;

      const maxX = (viewportW.value * nextScale - viewportW.value) / 2;
      const maxY = (viewportH.value * nextScale - viewportH.value) / 2;
      translateX.value = Math.max(-maxX, Math.min(translateX.value, maxX));
      translateY.value = Math.max(-maxY, Math.min(translateY.value, maxY));
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const userMarkerStyle = useMemo(() => {
    if (!userLocation) {
      return null;
    }

    const mapCenterPx = latLngToWorldPixels(centerLat, centerLng, zoom);
    const userPx = latLngToWorldPixels(userLocation.lat, userLocation.lng, zoom);
    const dx = userPx.x - mapCenterPx.x;
    const dy = userPx.y - mapCenterPx.y;

    const left = viewport.width / 2 + dx - 14;
    const top = viewport.height / 2 + dy - 14;

    const rotation = isNavigating ? cameraHeading : userLocation.heading ?? 0;
    return {
      left,
      top,
      transform: [{ rotate: `${rotation}deg` }],
    } as const;
  }, [cameraHeading, centerLat, centerLng, isNavigating, userLocation, viewport.height, viewport.width, zoom]);

  const mapRotation = useMemo(() => {
    if (!isNavigating || !userLocation) {
      return '0deg';
    }
    return `${-(userLocation.heading ?? 0)}deg`;
  }, [isNavigating, userLocation]);

  // Project geocoded campus alerts onto custom local map coordinate system
  const alertMarkers = useMemo(() => {
    const mapCenterPx = latLngToWorldPixels(centerLat, centerLng, zoom);

    return alerts
      .filter((alert) => alert.location != null)
      .map((alert) => {
        const loc = alert.location!;
        const alertPx = latLngToWorldPixels(loc.lat, loc.lng, zoom);
        const dx = alertPx.x - mapCenterPx.x;
        const dy = alertPx.y - mapCenterPx.y;

        // Subtract 12 (half of marker width/height) to perfectly center it
        const left = viewport.width / 2 + dx - 12;
        const top = viewport.height / 2 + dy - 12;

        const isResolved = alert.is_resolved || alert.status === 'resolved';

        let markerColor = '#007AFF'; // info (blue)
        let iconName: 'info' | 'warning' | 'error' = 'info';

        if (alert.severity === 'critical') {
          markerColor = '#FF3B30'; // critical (red)
          iconName = 'error';
        } else if (alert.severity === 'warning') {
          markerColor = '#FF9500'; // warning (orange)
          iconName = 'warning';
        }

        return {
          alert,
          left,
          top,
          markerColor,
          iconName,
          isResolved,
        };
      });
  }, [alerts, centerLat, centerLng, zoom, viewport.width, viewport.height]);

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
        <Animated.View style={[styles.mapLayer, animatedStyle]}>
          <View style={[styles.rotationLayer, { transform: [{ rotate: mapRotation }] }]}>
            <AnimatedImage
              source={{ uri: mapUrl || getMapUrl() }}
              style={styles.mapImage}
              resizeMode="cover"
              accessibilityRole="image"
              accessibilityLabel="Interactive campus map. Drag to move and pinch to zoom."
            />
            {userMarkerStyle ? (
              <View style={[styles.userMarker, userMarkerStyle]}>
                <MaterialIcons name="assistant-navigation" size={20} color="#FFFFFF" />
              </View>
            ) : null}

            {/* Custom styled absolute positioned alert overlays */}
            {alertMarkers.map(({ alert, left, top, markerColor, iconName, isResolved }) => (
              <View key={`container-${alert.id}`} style={{ position: 'absolute' }}>
                <View
                  style={[
                    styles.affectedArea,
                    {
                      left: left - 28, // Offset by half of affectedArea size (80) minus half of pin size (24) -> 40 - 12 = 28
                      top: top - 28,
                      backgroundColor: markerColor,
                    },
                  ]}
                />
                <Pressable
                  key={alert.id}
                  onPress={() => onAlertSelect?.(alert)}
                  style={[
                    styles.alertMarker,
                    {
                      left,
                      top,
                      backgroundColor: markerColor,
                      opacity: isResolved ? 0.6 : 1.0,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Alert: ${alert.title}`}>
                  {!isResolved && <PulsingAlertRing color={markerColor} />}
                  <MaterialIcons name={iconName} size={14} color="#FFFFFF" />
                  {isResolved && (
                    <View style={styles.resolvedSubBadge}>
                      <MaterialIcons name="check" size={8} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.hintBadge}>
        <Text style={styles.hintText}>Drag to explore • Pinch to zoom</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#252933',
    overflow: 'hidden',
  },
  mapLayer: {
    width: '100%',
    height: '100%',
  },
  rotationLayer: {
    width: '100%',
    height: '100%',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  affectedArea: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.25,
    zIndex: 10,
  },
  alertMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 3,
    zIndex: 15,
  },
  resolvedSubBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#20B300',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  hintBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(18, 23, 35, 0.72)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hintText: {
    color: '#E6EAF5',
    fontSize: 12,
  },
});

