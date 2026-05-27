from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class SurfaceType(str, Enum):
    paved = "paved"
    brick = "brick"
    gravel = "gravel"
    mixed = "mixed"


class PoiType(str, Enum):
    elevator = "elevator"
    restroom = "restroom"
    ramp = "ramp"
    entrance = "entrance"


class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class Coordinate(BaseModel):
    lat: float
    lng: float


class AccessibilityPreferences(BaseModel):
    avoid_stairs: bool = True
    max_slope_percent: float = Field(default=8.0, ge=0, le=100)
    allowed_surfaces: list[SurfaceType] = Field(default_factory=lambda: [SurfaceType.paved, SurfaceType.brick, SurfaceType.mixed])
    avoid_closures: bool = True


class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    preferences: AccessibilityPreferences = Field(default_factory=AccessibilityPreferences)


class RouteStep(BaseModel):
    instruction: str
    distance_meters: int
    accessibility_note: str | None = None
    end_location: Coordinate | None = None


class RouteLeg(BaseModel):
    distance_meters: int
    duration_seconds: int
    steps: list[RouteStep]


class RouteResponse(BaseModel):
    route_id: str
    source: str
    is_fully_accessible: bool
    warnings: list[str] = Field(default_factory=list)
    polyline: list[Coordinate]
    leg: RouteLeg


class Poi(BaseModel):
    id: str
    name: str
    type: PoiType
    is_accessible: bool = False
    location: Coordinate
    tags: list[str] = Field(default_factory=list)


class Alert(BaseModel):
    id: str
    title: str
    description: str
    severity: AlertSeverity
    location: Coordinate | None = None
    status: str = "active"
    is_resolved: bool = False


class UserPreferenceRecord(BaseModel):
    user_id: str
    preferences: AccessibilityPreferences


class ErrorResponse(BaseModel):
    error: str
    detail: str


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)


class GoogleNativeLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)


class GoogleWebLoginRequest(BaseModel):
    code: str = Field(min_length=1)
    redirect_uri: str = Field(min_length=1)


class AuthUser(BaseModel):
    user_id: str
    email: str
    full_name: str | None = None
    picture_url: str | None = None


class GoogleLoginResponse(BaseModel):
    user: AuthUser
    is_new_user: bool


class UwStaticMapParams(BaseModel):
    width: int = Field(default=600, ge=200, le=1280)
    height: int = Field(default=320, ge=200, le=1280)
    zoom: int = Field(default=15, ge=10, le=21)
    center_lat: float | None = None
    center_lng: float | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None
    path_polyline: str | None = None
    path_color: str = "7B3FF3FF"
    route_segment_polyline: list[str] = Field(default_factory=list)
    route_segment_color: list[str] = Field(default_factory=list)


class PlaceSuggestion(BaseModel):
    place_id: str
    name: str
    address: str
    location: Coordinate
    hours_text: str | None = None


class RouteSegmentDirection(BaseModel):
    overview_polyline: str
    color: str


class RouteStepDirection(BaseModel):
    instruction: str
    distance_text: str
    duration_text: str
    end_location: Coordinate
    accessibility_note: str | None = None


class GoogleDirectionsResponse(BaseModel):
    distance_text: str
    duration_text: str
    start_location: Coordinate
    end_location: Coordinate
    overview_polyline: str
    steps: list[RouteStepDirection]
    route_segments: list[RouteSegmentDirection] = Field(default_factory=list)
    google_maps_url: str


class TransitDetails(BaseModel):
    headsign: str = ""
    line_name: str = ""
    line_short_name: str = ""
    vehicle_type: str = ""
    departure_stop: str = ""
    arrival_stop: str = ""
    departure_location: Coordinate | None = None
    arrival_location: Coordinate | None = None
    departure_time: str = ""
    arrival_time: str = ""
    num_stops: int = 0


class TransitLeg(BaseModel):
    type: str
    distance_text: str
    duration_text: str
    duration_seconds: int
    start_location: Coordinate
    end_location: Coordinate
    overview_polyline: str
    transit_details: TransitDetails | None = None
    steps: list[RouteStepDirection] = Field(default_factory=list)


class TransitRouteResponse(BaseModel):
    total_distance_text: str
    total_duration_text: str
    duration_seconds: int = 0
    legs: list[TransitLeg]
    google_maps_url: str
    options: list["TransitRouteResponse"] = Field(default_factory=list)
