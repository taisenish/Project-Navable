from __future__ import annotations

from math import sqrt

from src.models.schemas import Coordinate


class GoogleMapsService:
    """
    Placeholder wrapper around Google Maps routes/elevation/geocoding.
    Replace internals with real API calls once keys/billing are configured.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key

    def estimate_duration_seconds(self, distance_meters: int) -> int:
        walking_speed_m_per_s = 1.2
        return int(distance_meters / walking_speed_m_per_s)

    def distance_meters(self, a: Coordinate, b: Coordinate) -> int:
        # Simple local approximation for MVP fallback; not geodesic.
        dx = (a.lat - b.lat) * 111_000
        dy = (a.lng - b.lng) * 85_000
        return int(sqrt(dx * dx + dy * dy))
