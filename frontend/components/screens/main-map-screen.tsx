import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Keyboard, Linking, Pressable, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import AntDesign from '@expo/vector-icons/AntDesign';

import { CampusMap } from '@/components/map/campus-map';
import { ThemedText } from '@/components/themed-text';
import { useRouteCache } from '@/hooks/use-route-cache';
import { api } from '@/services/api';
import { config } from '@/services/config';
import { homeStyles as styles } from '@/styles/home.styles';
import type { Alert as CampusAlert, DirectionsResponse, PlaceSuggestion, Poi, RouteResponse } from '@/types/api';
import { decodeGooglePolyline } from '@/utils/polyline';

const UW_CENTER = { lat: 47.6553, lng: -122.3035 };
const UW_FOUNTAIN_CENTER = { lat: 47.6539, lng: -122.3078 };
const DEFAULT_MAP_ZOOM = 14;
const NAVIGATION_MAP_ZOOM = 17;
const OVERVIEW_MIN_ZOOM = 13;

type MapState = {
  url: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
};

type NavigationCameraMode = 'follow' | 'overview' | 'free';

function buildMapState(params?: {
  centerLat?: number;
  centerLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  pathPolyline?: string;
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
  if (params?.pathPolyline) {
    search.set('path_polyline', params.pathPolyline);
  }

  return {
    url: `${config.apiBaseUrl}/maps/uw-static?${search.toString()}`,
    centerLat,
    centerLng,
    zoom,
  };
}

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
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

function bearingDegrees(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [hasStartedNavigationForSelection, setHasStartedNavigationForSelection] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [directions, setDirections] = useState<DirectionsResponse | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationCameraMode, setNavigationCameraMode] = useState<NavigationCameraMode>('follow');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [mapState, setMapState] = useState<MapState>(
    buildMapState({
      centerLat: UW_FOUNTAIN_CENTER.lat,
      centerLng: UW_FOUNTAIN_CENTER.lng,
    }),
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const suppressMapGestureUntilRef = useRef(0);

  const handlePermissionDenied = (canAskAgain: boolean) => {
    setLocationError('Location permission is required to show your live position.');
    setUserLocation({ lat: UW_CENTER.lat, lng: UW_CENTER.lng, heading: 0 });
    if (!canAskAgain) {
      Alert.alert(
        'Enable Location Access',
        'Location permission was denied. Enable it in iOS Settings to show your live location.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
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

        const existing = await Location.getForegroundPermissionsAsync();
        const permission =
          existing.status === 'granted'
            ? existing
            : await Location.requestForegroundPermissionsAsync();
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
        const [cachedRoute, fetchedPois, fetchedAlerts] = await Promise.all([
          getRoute(),
          api.getPois(),
          api.getAlerts(),
        ]);
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

  const routeSummary = useMemo(() => {
    if (directions) {
      return `${directions.distance_text} • ${directions.duration_text}`;
    }
    if (route) {
      const km = (route.leg.distance_meters / 1000).toFixed(2);
      const min = Math.round(route.leg.duration_seconds / 60);
      return `${km} km • ${min} min`;
    }
    return null;
  }, [directions, route]);

  const onSelectPlace = async (place: PlaceSuggestion) => {
    Keyboard.dismiss();
    setSearchQuery(place.name);
    setSelectedPlace(place);
    setSearchResults([]);
    setError(null);

    try {
      setIsRouting(true);
      const origin = userLocation ?? UW_CENTER;
      const nextDirections = await api.getDirections({
        destinationLat: place.location.lat,
        destinationLng: place.location.lng,
        originLat: origin.lat,
        originLng: origin.lng,
      });
      setDirections(nextDirections);
      setIsNavigating(false);
      setHasStartedNavigationForSelection(false);
      setNavigationCameraMode('follow');
      setActiveStepIndex(0);
      setMapState(
        buildMapState({
          centerLat: place.location.lat,
          centerLng: place.location.lng,
          destinationLat: nextDirections.end_location.lat,
          destinationLng: nextDirections.end_location.lng,
          pathPolyline: nextDirections.overview_polyline,
          zoom: DEFAULT_MAP_ZOOM,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to build navigation route');
    } finally {
      setIsRouting(false);
    }
  };

  const onSubmitSearch = async () => {
    Keyboard.dismiss();
    if (searchResults.length > 0) {
      await onSelectPlace(searchResults[0]);
      return;
    }

    const nextQuery = searchQuery.trim();
    if (nextQuery.length < 2) {
      return;
    }

    try {
      setIsSearching(true);
      const results = await api.searchPlaces(nextQuery, 6);
      if (results.length > 0) {
        await onSelectPlace(results[0]);
      } else {
        setSearchResults([]);
      }
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
    }
  };

  const startNavigation = () => {
    if (!directions) {
      return;
    }
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
    setDirections(null);
    setIsNavigating(false);
    setHasStartedNavigationForSelection(false);
    setNavigationCameraMode('follow');
    setActiveStepIndex(0);
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
  const showSelectedPlaceIntroCard = Boolean(selectedPlace && directions && !isNavigating && !hasStartedNavigationForSelection);
  const followCameraHeading = useMemo(() => {
    if (
      isNavigating &&
      navigationCameraMode === 'follow' &&
      userLocation &&
      activeStep
    ) {
      return bearingDegrees(userLocation, activeStep.end_location);
    }
    return userLocation?.heading ?? 0;
  }, [activeStep, isNavigating, navigationCameraMode, userLocation]);

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
        zoom: NAVIGATION_MAP_ZOOM,
      }),
    );
  }, [directions, isNavigating, navigationCameraMode, userLocation]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBubble}>
            <Image source={require('@/assets/images/navable_logo.png')} style={styles.logo} />
          </View>
          <View>
            <ThemedText style={styles.brandTitle}>NavAble</ThemedText>
            <ThemedText style={styles.brandSubtitle}>Accessible Campus Navigation</ThemedText>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or place..."
            placeholderTextColor="#E9D8FF"
            accessibilityLabel="Search buildings and facilities"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => void onSubmitSearch()}
            onBlur={Keyboard.dismiss}
          />

          {isSearching ? <ActivityIndicator style={styles.searchLoader} color="#FFFFFF" /> : null}

          {hasSearchResults ? (
            <View style={styles.searchResults}>
              {searchResults.map((item) => (
                <Pressable
                  key={item.place_id}
                  style={styles.searchResultItem}
                  onPress={() => void onSelectPlace(item)}>
                  <ThemedText style={styles.searchResultName}>{item.name}</ThemedText>
                  <ThemedText style={styles.searchResultAddress}>{item.address}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {showSelectedPlaceIntroCard ? (
          <View style={styles.selectedPlaceCard}>
            <View style={styles.selectedPlaceTextWrap}>
              <ThemedText style={styles.selectedPlaceName}>{selectedPlace?.name ?? ''}</ThemedText>
              <ThemedText style={styles.selectedPlaceAddress}>{selectedPlace?.address ?? ''}</ThemedText>
              {routeSummary ? <ThemedText style={styles.selectedPlaceMeta}>{routeSummary}</ThemedText> : null}
            </View>
            <View style={styles.selectedPlaceActionStack}>
              <Pressable
                style={styles.selectedPlaceCancelButton}
                onPress={exitRoute}
                accessibilityRole="button"
                accessibilityLabel="Cancel route">
                <ThemedText style={styles.selectedPlaceCancelButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={styles.selectedPlaceButton}
                onPress={startNavigation}
                accessibilityRole="button"
                accessibilityLabel="Start navigation">
                <ThemedText style={styles.selectedPlaceButtonText}>Start</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.mapArea}>
        {(isLoading || isRouting) ? <ActivityIndicator style={styles.loader} /> : null}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        {locationError ? <ThemedText style={styles.error}>{locationError}</ThemedText> : null}

        {routeSummary && !showSelectedPlaceIntroCard ? <ThemedText style={styles.routeSummary}>{routeSummary}</ThemedText> : null}
        {directions && !showSelectedPlaceIntroCard ? (
          <Pressable
            style={styles.topLeftExitButton}
            onPress={exitRoute}
            accessibilityRole="button"
            accessibilityLabel="Exit route">
            <AntDesign name="close" size={18} color="#1D1233" />
          </Pressable>
        ) : null}
        {directions && (isNavigating || hasStartedNavigationForSelection) ? (
          <View style={styles.routeActionsRow}>
            <Pressable
              style={[styles.navigateButton, isNavigating ? styles.stopButton : undefined]}
              onPress={isNavigating ? stopNavigation : startNavigation}>
              <ThemedText style={styles.navigateButtonText}>
                {isNavigating ? 'Stop Navigation' : 'Start Navigation'}
              </ThemedText>
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
            destination={directions?.end_location ?? null}
            overviewPolyline={directions?.overview_polyline}
            isNavigating={isNavigating && navigationCameraMode === 'follow'}
            cameraHeading={followCameraHeading}
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
              <Ionicons
                name={navigationCameraMode === 'follow' ? 'navigate-sharp' : 'navigate-outline'}
                size={22}
                color="#FFFFFF"
              />
            </Pressable>
          ) : null}

          {isNavigating && activeStep ? (
            <View style={styles.navCard}>
              <ThemedText style={styles.navCardTitle}>
                Step {activeStepIndex + 1} of {directions?.steps.length ?? 0}
              </ThemedText>
              <ThemedText style={styles.navInstruction}>{activeStep.instruction}</ThemedText>
              <ThemedText style={styles.navMeta}>
                {activeStep.distance_text} • {activeStep.duration_text}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
