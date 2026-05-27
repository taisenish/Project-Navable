import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Keyboard,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { HomeChipRow } from '../home/home-chip-row';
import { HomeNavigationCard } from '../home/home-navigation-card';
import { HomeTopPanel } from '../home/home-top-panel';
import { CampusMap } from '../map/campus-map';
import { useRouteCache } from '../../hooks/use-route-cache';
import { api } from '../../services/api';
import { config } from '../../services/config';
import { homeStyles as styles } from '../../styles/home.styles';
import type { AccessibilityPreferences, Alert as CampusAlert, DirectionsResponse, PlaceSuggestion, Poi, RouteResponse, RouteSegment, TransitRouteResponse } from '../../types/api';
import { decodeGooglePolyline } from '../../utils/polyline';
import { mapRouteToDirections, mapTransitRouteToDirections } from '../../utils/route-mapper';
import { storage } from '../../utils/storage';
import { ttsService } from '../../services/tts';

const UW_CENTER = { lat: 47.6553, lng: -122.3035 };
const UW_FOUNTAIN_CENTER = { lat: 47.6539, lng: -122.3078 };
const DEFAULT_MAP_ZOOM = 14;
const PLACE_FOCUS_ZOOM = 70;
const NAVIGATION_MAP_ZOOM = 17;
const OVERVIEW_MIN_ZOOM = 13;

type MapState = {
  url: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
};

type NavigationCameraMode = 'follow' | 'overview' | 'free';
type RouteStopMarker = {
  id: string;
  location: { lat: number; lng: number };
  color: 'white' | 'red';
};

function buildMapState(params?: {
  centerLat?: number;
  centerLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  pathPolyline?: string;
  pathColor?: string;
  routeSegments?: RouteSegment[];
  zoom?: number;
}): MapState {
  const centerLat = params?.centerLat ?? UW_CENTER.lat;
  const centerLng = params?.centerLng ?? UW_CENTER.lng;
  const zoom = params?.zoom ?? DEFAULT_MAP_ZOOM;
  const search = new URLSearchParams({
    width: '1200',
    height: '800',
    zoom: String(zoom),
  });

  search.set('center_lat', String(centerLat));
  search.set('center_lng', String(centerLng));
  if (params?.destinationLat !== undefined) {
    search.set('destination_lat', String(params.destinationLat));
  }
  if (params?.destinationLng !== undefined) {
    search.set('destination_lng', String(params.destinationLng));
  }
  if (params?.pathPolyline && !params.routeSegments?.length) {
    search.set('path_polyline', params.pathPolyline);
  }
  if (params?.pathColor) {
    search.set('path_color', params.pathColor);
  }
  params?.routeSegments?.forEach((segment) => {
    search.append('route_segment_polyline', segment.overview_polyline);
    search.append('route_segment_color', segment.color.replace('#', ''));
  });

  return {
    url: `${config.apiBaseUrl}/maps/uw-static?${search.toString()}`,
    centerLat,
    centerLng,
    zoom,
  };
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earth = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earth * y;
}

function bearingDegrees(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function computeOverviewCamera(directions: DirectionsResponse): { centerLat: number; centerLng: number; zoom: number } {
  const points = decodeGooglePolyline(directions.overview_polyline);
  if (!points.length) {
    return {
      centerLat: directions.end_location.lat,
      centerLng: directions.end_location.lng,
      zoom: OVERVIEW_MIN_ZOOM,
    };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const latSpan = Math.max(maxLat - minLat, 0.001);
  const lngSpan = Math.max(maxLng - minLng, 0.001);
  const span = Math.max(latSpan, lngSpan);
  const zoom = Math.max(10.5, Math.min(15.5, 12.9 - Math.log2(span * 45)));
  const centerLatBase = (minLat + maxLat) / 2;
  const verticalOffset = latSpan * 0.12;

  return {
    centerLat: centerLatBase + verticalOffset,
    centerLng: (minLng + maxLng) / 2,
    zoom,
  };
}


export function MainMapScreen() {
  const { getRoute, getPois, savePois } = useRouteCache();
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [alerts, setAlerts] = useState<CampusAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<CampusAlert | null>(null);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [hasStartedNavigationForSelection, setHasStartedNavigationForSelection] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [directions, setDirections] = useState<DirectionsResponse | null>(null);
  const [walkingDirections, setWalkingDirections] = useState<DirectionsResponse | null>(null);
  const [busDirections, setBusDirections] = useState<DirectionsResponse | null>(null);
  const [bikeDirections, setBikeDirections] = useState<DirectionsResponse | null>(null);
  const [transitOptions, setTransitOptions] = useState<TransitRouteResponse[]>([]);
  const [selectedTransitOptionIndex, setSelectedTransitOptionIndex] = useState(0);
  const [isTransitDetailsOpen, setIsTransitDetailsOpen] = useState(false);
  const [isTransitDetailsVisible, setIsTransitDetailsVisible] = useState(false);
  const [isTransitSheetOpen, setIsTransitSheetOpen] = useState(false);
  const [busStopMarkers, setBusStopMarkers] = useState<RouteStopMarker[]>([]);
  const [routeMode, setRouteMode] = useState<'walk' | 'bus' | 'bike'>('walk');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [navigationCameraMode, setNavigationCameraMode] = useState<NavigationCameraMode>('follow');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [mapState, setMapState] = useState<MapState>(() => {
    if (config.spoofLocation) {
      const [latStr, lngStr] = config.spoofLocation.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        return buildMapState({ centerLat: lat, centerLng: lng });
      }
    }
    return buildMapState({
      centerLat: UW_FOUNTAIN_CENTER.lat,
      centerLng: UW_FOUNTAIN_CENTER.lng,
    });
  });



  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const suppressMapGestureUntilRef = useRef(0);
  const transitSheetAnim = useRef(new Animated.Value(0)).current;
  const transitDetailsAnim = useRef(new Animated.Value(0)).current;

  const spoofedCoords = useMemo(() => {
    if (!config.spoofLocation) {
      return null;
    }
    const [latStr, lngStr] = config.spoofLocation.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }
    return { lat, lng };
  }, []);

  const handlePermissionDenied = (canAskAgain: boolean) => {
    if (spoofedCoords) {
      setUserLocation({ ...spoofedCoords, heading: 0 });
      return;
    }
    setLocationError('Location permission is required to show your live position.');
    setUserLocation({ lat: UW_CENTER.lat, lng: UW_CENTER.lng, heading: 0 });
    if (!canAskAgain) {
      Alert.alert('Enable Location Access', 'Location permission was denied. Enable it in iOS Settings to show your live location.', [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ]);
    }
  };

  useEffect(() => {
    let mounted = true;
    let positionSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let appStateSub: { remove: () => void } | null = null;

    const startLocation = async (showDeniedAlert = false) => {
      try {
        positionSub?.remove();
        headingSub?.remove();
        positionSub = null;
        headingSub = null;

        if (spoofedCoords) {
          setUserLocation({ ...spoofedCoords, heading: 0 });
          return;
        }

        const existing = await Location.getForegroundPermissionsAsync();
        const permission = existing.status === 'granted' ? existing : await Location.requestForegroundPermissionsAsync();
        if (!mounted) {
          return;
        }
        if (permission.status !== 'granted') {
          if (showDeniedAlert) {
            handlePermissionDenied(permission.canAskAgain);
          } else {
            setLocationError('Location permission is required to show your live position.');
          }
          return;
        }

        setLocationError(null);

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (!mounted) {
          return;
        }

        const nextUserLocation = {
          lat: current.coords.latitude,
          lng: current.coords.longitude,
          heading: current.coords.heading ?? 0,
        };
        setUserLocation(nextUserLocation);

        positionSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (position) => {
            if (!mounted) {
              return;
            }

            setUserLocation((prev) => ({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading ?? prev?.heading ?? 0,
            }));
          },
        );

        headingSub = await Location.watchHeadingAsync((heading) => {
          if (!mounted) {
            return;
          }
          setUserLocation((prev) =>
            prev
              ? {
                  ...prev,
                  heading: heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading,
                }
              : prev,
          );
        });
      } catch {
        if (!mounted) {
          return;
        }
        setLocationError('Unable to read device location. Showing UW campus center.');
        setUserLocation({ lat: UW_CENTER.lat, lng: UW_CENTER.lng, heading: 0 });
      }
    };

    void startLocation(true);

    appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void startLocation(false);
      }
    });

    return () => {
      mounted = false;
      positionSub?.remove();
      headingSub?.remove();
      appStateSub?.remove();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const [cachedRoute, fetchedPois, fetchedAlerts] = await Promise.all([getRoute(), api.getPois(), api.getAlerts()]);
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

    void load();
  }, [getPois, getRoute, savePois]);

  useEffect(() => {
    const nextQuery = searchQuery.trim();
    if (nextQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    if (selectedPlace && nextQuery === selectedPlace.name) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await api.searchPlaces(nextQuery, 6);
        setSearchResults(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search places');
      } finally {
        setIsSearching(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedPlace]);

  const hasSearchResults = searchResults.length > 0 && !(selectedPlace && directions);
  const showBaseChips = !directions;
  const rampsCount = pois.filter((poi) => poi.type === 'ramp').length;
  const entrancesCount = pois.filter((poi) => poi.type === 'entrance').length;
  const chipBarAnim = useRef(new Animated.Value(1)).current;

  const routeSummary = useMemo(() => {
    if (directions) {
      return `${directions.distance_text} • ${directions.duration_text}`;
    }
    if (route) {
      const miles = (route.leg.distance_meters * 0.000621371).toFixed(2);
      const min = Math.round(route.leg.duration_seconds / 60);
      return `${miles} mi • ${min} min`;
    }
    return null;
  }, [directions, route]);

  const busRouteSummary = useMemo(() => {
    if (!busDirections) {
      return null;
    }
    return `${busDirections.duration_text}`;
  }, [busDirections]);

  const walkRouteSummary = useMemo(() => {
    if (!walkingDirections) {
      return null;
    }
    return walkingDirections.duration_text;
  }, [walkingDirections]);

  const bikeRouteSummary = useMemo(() => {
    if (!bikeDirections) {
      return null;
    }
    return bikeDirections.duration_text;
  }, [bikeDirections]);

  const routeDistanceText = directions?.distance_text ?? null;

  const routeArrivalText = useMemo(() => {
    if (!directions?.duration_text) {
      return null;
    }

    const hoursMatch = directions.duration_text.match(/(\d+)\s*hour/i);
    const minsMatch = directions.duration_text.match(/(\d+)\s*min/i);
    const totalMinutes = (hoursMatch ? Number(hoursMatch[1]) * 60 : 0) + (minsMatch ? Number(minsMatch[1]) : 0);
    if (!totalMinutes) {
      return `Arrive in ${directions.duration_text}`;
    }

    const arrival = new Date(Date.now() + totalMinutes * 60 * 1000);
    return `Arrive by ${arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [directions]);

  const publicTransportOptions = useMemo(
    () =>
      transitOptions.map((option, index) => {
        const transitLegs = option.legs.filter((leg) => leg.type === 'transit');
        const busName =
          transitLegs
            .map((leg) => leg.transit_details?.line_short_name || leg.transit_details?.line_name)
            .filter(Boolean)
            .join(' + ') || 'Transit';
        const firstTransit = transitLegs[0]?.transit_details;
        const lastTransit = transitLegs[transitLegs.length - 1]?.transit_details;
        const timeline = option.legs
          .map((leg) => {
            if (leg.type === 'walk') {
              return `Walk ${leg.duration_text}`;
            }
            const details = leg.transit_details;
            const line = details?.line_short_name || details?.line_name || 'Bus';
            return `${line} ${leg.duration_text}`;
          })
          .join(' -> ');
        const details = option.legs.map((leg) => {
          if (leg.type === 'walk') {
            return `Walk ${leg.duration_text} (${leg.distance_text})`;
          }
          const details = leg.transit_details;
          const line = details?.line_short_name || details?.line_name || 'Bus';
          const departure = details?.departure_time ? ` at ${details.departure_time}` : '';
          const arrival = details?.arrival_time ? `, arrive ${details.arrival_time}` : '';
          return `Take ${line} from ${details?.departure_stop || 'stop'}${departure} to ${details?.arrival_stop || 'stop'}${arrival}`;
        });

        return {
          id: `transit-option-${index}`,
          busName,
          timeline,
          durationText: option.total_duration_text,
          departTime: firstTransit?.departure_time || '',
          leaveText: firstTransit?.departure_time ? `Leave by ${firstTransit.departure_time}` : null,
          arrivalText: lastTransit?.arrival_time ? `Arrive ${lastTransit.arrival_time}` : null,
          details,
          isSelected: index === selectedTransitOptionIndex,
        };
      }),
    [selectedTransitOptionIndex, transitOptions],
  );

  const selectedPublicTransportOption = publicTransportOptions.find((option) => option.isSelected) ?? publicTransportOptions[0] ?? null;

  const transitSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 12,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 36) {
            setIsTransitSheetOpen(false);
          } else if (gestureState.dy < -36) {
            setIsTransitSheetOpen(true);
          }
        },
      }),
    [],
  );

  useEffect(() => {
    Animated.timing(transitSheetAnim, {
      toValue: isTransitSheetOpen ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isTransitSheetOpen, transitSheetAnim]);

  useEffect(() => {
    if (isTransitDetailsOpen) {
      setIsTransitDetailsVisible(true);
      Animated.timing(transitDetailsAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(transitDetailsAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsTransitDetailsVisible(false);
      }
    });
  }, [isTransitDetailsOpen, transitDetailsAnim]);

  const applyActiveDirections = (nextDirections: DirectionsResponse, mode: 'walk' | 'bus' | 'bike') => {
    setDirections(nextDirections);
    setRouteMode(mode);
    setIsNavigating(false);
    setHasStartedNavigationForSelection(false);
    setNavigationCameraMode('follow');
    setActiveStepIndex(0);
    setIsStepsExpanded(false);
    setMapState(
      buildMapState({
        centerLat: nextDirections.end_location.lat,
        centerLng: nextDirections.end_location.lng,
        destinationLat: nextDirections.end_location.lat,
        destinationLng: nextDirections.end_location.lng,
        pathPolyline: nextDirections.overview_polyline,
        pathColor: '7B3FF3FF',
        routeSegments: nextDirections.route_segments,
        zoom: DEFAULT_MAP_ZOOM,
      }),
    );
  };

  const buildTransitStopMarkers = (transitRoute: TransitRouteResponse): RouteStopMarker[] => {
    const transitLegs = transitRoute.legs.filter((leg) => leg.type === 'transit');
    return transitLegs.flatMap((leg, index) => {
      const details = leg.transit_details;
      return [
        {
          id: `bus-stop-${index}-departure`,
          location: details?.departure_location ?? leg.start_location,
          color: 'white' as const,
        },
        {
          id: `bus-stop-${index}-arrival`,
          location: details?.arrival_location ?? leg.end_location,
          color: index === transitLegs.length - 1 ? ('red' as const) : ('white' as const),
        },
      ];
    });
  };

  const selectTransitOption = (index: number, options = transitOptions) => {
    const transitRoute = options[index];
    if (!transitRoute) {
      return;
    }

    const nextDirections = mapTransitRouteToDirections(transitRoute);
    setSelectedTransitOptionIndex(index);
    setBusDirections(nextDirections);
    setBusStopMarkers(buildTransitStopMarkers(transitRoute));
    if (routeMode === 'bus') {
      setIsTransitSheetOpen(true);
    }
    if (routeMode === 'bus') {
      applyActiveDirections(nextDirections, 'bus');
    }
  };

  const onSelectRouteMode = (mode: 'walk' | 'bus' | 'bike') => {
    const nextDirections = mode === 'bus' ? busDirections : mode === 'bike' ? bikeDirections : walkingDirections;
    if (!nextDirections) {
      return;
    }
    if (mode === 'bus') {
      setIsTransitSheetOpen(true);
    }
    applyActiveDirections(nextDirections, mode);
  };

  const clearRouteSelection = () => {
    setDirections(null);
    setWalkingDirections(null);
    setBusDirections(null);
    setBikeDirections(null);
    setTransitOptions([]);
    setSelectedTransitOptionIndex(0);
    setIsTransitDetailsOpen(false);
    setIsTransitDetailsVisible(false);
    setIsTransitSheetOpen(false);
    setBusStopMarkers([]);
    setRouteMode('walk');
    setIsNavigating(false);
    setHasStartedNavigationForSelection(false);
    setNavigationCameraMode('follow');
    setActiveStepIndex(0);
    setIsStepsExpanded(false);
  };

  const onSelectPlace = (place: PlaceSuggestion, options: { focusMap?: boolean } = { focusMap: true }) => {
    Keyboard.dismiss();
    setSearchQuery(place.name);
    setSelectedPlace(place);
    setSearchResults([]);
    clearRouteSelection();
    setError(null);
    if (options.focusMap) {
      setMapState(
        buildMapState({
          centerLat: place.location.lat,
          centerLng: place.location.lng,
          destinationLat: place.location.lat,
          destinationLng: place.location.lng,
          zoom: PLACE_FOCUS_ZOOM,
        }),
      );
    }
  };

  const onRequestDirections = async () => {
    if (!selectedPlace) {
      return;
    }

    const place = selectedPlace;
    try {
      setIsRouting(true);
      const origin = userLocation ?? UW_CENTER;

      // Robust fallback default accessibility preferences
      let prefs: AccessibilityPreferences = {
        avoid_stairs: true,
        max_slope_percent: 8.0,
        allowed_surfaces: ['paved', 'brick', 'mixed'],
        avoid_closures: true,
      };

      // Retrieve saved user preferences from storage
      try {
        const saved = await storage.get<Record<string, boolean>>('navable:settings');
        if (saved) {
          const isAccessible = saved.useAccessibleRouting !== false;
          prefs = {
            avoid_stairs: isAccessible ? saved.avoidStairs !== false : false,
            max_slope_percent: isAccessible ? (saved.avoidSteepSlopes === false ? 15.0 : 8.0) : 25.0,
            allowed_surfaces: isAccessible
              ? (saved.surfacePreferences === false ? ['paved', 'brick', 'gravel', 'mixed'] : ['paved', 'brick', 'mixed'])
              : ['paved', 'brick', 'gravel', 'mixed'],
            avoid_closures: isAccessible ? saved.routeAlerts !== false : false,
          };
        }
      } catch (prefErr) {
        console.warn('Failed to load user preferences; falling back to default access controls.', prefErr);
      }

      // Snap destination to nearest entrance POI within 150m.
      // This ensures routing ends at an actual door, not a building centroid.
      const ENTRANCE_SNAP_RADIUS_M = 150;
      let routingDestination = place.location;

      const nearbyEntrances = pois
        .filter((poi) => poi.type === 'entrance' || poi.type === 'elevator')
        .map((poi) => ({ poi, dist: distanceMeters(place.location, poi.location) }))
        .filter(({ dist }) => dist <= ENTRANCE_SNAP_RADIUS_M)
        .sort((a, b) => {
          // Prefer accessible entrances, then closest
          const aScore = (a.poi.is_accessible ? 0 : 1000) + a.dist;
          const bScore = (b.poi.is_accessible ? 0 : 1000) + b.dist;
          return aScore - bScore;
        });

      if (nearbyEntrances.length > 0) {
        routingDestination = nearbyEntrances[0].poi.location;
      }

      // Query custom backend Dijkstra routing engine
      const routeResponse = await api.createRoute({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: routingDestination.lat, lng: routingDestination.lng },
        preferences: prefs,
      });

      // Show a standard premium warning dialog if the route is not fully compliant with the user's settings
      if (routeResponse.warnings && routeResponse.warnings.length > 0) {
        const filteredWarnings = routeResponse.warnings.map((w) =>
          w.replace(/Segment \d+\.\d+,\s*-\d+\.\d+ -> \d+\.\d+,\s*-\d+\.\d+/, 'Walkway segment'),
        );
        Alert.alert(
          'Accessibility Warnings Found',
          `The calculated route violates some of your accessibility settings:\n\n• ${filteredWarnings.slice(0, 3).join('\n• ')}${filteredWarnings.length > 3 ? '\n• ...and other segments.' : ''}\n\nPlease proceed with caution.`,
          [{ text: 'OK', style: 'default' }],
        );
      }

      // Convert backend route segments into compatible front-end DirectionsResponse
      const nextDirections = mapRouteToDirections(routeResponse);
      setWalkingDirections(nextDirections);
      applyActiveDirections(nextDirections, 'walk');

      try {
        const transitRoute = await api.getTransitRoute({
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: routingDestination.lat,
          destinationLng: routingDestination.lng,
        });
        const nextTransitOptions = (transitRoute.options?.length ? transitRoute.options : [transitRoute]).filter((option) =>
          option.legs.some((leg) => leg.type === 'transit'),
        );
        if (nextTransitOptions.length) {
          setTransitOptions(nextTransitOptions);
          selectTransitOption(0, nextTransitOptions);
        }
      } catch (transitErr) {
        console.warn('No bus route available for this destination.', transitErr);
      }

      try {
        const bikeRoute = await api.getBikeDirections({
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: routingDestination.lat,
          destinationLng: routingDestination.lng,
        });
        setBikeDirections(bikeRoute);
      } catch (bikeErr) {
        console.warn('No bike route available for this destination.', bikeErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to build navigation route');
    } finally {
      setIsRouting(false);
    }
  };

  const triggerReroute = async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
    if (isRerouting || !directions) return;
    setIsRerouting(true);
    try {
      if (routeMode === 'walk') {
        let prefs: AccessibilityPreferences = {
          avoid_stairs: true,
          max_slope_percent: 8.0,
          allowed_surfaces: ['paved', 'brick', 'mixed'],
          avoid_closures: true,
        };

        try {
          const saved = await storage.get<Record<string, boolean>>('navable:settings');
          if (saved) {
            const isAccessible = saved.useAccessibleRouting !== false;
            prefs = {
              avoid_stairs: isAccessible ? saved.avoidStairs !== false : false,
              max_slope_percent: isAccessible ? (saved.avoidSteepSlopes === false ? 15.0 : 8.0) : 25.0,
              allowed_surfaces: isAccessible
                ? (saved.surfacePreferences === false ? ['paved', 'brick', 'gravel', 'mixed'] : ['paved', 'brick', 'mixed'])
                : ['paved', 'brick', 'gravel', 'mixed'],
              avoid_closures: isAccessible ? saved.routeAlerts !== false : false,
            };
          }
        } catch (prefErr) {
          console.warn('Failed to load user preferences; falling back to default access controls.', prefErr);
        }

        const routeResponse = await api.createRoute({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          preferences: prefs,
        });

        const nextDirections = mapRouteToDirections(routeResponse);
        setWalkingDirections(nextDirections);
        applyActiveDirections(nextDirections, 'walk');
      } else if (routeMode === 'bike') {
        const bikeRoute = await api.getBikeDirections({
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
        });
        setBikeDirections(bikeRoute);
        applyActiveDirections(bikeRoute, 'bike');
      } else if (routeMode === 'bus') {
        const transitRoute = await api.getTransitRoute({
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
        });
        const nextTransitOptions = (transitRoute.options?.length ? transitRoute.options : [transitRoute]).filter((option) =>
          option.legs.some((leg) => leg.type === 'transit'),
        );
        if (nextTransitOptions.length) {
          setTransitOptions(nextTransitOptions);
          const nextDirections = mapTransitRouteToDirections(nextTransitOptions[0]);
          setBusDirections(nextDirections);
          applyActiveDirections(nextDirections, 'bus');
        }
      }
      setActiveStepIndex(0);
      console.log('Successfully rerouted user back to target destination.');
    } catch (err) {
      console.warn('Failed to reroute:', err);
    } finally {
      setIsRerouting(false);
    }
  };

  const onSubmitSearch = async () => {
    Keyboard.dismiss();

    const nextQuery = searchQuery.trim();
    if (nextQuery.length < 2) {
      return;
    }

    try {
      setIsSearching(true);
      const results = await api.searchPlaces(nextQuery, 6);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search places');
    } finally {
      setIsSearching(false);
    }
  };

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (selectedPlace && value.trim() !== selectedPlace.name) {
      setSelectedPlace(null);
      clearRouteSelection();
    }
  };

  const onClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    clearRouteSelection();
    Keyboard.dismiss();
  };

  const startNavigation = () => {
    if (!directions) {
      return;
    }
    setIsTransitSheetOpen(false);
    setIsTransitDetailsOpen(false);
    setIsStepsExpanded(false);
    setIsNavigating(true);
    setHasStartedNavigationForSelection(true);
    setNavigationCameraMode('follow');
    setActiveStepIndex(0);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setNavigationCameraMode('follow');
    setActiveStepIndex(0);
  };

  const exitRoute = () => {
    Keyboard.dismiss();
    clearRouteSelection();
    setSearchResults([]);
    setSelectedPlace(null);
    setSearchQuery('');
    setMapState(
      buildMapState({
        centerLat: UW_FOUNTAIN_CENTER.lat,
        centerLng: UW_FOUNTAIN_CENTER.lng,
        zoom: DEFAULT_MAP_ZOOM,
      }),
    );
  };

  const activeStep = isNavigating ? directions?.steps[activeStepIndex] ?? null : null;
  const showSelectedPlaceIntroCard = Boolean(selectedPlace && !isNavigating && !hasStartedNavigationForSelection);
  const followCameraHeading = useMemo(() => {
    if (isNavigating && navigationCameraMode === 'follow' && userLocation && activeStep) {
      return bearingDegrees(userLocation, activeStep.end_location);
    }
    return userLocation?.heading ?? 0;
  }, [activeStep, isNavigating, navigationCameraMode, userLocation]);

  useEffect(() => {
    Animated.timing(chipBarAnim, {
      toValue: showBaseChips ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [chipBarAnim, showBaseChips]);

  useEffect(() => {
    const handleVoiceGuidance = async () => {
      if (isNavigating && directions && directions.steps[activeStepIndex]) {
        const saved = await storage.get<Record<string, boolean>>('navable:settings');
        const voiceEnabled = saved ? saved.voiceGuidance !== false : true;
        if (voiceEnabled) {
          const step = directions.steps[activeStepIndex];
          const speechText = step.instruction.replace(/\s*\([^)]*\)\s*$/, '');
          void ttsService.speak(speechText);
          return;
        }
      }
      void ttsService.stop();
    };
    void handleVoiceGuidance();

    return () => {
      void ttsService.stop();
    };
  }, [activeStepIndex, isNavigating, directions]);

  useEffect(() => {
    if (!isNavigating || !directions || !userLocation) {
      return;
    }

    const currentStep = directions.steps[activeStepIndex];
    if (!currentStep) {
      return;
    }

    const remaining = distanceMeters(userLocation, currentStep.end_location);
    if (remaining <= 18) {
      if (activeStepIndex < directions.steps.length - 1) {
        setActiveStepIndex((index) => index + 1);
      } else {
        setIsNavigating(false);
      }
    }
  }, [activeStepIndex, directions, isNavigating, userLocation]);

  useEffect(() => {
    if (!isNavigating || !userLocation || !directions || isRerouting) {
      return;
    }

    const points = decodeGooglePolyline(directions.overview_polyline);
    if (points.length < 2) {
      return;
    }

    let minDistance = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
      const A = points[i];
      const B = points[i + 1];

      const dx = B.lng - A.lng;
      const dy = B.lat - A.lat;

      let t = 0;
      const denominator = dx * dx + dy * dy;
      if (denominator > 1e-12) {
        t = ((userLocation.lng - A.lng) * dx + (userLocation.lat - A.lat) * dy) / denominator;
        t = Math.max(0, Math.min(1, t));
      }

      const projectedPoint = {
        lat: A.lat + t * dy,
        lng: A.lng + t * dx,
      };

      const dist = distanceMeters(userLocation, projectedPoint);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    const STRAY_THRESHOLD_METERS = 22;
    if (minDistance > STRAY_THRESHOLD_METERS) {
      console.log(`User strayed from route (distance: ${minDistance.toFixed(1)}m). Triggering automatic rerouting...`);
      void triggerReroute(userLocation, directions.end_location);
    }
  }, [directions, isNavigating, userLocation, isRerouting]);

  useEffect(() => {
    if (!isNavigating || !userLocation || !directions) {
      return;
    }

    if (navigationCameraMode === 'overview') {
      const overview = computeOverviewCamera(directions);
      setMapState(
        buildMapState({
          centerLat: overview.centerLat,
          centerLng: overview.centerLng,
          destinationLat: directions.end_location.lat,
          destinationLng: directions.end_location.lng,
          pathPolyline: directions.overview_polyline,
          pathColor: '7B3FF3FF',
          routeSegments: directions.route_segments,
          zoom: overview.zoom,
        }),
      );
      return;
    }

    if (navigationCameraMode === 'free') {
      return;
    }

    setMapState(
      buildMapState({
        centerLat: userLocation.lat,
        centerLng: userLocation.lng,
        destinationLat: directions.end_location.lat,
        destinationLng: directions.end_location.lng,
        pathPolyline: directions.overview_polyline,
        pathColor: '7B3FF3FF',
        routeSegments: directions.route_segments,
        zoom: NAVIGATION_MAP_ZOOM,
      }),
    );
  }, [directions, isNavigating, navigationCameraMode, userLocation]);

  return (
    <View style={styles.screen}>
      <HomeTopPanel
        searchQuery={searchQuery}
        isSearching={isSearching}
        hasSearchResults={hasSearchResults}
        searchResults={searchResults}
        showSelectedPlaceIntroCard={showSelectedPlaceIntroCard}
        selectedPlace={selectedPlace}
        routeDistanceText={routeDistanceText}
        routeArrivalText={routeArrivalText}
        walkRouteSummary={walkRouteSummary}
        hasDirections={Boolean(directions)}
        isRouting={isRouting}
        routeMode={routeMode}
        hasBusOption={Boolean(busDirections)}
        busRouteSummary={busRouteSummary}
        hasBikeOption={Boolean(bikeDirections)}
        bikeRouteSummary={bikeRouteSummary}
        onSearchChange={onSearchChange}
        onSubmitSearch={() => void onSubmitSearch()}
        onClearSearch={onClearSearch}
        onSelectPlace={(place) => void onSelectPlace(place)}
        onSelectRouteMode={onSelectRouteMode}
        onRequestDirections={() => void onRequestDirections()}
        onStartNavigation={startNavigation}
        onCancelRoute={exitRoute}
      />

      <View style={styles.mapArea}>
        {isLoading || isRouting ? <ActivityIndicator style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {locationError ? <Text style={styles.error}>{locationError}</Text> : null}

        <HomeChipRow
          rampsCount={rampsCount}
          entrancesCount={entrancesCount}
          alertsCount={alerts.length}
          chipBarAnim={chipBarAnim}
          showBaseChips={showBaseChips}
          onPressAlerts={() => setIsAlertsDrawerOpen(true)}
        />

        {routeSummary && !showSelectedPlaceIntroCard ? <Text style={styles.routeSummary}>{routeSummary}</Text> : null}
        {directions && !showSelectedPlaceIntroCard ? (
          <Pressable style={styles.topLeftExitButton} onPress={exitRoute} accessibilityRole="button" accessibilityLabel="Exit route">
            <AntDesign name="close" size={18} color="#1D1233" />
          </Pressable>
        ) : null}
        {directions && (isNavigating || hasStartedNavigationForSelection) ? (
          <View style={styles.routeActionsRow}>
            <Pressable style={[styles.navigateButton, isNavigating ? styles.stopButton : undefined]} onPress={isNavigating ? stopNavigation : startNavigation}>
              <Text style={styles.navigateButtonText}>{isNavigating ? 'Stop Navigation' : 'Start Navigation'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.mapContainer}>
          <CampusMap
            fallbackMapUrl={mapState.url}
            centerLat={mapState.centerLat}
            centerLng={mapState.centerLng}
            zoom={mapState.zoom}
            userLocation={userLocation}
            destination={directions?.end_location ?? selectedPlace?.location ?? null}
            overviewPolyline={directions?.overview_polyline}
            routeSegments={directions?.route_segments}
            routeLineColor="#7B3FF3"
            routeStopMarkers={routeMode === 'bus' ? busStopMarkers : []}
            isNavigating={isNavigating && navigationCameraMode === 'follow'}
            cameraHeading={followCameraHeading}
            alerts={alerts}
            onAlertSelect={setSelectedAlert}
            pois={pois}
            onPoiSelect={(poi) => {
              void onSelectPlace(
                {
                  place_id: poi.id,
                  name: poi.name,
                  address: `Campus POI: ${poi.type}`,
                  location: poi.location,
                },
                { focusMap: false },
              );
            }}
            onUserMapGesture={() => {
              if (Date.now() < suppressMapGestureUntilRef.current) {
                return;
              }
              if (isNavigating && navigationCameraMode === 'follow') {
                setNavigationCameraMode('free');
              }
            }}
          />

          {isNavigating && directions ? (
            <Pressable
              style={styles.floatingModeButton}
              onPress={() =>
                setNavigationCameraMode((prev) => {
                  if (prev === 'follow') {
                    return 'overview';
                  }
                  suppressMapGestureUntilRef.current = Date.now() + 1400;
                  return 'follow';
                })
              }
              accessibilityRole="button"
              accessibilityLabel={navigationCameraMode === 'follow' ? 'Show full route' : 'Follow my directions'}>
              <Ionicons name={navigationCameraMode === 'follow' ? 'navigate-sharp' : 'navigate-outline'} size={22} color="#FFFFFF" />
            </Pressable>
          ) : null}

          {isNavigating && activeStep ? (
            <HomeNavigationCard
              activeStepIndex={activeStepIndex}
              totalSteps={directions?.steps.length ?? 0}
              instruction={activeStep.instruction}
              distanceText={activeStep.distance_text}
              durationText={activeStep.duration_text}
              steps={directions?.steps ?? []}
              expanded={isStepsExpanded}
              onToggleExpanded={() => setIsStepsExpanded((v) => !v)}
            />
          ) : null}

          {routeMode === 'bus' && publicTransportOptions.length && !isNavigating && !hasStartedNavigationForSelection ? (
            <Animated.View
              style={[
                styles.transitSheet,
                {
                  transform: [
                    {
                      translateY: transitSheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [262, 0],
                      }),
                    },
                  ],
                },
              ]}
              {...transitSheetPanResponder.panHandlers}>
              <Pressable
                style={styles.transitSheetHandleArea}
                onPress={() => setIsTransitSheetOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={isTransitSheetOpen ? 'Hide public transport options' : 'Show public transport options'}>
                <View style={styles.transitSheetHandle} />
                <View style={styles.transitSheetHeader}>
                  <Text style={styles.transitSheetTitle}>Public transport options</Text>
                  <Text style={styles.transitSheetMeta}>
                    {selectedPublicTransportOption?.busName ?? 'Transit'} · {selectedPublicTransportOption?.durationText ?? ''}
                  </Text>
                </View>
              </Pressable>

              {isTransitSheetOpen ? (
                <ScrollView style={styles.transitSheetScroll} contentContainerStyle={styles.transitSheetContent} nestedScrollEnabled>
                  {publicTransportOptions.map((option, index) => (
                    <Pressable
                      key={option.id}
                      style={[styles.transitOption, option.isSelected && styles.transitOptionActive]}
                      onPress={() => selectTransitOption(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${option.busName} public transport option`}>
                      <View style={styles.transitOptionHeader}>
                        <View style={styles.transitOptionNameRow}>
                          <MaterialIcons name="directions-bus" size={18} color="#F4C430" />
                          <Text style={styles.transitOptionName}>{option.busName}</Text>
                          <Text style={styles.transitDepartTime}>departs @ {option.departTime}</Text>
                        </View>
                        <Text style={styles.transitOptionDuration}>{option.durationText}</Text>
                      </View>
                      <Text style={styles.transitTimeline}>{option.timeline}</Text>
                      <View style={styles.transitTimesRow}>
                        {option.leaveText ? <Text style={styles.transitMeta}>{option.leaveText}</Text> : null}
                        {option.arrivalText ? <Text style={styles.transitMeta}>{option.arrivalText}</Text> : null}
                        {!option.leaveText && !option.arrivalText ? <Text style={styles.transitMeta}>Next available departure</Text> : null}
                      </View>
                      {option.isSelected ? (
                        <Pressable style={styles.transitDetailsInlineButton} onPress={() => setIsTransitDetailsOpen(true)}>
                          <Text style={styles.transitDetailsButtonText}>Details</Text>
                        </Pressable>
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </Animated.View>
          ) : null}

          {isTransitDetailsVisible && selectedPublicTransportOption ? (
            <View style={styles.transitDetailsOverlay}>
              <Pressable style={styles.transitDetailsBackdrop} onPress={() => setIsTransitDetailsOpen(false)} />
              <Animated.View
                style={[
                  styles.transitDetailsPopup,
                  {
                    opacity: transitDetailsAnim,
                    transform: [
                      {
                        translateY: transitDetailsAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [28, 0],
                        }),
                      },
                    ],
                  },
                ]}>
                <View style={styles.transitDetailsPopupHeader}>
                  <View>
                    <Text style={styles.transitDetailsPopupTitle}>{selectedPublicTransportOption.busName}</Text>
                    <Text style={styles.transitDetailsPopupMeta}>{selectedPublicTransportOption.durationText}</Text>
                  </View>
                  <Pressable
                    style={styles.transitDetailsCloseButton}
                    onPress={() => setIsTransitDetailsOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Close transit route details">
                    <AntDesign name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
                <ScrollView style={styles.transitDetailsPopupScroll} contentContainerStyle={styles.transitDetailsList}>
                  {selectedPublicTransportOption.details.map((detail, index) => (
                    <Text key={`${detail}-${index}`} style={styles.transitDetailText}>
                      {index + 1}. {detail}
                    </Text>
                  ))}
                </ScrollView>
              </Animated.View>
            </View>
          ) : null}

          {/* 🔴 Active / Resolved Alert Details Popup Card */}
          {selectedAlert ? (
            <View style={styles.alertDetailsCard}>
              <View style={styles.alertHeaderRow}>
                <View style={styles.alertTitleBadgeRow}>
                  {/* Severity badge */}
                  <View
                    style={[
                      styles.severityBadge,
                      selectedAlert.severity === 'critical'
                        ? styles.severityCritical
                        : selectedAlert.severity === 'warning'
                        ? styles.severityWarning
                        : styles.severityInfo,
                    ]}>
                    <Text style={styles.severityBadgeText}>{selectedAlert.severity.toUpperCase()}</Text>
                  </View>

                  {/* Status badge */}
                  {selectedAlert.is_resolved || selectedAlert.status === 'resolved' ? (
                    <View style={[styles.statusBadge, styles.statusResolved]}>
                      <Text style={styles.statusBadgeText}>✅ Resolved</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.statusActive]}>
                      <View style={styles.pulsingDot} />
                      <Text style={styles.statusBadgeText}>⚠️ Active</Text>
                    </View>
                  )}
                </View>

                {/* Close button */}
                <Pressable
                  style={styles.closeAlertButton}
                  onPress={() => setSelectedAlert(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close alert details">
                  <AntDesign name="close" size={16} color="#B2B8CE" />
                </Pressable>
              </View>

              <Text style={styles.alertCardTitle}>{selectedAlert.title}</Text>
              <Text style={styles.alertCardDesc}>{selectedAlert.description}</Text>

              {/* Action buttons */}
              <View style={styles.alertCardActions}>
                {selectedAlert.location ? (
                  <Pressable
                    style={styles.alertActionZoomBtn}
                    onPress={() => {
                      if (selectedAlert.location) {
                        setMapState(
                          buildMapState({
                            centerLat: selectedAlert.location.lat,
                            centerLng: selectedAlert.location.lng,
                            zoom: 16,
                          })
                        );
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Zoom to alert location">
                    <MaterialIcons name="zoom-in-map" size={16} color="#FFFFFF" />
                    <Text style={styles.alertActionZoomText}>Zoom to Location</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.alertActionDismissBtn}
                  onPress={() => setSelectedAlert(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss alert">
                  <Text style={styles.alertActionDismissText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* ⚠️ All Alerts Full Overlay List Drawer */}
      {isAlertsDrawerOpen ? (
        <View style={styles.alertsDrawerContainer}>
          <View style={styles.alertsDrawerHeader}>
            <Text style={styles.alertsDrawerTitle}>Campus Advisories & Live Alerts</Text>
            <Pressable
              style={styles.closeDrawerButton}
              onPress={() => setIsAlertsDrawerOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close alerts drawer">
              <AntDesign name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView style={styles.alertsDrawerList} contentContainerStyle={{ paddingBottom: 40 }}>
            {alerts.length === 0 ? (
              <View style={styles.emptyAlertsContainer}>
                <Ionicons name="shield-checkmark-outline" size={48} color="#A88AF2" />
                <Text style={styles.emptyAlertsText}>All Clear!</Text>
                <Text style={styles.emptyAlertsSubtext}>No active construction or safety alerts on campus.</Text>
              </View>
            ) : (
              alerts.map((item) => {
                const isResolved = item.is_resolved || item.status === 'resolved';
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setIsAlertsDrawerOpen(false);
                      setSelectedAlert(item);
                      if (item.location) {
                        setMapState(
                          buildMapState({
                            centerLat: item.location.lat,
                            centerLng: item.location.lng,
                            zoom: 16,
                          })
                        );
                      }
                    }}
                    style={[styles.alertListItem, isResolved ? styles.alertListItemResolved : undefined]}
                    accessibilityRole="button"
                    accessibilityLabel={`Advisory: ${item.title}`}>
                    <View style={styles.alertListItemHeader}>
                      <View style={styles.alertListItemBadgeRow}>
                        <View
                          style={[
                            styles.severityBadge,
                            item.severity === 'critical'
                              ? styles.severityCritical
                              : item.severity === 'warning'
                              ? styles.severityWarning
                              : styles.severityInfo,
                          ]}>
                          <Text style={styles.severityBadgeText}>{item.severity.toUpperCase()}</Text>
                        </View>
                        {isResolved ? (
                          <View style={[styles.statusBadge, styles.statusResolved]}>
                            <Text style={styles.statusBadgeText}>✅ Resolved</Text>
                          </View>
                        ) : (
                          <View style={[styles.statusBadge, styles.statusActive]}>
                            <View style={styles.pulsingDot} />
                            <Text style={styles.statusBadgeText}>⚠️ Active</Text>
                          </View>
                        )}
                      </View>
                      {item.location ? (
                        <View style={styles.alertGeoIndicator}>
                          <Ionicons name="pin" size={12} color="#CDB7FF" />
                          <Text style={styles.alertGeoText}>Map Pin</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.alertListItemTitle}>{item.title}</Text>
                    <Text style={styles.alertListItemDesc} numberOfLines={3}>
                      {item.description}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
