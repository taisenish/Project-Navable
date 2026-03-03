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
    location: Coordinate
    tags: list[str] = Field(default_factory=list)


class Alert(BaseModel):
    id: str
    title: str
    description: str
    severity: AlertSeverity
    location: Coordinate | None = None


class UserPreferenceRecord(BaseModel):
    user_id: str
    preferences: AccessibilityPreferences


class ErrorResponse(BaseModel):
    error: str
    detail: str


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)


class AuthUser(BaseModel):
    user_id: str
    email: str
    full_name: str | None = None
    picture_url: str | None = None


class GoogleLoginResponse(BaseModel):
    user: AuthUser
