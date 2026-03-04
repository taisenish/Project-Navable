from __future__ import annotations

from dataclasses import dataclass

from src.models.schemas import (
    AccessibilityPreferences,
    Coordinate,
    RouteLeg,
    RouteRequest,
    RouteResponse,
    RouteStep,
    SurfaceType,
)
from src.services.google_maps_service import GoogleMapsService
from src.services.uw_data_service import UWDataService


@dataclass
class CampusEdge:
    start: Coordinate
    end: Coordinate
    distance_meters: int
    slope_percent: float
    has_stairs: bool
    surface: SurfaceType
    is_closed: bool


class RoutingEngine:
    def __init__(self, uw_data: UWDataService, maps: GoogleMapsService) -> None:
        self.uw_data = uw_data
        self.maps = maps

    def _parse_edges(self) -> list[CampusEdge]:
        parsed: list[CampusEdge] = []
        for row in self.uw_data.load_edges():
            parsed.append(
                CampusEdge(
                    start=Coordinate(lat=float(row["start_lat"]), lng=float(row["start_lng"])),
                    end=Coordinate(lat=float(row["end_lat"]), lng=float(row["end_lng"])),
                    distance_meters=int(row["distance_meters"]),
                    slope_percent=float(row["slope_percent"]),
                    has_stairs=row["has_stairs"].lower() == "true",
                    surface=SurfaceType(row["surface"]),
                    is_closed=row["is_closed"].lower() == "true",
                )
            )
        return parsed

    def _violates(self, edge: CampusEdge, prefs: AccessibilityPreferences) -> list[str]:
        violations: list[str] = []
        if prefs.avoid_stairs and edge.has_stairs:
            violations.append("stairs")
        if edge.slope_percent > prefs.max_slope_percent:
            violations.append("slope")
        if edge.surface not in prefs.allowed_surfaces:
            violations.append("surface")
        if prefs.avoid_closures and edge.is_closed:
            violations.append("closure")
        return violations

    def build_route(self, req: RouteRequest) -> RouteResponse:
        edges = self._parse_edges()
        warnings: list[str] = []
        selected: list[CampusEdge] = []

        for edge in edges:
            violations = self._violates(edge, req.preferences)
            if not violations:
                selected.append(edge)
            else:
                warnings.append(
                    f"Segment {edge.start.lat:.4f},{edge.start.lng:.4f} -> {edge.end.lat:.4f},{edge.end.lng:.4f} has: {', '.join(violations)}"
                )

        if not selected:
            fallback_distance = self.maps.distance_meters(req.origin, req.destination)
            fallback_duration = self.maps.estimate_duration_seconds(fallback_distance)
            leg = RouteLeg(
                distance_meters=fallback_distance,
                duration_seconds=fallback_duration,
                steps=[
                    RouteStep(
                        instruction="Proceed to destination using best-available path.",
                        distance_meters=fallback_distance,
                        accessibility_note="No fully compliant route found; review warnings.",
                    )
                ],
            )
            return RouteResponse(
                route_id="fallback-route",
                source="fallback",
                is_fully_accessible=False,
                warnings=warnings or ["No candidate edges available."],
                polyline=[req.origin, req.destination],
                leg=leg,
            )

        distance = sum(edge.distance_meters for edge in selected)
        duration = self.maps.estimate_duration_seconds(distance)
        steps = [
            RouteStep(
                instruction=f"Move from {edge.start.lat:.4f},{edge.start.lng:.4f} to {edge.end.lat:.4f},{edge.end.lng:.4f}",
                distance_meters=edge.distance_meters,
                accessibility_note=(
                    "Closed segment present." if edge.is_closed else f"Surface: {edge.surface.value}, slope: {edge.slope_percent}%"
                ),
            )
            for edge in selected
        ]

        polyline = [req.origin]
        for edge in selected:
            polyline.append(edge.end)
        if polyline[-1] != req.destination:
            polyline.append(req.destination)

        return RouteResponse(
            route_id="uw-accessible-route",
            source="uw+google",
            is_fully_accessible=not warnings,
            warnings=warnings,
            polyline=polyline,
            leg=RouteLeg(distance_meters=distance, duration_seconds=duration, steps=steps),
        )
