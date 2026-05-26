import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { InteractiveMap } from './interactive-map';
import type { Coordinate, Alert as CampusAlert, Poi } from '../../types/api';
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
  pois?: Poi[];
  onPoiSelect?: (poi: Poi) => void;
  onUserMapGesture?: () => void;
};

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  pois = [],
  onPoiSelect,
  onUserMapGesture,
}: Props) {
  const expoMaps = loadExpoMaps();
  const AppleMapsView = expoMaps?.AppleMaps?.View;
  const lastTouchAtRef = useRef(0);
  const lastCameraUpdateRef = useRef(0);

  const [localCamera, setLocalCamera] = useState({ lat: centerLat, lng: centerLng, zoom });

  useEffect(() => {
    setLocalCamera({ lat: centerLat, lng: centerLng, zoom });
  }, [centerLat, centerLng, zoom]);

  const visiblePois = useMemo(() => {
    if (localCamera.zoom < 15.8) {
      return [];
    }

    const seen = new Set<string>();
    const visibleItems: Poi[] = [];

    pois.forEach((poi) => {
      // Deduplicate by type + stripped name so elevator/entrance with same building show separately
      const bName = poi.name
        .replace(
          /\s*(Southwest|Southeast|Northwest|Northeast|South|North|East|West|Main|Side|Clinic|School|Assisted)?\s*(Entrance|Entry|Gate|Door|Loading Dock|Dock)\s*$/gi,
          ''
        )
        .trim();

      const key = `${poi.type}:${bName}`;
      if (!bName || seen.has(key)) return;

      const dist = getDistanceMeters(poi.location.lat, poi.location.lng, localCamera.lat, localCamera.lng);
      if (dist >= 120) return;

      seen.add(key);
      visibleItems.push({ ...poi, name: bName });
    });

    return visibleItems;
  }, [pois, localCamera.lat, localCamera.lng, localCamera.zoom]);

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
      });
    }

    if (destination) {
      annotations.push({
        coordinates: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
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

    // Map all POI types to native Apple Maps markers
    visiblePois.forEach((poi) => {
      let systemImage = 'door.left.hand.open'; // default entrance
      let tintColor = '#5856D6'; // purple for regular entrances

      if (poi.type === 'elevator') {
        systemImage = 'arrow.up.arrow.down.square.fill';
        tintColor = '#00C7DE'; // teal
      } else if (poi.type === 'restroom') {
        systemImage = 'toilet.fill';
        tintColor = '#FF2D55'; // red
      } else if (poi.type === 'ramp') {
        systemImage = 'figure.roll.runningpace';
        tintColor = '#34C759'; // green
      } else if (poi.type === 'entrance' && poi.is_accessible) {
        systemImage = 'figure.roll'; // wheelchair
        tintColor = '#1A73E8'; // Google blue
      }

      markers.push({
        id: `poi-${poi.id}`,
        coordinates: {
          latitude: poi.location.lat,
          longitude: poi.location.lng,
        },
        systemImage,
        tintColor,
        title: poi.name,
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
          onMarkerClick={(markerEvent: any) => {
            if (markerEvent.id && markerEvent.id.startsWith('poi-')) {
              const poiId = markerEvent.id.replace('poi-', '');
              const selectedPoi = pois.find((p) => p.id === poiId);
              if (selectedPoi && onPoiSelect) {
                onPoiSelect(selectedPoi);
              }
            } else if (markerEvent.id && !markerEvent.id.startsWith('area-') && !markerEvent.id.startsWith('user-')) {
              const selectedAlertObj = alerts.find((a) => a.id === markerEvent.id);
              if (selectedAlertObj && onAlertSelect) {
                onAlertSelect(selectedAlertObj);
              }
            }
          }}
          onCameraMove={(event: any) => {
            if (onUserMapGesture) {
              if (Date.now() - lastTouchAtRef.current < 900) {
                onUserMapGesture();
              }
            }
            const now = Date.now();
            if (now - lastCameraUpdateRef.current > 400) {
              lastCameraUpdateRef.current = now;
              setLocalCamera({
                lat: event.coordinates.latitude,
                lng: event.coordinates.longitude,
                zoom: event.zoom,
              });
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
      pois={pois}
      onPoiSelect={onPoiSelect}
      onUserMapGesture={onUserMapGesture}
    />
  );
}

