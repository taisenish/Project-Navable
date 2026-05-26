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
  end_location?: Coordinate | null;
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
  is_accessible: boolean;
  location: Coordinate;
  tags: string[];
};

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertStatus = 'active' | 'resolved' | 'investigating';

export type Alert = {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  location?: Coordinate | null;
  status?: AlertStatus;
  is_resolved?: boolean;
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
  hours_text?: string | null;
};

export type DirectionsStep = {
  instruction: string;
  distance_text: string;
  duration_text: string;
  end_location: Coordinate;
  accessibility_note?: string | null;
};

export type RouteSegment = {
  overview_polyline: string;
  color: string;
};

export type DirectionsResponse = {
  distance_text: string;
  duration_text: string;
  start_location: Coordinate;
  end_location: Coordinate;
  overview_polyline: string;
  route_segments?: RouteSegment[];
  steps: DirectionsStep[];
  google_maps_url: string;
};

export type TransitDetails = {
  headsign: string;
  line_name: string;
  line_short_name: string;
  vehicle_type: string;
  departure_stop: string;
  arrival_stop: string;
  departure_location?: Coordinate | null;
  arrival_location?: Coordinate | null;
  departure_time?: string;
  arrival_time?: string;
  num_stops: number;
};

export type TransitLeg = {
  type: 'walk' | 'transit';
  distance_text: string;
  duration_text: string;
  duration_seconds: number;
  start_location: Coordinate;
  end_location: Coordinate;
  overview_polyline: string;
  transit_details?: TransitDetails | null;
  steps: DirectionsStep[];
};

export type TransitRouteResponse = {
  total_distance_text: string;
  total_duration_text: string;
  duration_seconds?: number;
  legs: TransitLeg[];
  google_maps_url: string;
  options?: TransitRouteResponse[];
};
