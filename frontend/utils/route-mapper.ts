import type { Coordinate, DirectionsResponse, DirectionsStep, RouteResponse } from '../types/api';
import { encodeGooglePolyline } from './polyline';

export function mapRouteToDirections(route: RouteResponse): DirectionsResponse {
  const distanceKm = (route.leg.distance_meters / 1000).toFixed(2);
  const durationMins = Math.round(route.leg.duration_seconds / 60);

  const startLoc = route.polyline[0] || { lat: 0, lng: 0 };
  const endLoc = route.polyline[route.polyline.length - 1] || { lat: 0, lng: 0 };

  const encodedPolyline = encodeGooglePolyline(route.polyline);

  const steps: DirectionsStep[] = route.leg.steps.map((step, idx) => {
    // Use step.end_location if provided by backend, else fallback to polyline index
    const stepEndLoc = step.end_location || route.polyline[idx + 1] || endLoc;

    let fullInstruction = step.instruction;
    if (step.accessibility_note) {
      // Append accessibility note to instructions for high user visibility
      fullInstruction += `\n(${step.accessibility_note})`;
    }

    return {
      instruction: fullInstruction,
      distance_text: `${step.distance_meters} m`,
      duration_text: `${Math.round(step.distance_meters / 1.4 / 60)} min`, // walk speed ~1.4 m/s
      end_location: stepEndLoc,
      accessibility_note: step.accessibility_note,
    };
  });

  return {
    distance_text: `${distanceKm} km`,
    duration_text: `${durationMins} min`,
    start_location: startLoc,
    end_location: endLoc,
    overview_polyline: encodedPolyline,
    steps,
    google_maps_url: '',
  };
}
