import type { Coordinate, DirectionsResponse, DirectionsStep, RouteResponse, TransitRouteResponse } from '../types/api';
import { decodeGooglePolyline, encodeGooglePolyline } from './polyline';

export function mapRouteToDirections(route: RouteResponse): DirectionsResponse {
  const distanceMiles = (route.leg.distance_meters * 0.000621371).toFixed(2);
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

    const stepDistanceFeet = Math.round(step.distance_meters * 3.28084);

    return {
      instruction: fullInstruction,
      distance_text: `${stepDistanceFeet} ft`,
      duration_text: `${Math.round(step.distance_meters / 1.4 / 60)} min`, // walk speed ~1.4 m/s
      end_location: stepEndLoc,
      accessibility_note: step.accessibility_note,
    };
  });

  return {
    distance_text: `${distanceMiles} mi`,
    duration_text: `${durationMins} min`,
    start_location: startLoc,
    end_location: endLoc,
    overview_polyline: encodedPolyline,
    route_segments: [{ overview_polyline: encodedPolyline, color: '#7B3FF3' }],
    steps,
    google_maps_url: '',
  };
}

export function mapTransitRouteToDirections(route: TransitRouteResponse): DirectionsResponse {
  const allPoints: Coordinate[] = [];
  const steps: DirectionsStep[] = [];
  const routeSegments = route.legs.map((leg) => ({
    overview_polyline: leg.overview_polyline,
    color: leg.type === 'transit' ? '#F4C430' : '#7B3FF3',
  }));

  route.legs.forEach((leg) => {
    const points = decodeGooglePolyline(leg.overview_polyline);
    if (points.length) {
      allPoints.push(...points);
    } else {
      allPoints.push(leg.start_location, leg.end_location);
    }

    if (leg.type === 'transit') {
      const details = leg.transit_details;
      const line = details?.line_short_name || details?.line_name || 'bus';
      const headsign = details?.headsign ? ` toward ${details.headsign}` : '';
      const stops = details?.num_stops ? `, ${details.num_stops} stops` : '';
      steps.push({
        instruction: `Take bus ${line}${headsign} from ${details?.departure_stop || 'the stop'} to ${details?.arrival_stop || 'your stop'}${stops}.`,
        distance_text: leg.distance_text,
        duration_text: leg.duration_text,
        end_location: leg.end_location,
      });
      return;
    }

    leg.steps.forEach((step) => {
      let instruction = step.instruction;
      if (step.accessibility_note) {
        instruction += `\n(${step.accessibility_note})`;
      }
      steps.push({
        ...step,
        instruction,
      });
    });
  });

  const start = route.legs[0]?.start_location ?? { lat: 0, lng: 0 };
  const end = route.legs[route.legs.length - 1]?.end_location ?? start;

  return {
    distance_text: route.total_distance_text,
    duration_text: route.total_duration_text,
    start_location: start,
    end_location: end,
    overview_polyline: encodeGooglePolyline(allPoints),
    route_segments: routeSegments,
    steps,
    google_maps_url: route.google_maps_url,
  };
}
