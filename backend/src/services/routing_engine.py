from __future__ import annotations

import heapq
import math
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
from src.services.maps_service import MapsService
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


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class RoutingEngine:
    def __init__(
        self,
        uw_data: UWDataService,
        maps: GoogleMapsService,
        maps_api: MapsService | None = None,
    ) -> None:
        self.uw_data = uw_data
        self.maps = maps
        self.maps_api = maps_api
        self.graph: dict[tuple[float, float], list[tuple[tuple[float, float], CampusEdge]]] = {}
        self.nodes: list[tuple[float, float]] = []
        self._initialize_graph()

    def _decode_polyline(self, polyline_str: str) -> list[Coordinate]:
        """Decode Google's encoded polyline format into a list of Coordinates."""
        index = 0
        len_str = len(polyline_str)
        lat = 0
        lng = 0
        coordinates = []

        while index < len_str:
            shift = 0
            result = 0
            while True:
                if index >= len_str:
                    break
                b = ord(polyline_str[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if not (b & 0x20):
                    break
            
            if index >= len_str and shift == 0:
                break
                
            dlat = ~(result >> 1) if (result & 1) else (result >> 1)
            lat += dlat

            shift = 0
            result = 0
            while True:
                if index >= len_str:
                    break
                b = ord(polyline_str[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if not (b & 0x20):
                    break

            dlng = ~(result >> 1) if (result & 1) else (result >> 1)
            lng += dlng

            coordinates.append(Coordinate(lat=lat / 1e5, lng=lng / 1e5))

        return coordinates

    def _initialize_graph(self) -> None:
        """Load campus walkway edges and construct a fully connected pathfinding graph.
        
        Tiny spatial gaps at intersections are resolved by adding virtual transition edges
        for nodes within 15 meters of each other, computed in O(N) using grid bucketing.
        """
        edges = self._parse_edges()

        for edge in edges:
            u = (round(edge.start.lat, 6), round(edge.start.lng, 6))
            v = (round(edge.end.lat, 6), round(edge.end.lng, 6))
            if u not in self.graph:
                self.graph[u] = []
            if v not in self.graph:
                self.graph[v] = []
            self.graph[u].append((v, edge))
            self.graph[v].append((u, edge))

        self.nodes = list(self.graph.keys())

        grid_size = 0.0002
        buckets: dict[tuple[int, int], list[tuple[float, float]]] = {}
        for node in self.nodes:
            bx = int(node[0] / grid_size)
            by = int(node[1] / grid_size)
            key = (bx, by)
            if key not in buckets:
                buckets[key] = []
            buckets[key].append(node)

        added_pairs = set()
        for node in self.nodes:
            bx = int(node[0] / grid_size)
            by = int(node[1] / grid_size)
            
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    neighbor_key = (bx + dx, by + dy)
                    if neighbor_key in buckets:
                        for other in buckets[neighbor_key]:
                            if node == other:
                                continue
                                
                            pair = tuple(sorted([node, other]))
                            if pair in added_pairs:
                                continue
                                
                            already_connected = False
                            for nbr, _ in self.graph[node]:
                                if nbr == other:
                                    already_connected = True
                                    break
                            if already_connected:
                                continue
                                
                            dist = haversine_distance(node[0], node[1], other[0], other[1])
                            if dist <= 15.0:
                                added_pairs.add(pair)
                                v_edge = CampusEdge(
                                    start=Coordinate(lat=node[0], lng=node[1]),
                                    end=Coordinate(lat=other[0], lng=other[1]),
                                    distance_meters=max(1, int(round(dist))),
                                    slope_percent=0.0,
                                    has_stairs=False,
                                    surface=SurfaceType.paved,
                                    is_closed=False
                                )
                                self.graph[node].append((other, v_edge))
                                self.graph[other].append((node, v_edge))

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

    def _snap_to_nearest_nodes(
        self, coord: Coordinate, nodes: list[tuple[float, float]], k: int = 3
    ) -> list[tuple[tuple[float, float], float]]:
        """Find the top K nearest coordinate nodes in the graph and return a list of (node, distance_meters)."""
        node_dists = []
        for node in nodes:
            dist = haversine_distance(coord.lat, coord.lng, node[0], node[1])
            node_dists.append((node, dist))
        node_dists.sort(key=lambda x: x[1])
        return node_dists[:k]

    def _dijkstra(
        self,
        start: tuple[float, float],
        end: tuple[float, float],
        preferences: AccessibilityPreferences,
        strict: bool,
    ) -> tuple[float, list[CampusEdge], list[str]] | None:
        """Run Dijkstra's algorithm from start node to end node.
        
        If strict is True, edges violating accessibility preferences are ignored.
        If strict is False, violations add penalty weights so accessible routes are prioritized.
        """
        pq = [(0.0, start)]
        distances = {start: 0.0}
        predecessors = {}

        while pq:
            cost, curr = heapq.heappop(pq)
            if cost > distances[curr]:
                continue
            if curr == end:
                path = []
                temp = end
                while temp != start:
                    parent, edge = predecessors[temp]
                    path.append(edge)
                    temp = parent
                path.reverse()

                warnings = []
                for edge in path:
                    violations = self._violates(edge, preferences)
                    if violations:
                        warnings.append(
                            f"Segment {edge.start.lat:.4f},{edge.start.lng:.4f} -> "
                            f"{edge.end.lat:.4f},{edge.end.lng:.4f} has: {', '.join(violations)}"
                        )
                return distances[end], path, warnings

            for neighbor, edge in self.graph.get(curr, []):
                violations = self._violates(edge, preferences)
                if strict and violations:
                    continue

                weight = haversine_distance(curr[0], curr[1], neighbor[0], neighbor[1])
                if not strict and violations:
                    if "closure" in violations:
                        weight += 100000.0
                    if "stairs" in violations:
                        weight += 1000.0
                    if "slope" in violations:
                        weight += edge.slope_percent * 50.0
                    if "surface" in violations:
                        weight += 500.0

                new_cost = cost + weight
                if neighbor not in distances or new_cost < distances[neighbor]:
                    distances[neighbor] = new_cost
                    predecessors[neighbor] = (curr, edge)
                    heapq.heappush(pq, (new_cost, neighbor))

        return None

    def build_route(self, req: RouteRequest) -> RouteResponse:
        """Build an optimal route from origin to destination.
        
        Snaps origin and destination to the campus walkway network. Tries to find a path
        respecting all accessibility preferences, falls back to relaxed routing with warnings,
        or triggers fallback route if endpoints are off-campus or unreachable.
        """
        if not self.nodes:
            return self._build_fallback_route(req, ["Walkway graph is empty."])

        snap_origins = self._snap_to_nearest_nodes(req.origin, self.nodes, k=3)
        snap_dests = self._snap_to_nearest_nodes(req.destination, self.nodes, k=3)

        if snap_origins[0][1] > 300.0 or snap_dests[0][1] > 300.0:
            warnings = []
            if snap_origins[0][1] > 300.0:
                warnings.append(f"Origin is off-campus ({snap_origins[0][1]:.1f}m away from nearest path).")
            if snap_dests[0][1] > 300.0:
                warnings.append(f"Destination is off-campus ({snap_dests[0][1]:.1f}m away from nearest path).")
            return self._build_fallback_route(req, warnings)

        best_result = None
        best_total_cost = float('inf')
        is_fully_accessible = True

        for s_origin, d_origin in snap_origins:
            for s_dest, d_dest in snap_dests:
                if d_origin > 300.0 or d_dest > 300.0:
                    continue
                res = self._dijkstra(s_origin, s_dest, req.preferences, strict=True)
                if res is not None:
                    path_cost, path, warnings = res
                    total_cost = path_cost + d_origin + d_dest
                    if total_cost < best_total_cost:
                        best_total_cost = total_cost
                        best_result = (path, warnings, s_origin, d_origin, s_dest, d_dest)

        if best_result is None:
            is_fully_accessible = False
            for s_origin, d_origin in snap_origins:
                for s_dest, d_dest in snap_dests:
                    if d_origin > 300.0 or d_dest > 300.0:
                        continue
                    res = self._dijkstra(s_origin, s_dest, req.preferences, strict=False)
                    if res is not None:
                        path_cost, path, warnings = res
                        total_cost = path_cost + d_origin + d_dest
                        if total_cost < best_total_cost:
                            best_total_cost = total_cost
                            best_result = (path, warnings, s_origin, d_origin, s_dest, d_dest)

        if best_result is None:
            return self._build_fallback_route(req, ["No path could be navigated between endpoints."])

        path, warnings, snap_origin, dist_origin, snap_dest, dist_dest = best_result

        polyline: list[Coordinate] = []
        steps: list[RouteStep] = []

        origin_stitched = False
        if dist_origin > 15.0 and self.maps_api and self.maps_api.api_key:
            try:
                google_route = self.maps_api.get_walking_directions(
                    destination_lat=snap_origin[0],
                    destination_lng=snap_origin[1],
                    origin_lat=req.origin.lat,
                    origin_lng=req.origin.lng,
                )
                decoded = self._decode_polyline(google_route['overview_polyline'])
                if decoded:
                    polyline.extend(decoded)
                    origin_stitched = True

                for step in google_route.get('steps', []):
                    steps.append(
                        RouteStep(
                            instruction=step['instruction'],
                            distance_meters=step['distance_meters'],
                            accessibility_note="Off-campus connection via Google Maps walking directions.",
                        )
                    )
            except Exception:
                pass

        if not origin_stitched:
            polyline.append(req.origin)
            polyline.append(Coordinate(lat=snap_origin[0], lng=snap_origin[1]))
            if (req.origin.lat, req.origin.lng) != snap_origin:
                dist_init = int(round(dist_origin))
                steps.append(
                    RouteStep(
                        instruction="Walk from origin to the nearest campus walkway.",
                        distance_meters=dist_init,
                        accessibility_note="Off-campus connection; path accessibility is unverified.",
                    )
                )

        curr_node = snap_origin
        for edge in path:
            next_node = (
                (edge.end.lat, edge.end.lng)
                if (round(edge.start.lat, 6), round(edge.start.lng, 6)) == curr_node
                else (edge.start.lat, edge.start.lng)
            )

            instruction = f"Walk from {curr_node[0]:.6f},{curr_node[1]:.6f} to {next_node[0]:.6f},{next_node[1]:.6f}"
            violations = self._violates(edge, req.preferences)

            if violations:
                acc_note = f"Warning: violates {', '.join(violations)}. Surface: {edge.surface.value}, slope: {edge.slope_percent}%"
            elif edge.is_closed:
                acc_note = "Warning: segment is closed."
            else:
                acc_note = f"Surface: {edge.surface.value}, slope: {edge.slope_percent}%"

            steps.append(
                RouteStep(
                    instruction=instruction,
                    distance_meters=edge.distance_meters,
                    accessibility_note=acc_note,
                )
            )

            polyline.append(Coordinate(lat=next_node[0], lng=next_node[1]))
            curr_node = next_node

        dest_stitched = False
        if dist_dest > 15.0 and self.maps_api and self.maps_api.api_key:
            try:
                google_route = self.maps_api.get_walking_directions(
                    destination_lat=req.destination.lat,
                    destination_lng=req.destination.lng,
                    origin_lat=snap_dest[0],
                    origin_lng=snap_dest[1],
                )
                decoded = self._decode_polyline(google_route['overview_polyline'])
                if decoded:
                    polyline.extend(decoded)
                    dest_stitched = True

                for step in google_route.get('steps', []):
                    steps.append(
                        RouteStep(
                            instruction=step['instruction'],
                            distance_meters=step['distance_meters'],
                            accessibility_note="Off-campus connection via Google Maps walking directions.",
                        )
                    )
            except Exception:
                pass

        if not dest_stitched:
            if (req.destination.lat, req.destination.lng) != snap_dest:
                dist_final = int(round(dist_dest))
                steps.append(
                    RouteStep(
                        instruction="Walk from campus walkway to destination.",
                        distance_meters=dist_final,
                        accessibility_note="Off-campus connection; path accessibility is unverified.",
                    )
                )
                polyline.append(req.destination)

        total_distance = sum(step.distance_meters for step in steps)
        total_duration = self.maps.estimate_duration_seconds(total_distance)

        return RouteResponse(
            route_id="uw-accessible-route",
            source="uw+google",
            is_fully_accessible=is_fully_accessible,
            warnings=warnings,
            polyline=polyline,
            leg=RouteLeg(
                distance_meters=total_distance,
                duration_seconds=total_duration,
                steps=steps,
            ),
        )

    def _build_fallback_route(self, req: RouteRequest, warnings: list[str]) -> RouteResponse:
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
