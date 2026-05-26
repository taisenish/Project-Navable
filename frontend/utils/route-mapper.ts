import type { Coordinate, DirectionsResponse, DirectionsStep, RouteResponse, TransitRouteResponse } from '../types/api';
import { decodeGooglePolyline, encodeGooglePolyline } from './polyline';

function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toLowerCase();
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function computeWaitMinutes(departureTime: string): string {
  const dep = parseTimeToMinutes(departureTime);
  if (dep === null) return '';
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let diff = dep - nowMins;
  if (diff < 0) diff += 1440;
  if (diff <= 0) return '';
  if (diff < 1) return 'Arriving now';
  if (diff === 1) return '1 min wait';
  return `${diff} min wait`;
}

export function mapRouteToDirections(route: RouteResponse): DirectionsResponse {
  const distanceMiles = (route.leg.distance_meters * 0.000621371).toFixed(2);
  const durationMins = Math.round(route.leg.duration_seconds / 60);

  const startLoc = route.polyline[0] || { lat: 0, lng: 0 };
  const endLoc = route.polyline[route.polyline.length - 1] || { lat: 0, lng: 0 };

  const encodedPolyline = encodeGooglePolyline(route.polyline);

  const steps: DirectionsStep[] = route.leg.steps.map((step, idx) => {
    const stepEndLoc = step.end_location || route.polyline[idx + 1] || endLoc;

    const stepDistanceFeet = Math.round(step.distance_meters * 3.28084);

    return {
      instruction: step.instruction,
      distance_text: `${stepDistanceFeet} ft`,
      duration_text: `${Math.round(step.distance_meters / 1.4 / 60)} min`,
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
      const line = details?.line_short_name || details?.line_name || 'Bus';
      const headsign = details?.headsign ? ` toward ${details.headsign}` : '';
      const depStop = details?.departure_stop || 'the stop';
      const arrStop = details?.arrival_stop || 'your stop';
      const depTime = details?.departure_time || '';
      const arrTime = details?.arrival_time || '';
      const numStops = details?.num_stops ?? 0;
      const waitText = computeWaitMinutes(depTime);

      steps.push({
        instruction: `Board bus ${line}${headsign} at ${depStop}${depTime ? ` — arrives ${depTime}` : ''}`,
        distance_text: waitText || leg.duration_text,
        duration_text: leg.duration_text,
        end_location: leg.start_location,
      });

      if (numStops > 0) {
        steps.push({
          instruction: `${numStops} stop${numStops !== 1 ? 's' : ''} en route`,
          distance_text: '',
          duration_text: '',
          end_location: leg.end_location,
        });
      }

      steps.push({
        instruction: `Exit at ${arrStop}${arrTime ? ` — arrives ${arrTime}` : ''}`,
        distance_text: '',
        duration_text: '',
        end_location: leg.end_location,
      });
      return;
    }

    leg.steps.forEach((step) => {
      steps.push(step);
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
