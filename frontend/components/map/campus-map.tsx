import { Platform, View } from 'react-native';
import { useMemo, useRef } from 'react';

import { InteractiveMap } from '@/components/map/interactive-map';
import type { Coordinate } from '@/types/api';
import { decodeGooglePolyline } from '@/utils/polyline';

type Props = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  fallbackMapUrl: string;
  isNavigating?: boolean;
  cameraHeading?: number;
  userLocation?: Coordinate | null;
  destination?: Coordinate | null;
  overviewPolyline?: string;
  onUserMapGesture?: () => void;
};

type ExpoMapsModule = {
  AppleMaps?: {
    View: React.ComponentType<Record<string, unknown>>;
  };
};

function loadExpoMaps(): ExpoMapsModule | null {
  try {
    // Optional runtime dependency. If missing, we fallback to static-map interaction.
    return require('expo-maps') as ExpoMapsModule;
  } catch {
    return null;
  }
}

export function CampusMap({
  centerLat,
  centerLng,
  zoom,
  fallbackMapUrl,
  isNavigating = false,
  cameraHeading = 0,
  userLocation,
  destination,
  overviewPolyline,
  onUserMapGesture,
}: Props) {
  const expoMaps = loadExpoMaps();
  const AppleMapsView = expoMaps?.AppleMaps?.View;
  const lastTouchAtRef = useRef(0);

  const polylineCoordinates = useMemo(() => decodeGooglePolyline(overviewPolyline ?? ''), [overviewPolyline]);

  if (Platform.OS === 'ios' && AppleMapsView) {
    const annotations = [] as Array<Record<string, unknown>>;
    const markers = [] as Array<Record<string, unknown>>;

    if (userLocation) {
      markers.push({
        id: 'user-location',
        coordinates: {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
        },
        systemImage: 'location.north.fill',
        tintColor: '#1A73E8',
        title: 'You',
      });
    }

    if (destination) {
      annotations.push({
        coordinates: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
        title: 'Destination',
        text: '🏁',
      });
    }

    const polylines = polylineCoordinates.length
      ? [
          {
            coordinates: polylineCoordinates.map((point) => ({
              latitude: point.lat,
              longitude: point.lng,
            })),
            color: '#7B3FF3',
            width: 5,
          },
        ]
      : [];

    return (
      <View
        style={{ flex: 1 }}
        onTouchStart={() => {
          lastTouchAtRef.current = Date.now();
        }}>
        <AppleMapsView
          style={{ flex: 1 }}
          cameraPosition={{
            coordinates: {
              latitude: centerLat,
              longitude: centerLng,
            },
            zoom,
            heading: cameraHeading,
            pitch: 0,
          }}
          markers={markers}
          annotations={annotations}
          polylines={polylines}
          properties={{
            isTrafficEnabled: false,
            selectionEnabled: true,
          }}
          uiSettings={{
            compassEnabled: true,
            myLocationButtonEnabled: false,
            scaleBarEnabled: true,
            togglePitchEnabled: false,
          }}
          onCameraMove={() => {
            if (!onUserMapGesture) {
              return;
            }
            if (Date.now() - lastTouchAtRef.current < 900) {
              onUserMapGesture();
            }
          }}
        />
      </View>
    );
  }

  return (
    <InteractiveMap
      mapUrl={fallbackMapUrl}
      centerLat={centerLat}
      centerLng={centerLng}
      zoom={zoom}
      isNavigating={isNavigating}
      cameraHeading={cameraHeading}
      userLocation={userLocation ?? null}
      onUserMapGesture={onUserMapGesture}
    />
  );
}
