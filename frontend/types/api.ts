export type Coordinate = {
  lat: number;
  lng: number;
};

export type SurfaceType = 'paved' | 'brick' | 'gravel' | 'mixed';

export type AccessibilityPreferences = {
  avoid_stairs: boolean;
  max_slope_percent: number;
  allowed_surfaces: SurfaceType[];
  avoid_closures: boolean;
};

export type RouteRequest = {
  origin: Coordinate;
  destination: Coordinate;
  preferences: AccessibilityPreferences;
};

export type RouteStep = {
  instruction: string;
  distance_meters: number;
  accessibility_note?: string | null;
};

export type RouteResponse = {
  route_id: string;
  source: string;
  is_fully_accessible: boolean;
  warnings: string[];
  polyline: Coordinate[];
  leg: {
    distance_meters: number;
    duration_seconds: number;
    steps: RouteStep[];
  };
};

export type PoiType = 'elevator' | 'restroom' | 'ramp' | 'entrance';

export type Poi = {
  id: string;
  name: string;
  type: PoiType;
  location: Coordinate;
  tags: string[];
};

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type Alert = {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  location?: Coordinate | null;
};

export type UserPreferenceRecord = {
  user_id: string;
  preferences: AccessibilityPreferences;
};

export type AuthUser = {
  user_id: string;
  email: string;
  full_name?: string | null;
  picture_url?: string | null;
};

export type GoogleLoginRequest = {
  id_token: string;
};

export type GoogleLoginResponse = {
  user: AuthUser;
  is_new_user: boolean;
};

export type GoogleNativeLoginRequest = {
  id_token: string;
};

export type GoogleWebLoginRequest = {
  code: string;
  redirect_uri: string;
};

export type PlaceSuggestion = {
  place_id: string;
  name: string;
  address: string;
  location: Coordinate;
};

export type DirectionsStep = {
  instruction: string;
  distance_text: string;
  duration_text: string;
  end_location: Coordinate;
};

export type DirectionsResponse = {
  distance_text: string;
  duration_text: string;
  start_location: Coordinate;
  end_location: Coordinate;
  overview_polyline: string;
  steps: DirectionsStep[];
  google_maps_url: string;
};
