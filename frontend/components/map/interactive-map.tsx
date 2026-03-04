import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { config } from '@/services/config';

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
  onUserMapGesture?: () => void;
};

function latLngToWorldPixels(lat: number, lng: number, zoom: number) {
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function InteractiveMap({
  mapUrl,
  centerLat = 47.6553,
  centerLng = -122.3035,
  zoom = 14,
  isNavigating = false,
  cameraHeading = 0,
  userLocation,
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
      const maxX = ((viewportW.value * scale.value) - viewportW.value) / 2;
      const maxY = ((viewportH.value * scale.value) - viewportH.value) / 2;
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

      const maxX = ((viewportW.value * nextScale) - viewportW.value) / 2;
      const maxY = ((viewportH.value * nextScale) - viewportH.value) / 2;
      translateX.value = Math.max(-maxX, Math.min(translateX.value, maxX));
      translateY.value = Math.max(-maxY, Math.min(translateY.value, maxY));
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
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
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.hintBadge}>
        <ThemedText style={styles.hintText}>Drag to explore • Pinch to zoom</ThemedText>
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
