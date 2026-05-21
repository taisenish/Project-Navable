import { useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';

import { InteractiveMap } from './interactive-map';
import type { Coordinate, Alert as CampusAlert } from '../../types/api';
import { decodeGooglePolyline } from '../../utils/polyline';

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
  alerts?: CampusAlert[];
  onAlertSelect?: (alert: CampusAlert) => void;
  onUserMapGesture?: () => void;
};

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
  alerts = [],
  onAlertSelect,
  onUserMapGesture,
}: Props) {
  const expoMaps = loadExpoMaps();
  const AppleMapsView = expoMaps?.AppleMaps?.View;
  const lastTouchAtRef = useRef(0);

  const polylineCoordinates = useMemo(() => decodeGooglePolyline(overviewPolyline ?? ''), [overviewPolyline]);

  if (Platform.OS === 'ios' && AppleMapsView) {
    const annotations = [] as Array<Record<string, unknown>>;
    const markers = [] as Array<Record<string, unknown>>;
    const circles = [] as Array<Record<string, unknown>>;

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

    // Render alert pins and affected areas on native Apple Maps view
    alerts.forEach((alert) => {
      if (!alert.location) return;

      const isResolved = alert.is_resolved || alert.status === 'resolved';
      let tintColor = '#007AFF'; // default info color (blue)
      let fillColor = 'rgba(0, 122, 255, 0.25)';
      let systemImage = 'info.circle.fill';

      if (isResolved) {
        tintColor = '#20B300'; // resolved green
        fillColor = 'rgba(32, 179, 0, 0.25)';
        systemImage = 'checkmark.circle.fill';
      } else {
        if (alert.severity === 'critical') {
          tintColor = '#FF3B30'; // critical red
          fillColor = 'rgba(255, 59, 48, 0.25)';
          systemImage = 'exclamationmark.octagon.fill';
        } else if (alert.severity === 'warning') {
          tintColor = '#FF9500'; // warning orange
          fillColor = 'rgba(255, 149, 0, 0.25)';
          systemImage = 'exclamationmark.triangle.fill';
        }
      }

      markers.push({
        id: alert.id,
        coordinates: {
          latitude: alert.location.lat,
          longitude: alert.location.lng,
        },
        systemImage,
        tintColor,
        title: alert.title,
        description: alert.description,
      });

      circles.push({
        id: `area-${alert.id}`,
        center: {
          latitude: alert.location.lat,
          longitude: alert.location.lng,
        },
        radius: 60, // 60 meters radius covers about a block and a half
        color: fillColor,
      });
    });

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
          circles={circles}
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
      alerts={alerts}
      onAlertSelect={onAlertSelect}
      onUserMapGesture={onUserMapGesture}
    />
  );
}

