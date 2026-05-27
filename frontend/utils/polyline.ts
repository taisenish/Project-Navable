import type { Coordinate } from '../types/api';

export function decodeGooglePolyline(encoded: string): Coordinate[] {
  if (!encoded) {
    return [];
  }

  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates;
}

export function encodeGooglePolyline(coordinates: Coordinate[]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const coord of coordinates) {
    const lat = Math.round(coord.lat * 1e5);
    const lng = Math.round(coord.lng * 1e5);

    const dLat = lat - prevLat;
    const dLng = lng - prevLng;

    prevLat = lat;
    prevLng = lng;

    encoded += encodeValue(dLat) + encodeValue(dLng);
  }

  return encoded;
}

function encodeValue(value: number): string {
  let val = value < 0 ? ~(value << 1) : value << 1;
  let chunks = '';
  while (val >= 0x20) {
    chunks += String.fromCharCode(((val & 0x1f) | 0x20) + 63);
    val >>= 5;
  }
  chunks += String.fromCharCode(val + 63);
  return chunks;
}

export interface DecodedSegment {
  color: string;
  coordinates: Coordinate[];
}

export function splitSegmentsAtUserLocation(
  userLoc: Coordinate,
  segments: DecodedSegment[]
): DecodedSegment[] {
  interface FlatPoint {
    coord: Coordinate;
    segmentIndex: number;
    coordIndex: number;
  }
  const flatPoints: FlatPoint[] = [];
  segments.forEach((seg, sIdx) => {
    seg.coordinates.forEach((pt, cIdx) => {
      flatPoints.push({ coord: pt, segmentIndex: sIdx, coordIndex: cIdx });
    });
  });

  if (flatPoints.length === 0) return [];

  let minDistance = Infinity;
  let bestSegIdx = 0;
  let bestCoordIdx = 0;
  let bestProj: Coordinate = flatPoints[0].coord;

  for (let i = 0; i < flatPoints.length - 1; i++) {
    const A = flatPoints[i].coord;
    const B = flatPoints[i + 1].coord;

    if (flatPoints[i].segmentIndex !== flatPoints[i + 1].segmentIndex) {
      continue;
    }

    const dx = B.lng - A.lng;
    const dy = B.lat - A.lat;

    let t = 0;
    const denominator = dx * dx + dy * dy;
    if (denominator > 1e-12) {
      t = ((userLoc.lng - A.lng) * dx + (userLoc.lat - A.lat) * dy) / denominator;
      t = Math.max(0, Math.min(1, t));
    }

    const projectedPoint = {
      lat: A.lat + t * dy,
      lng: A.lng + t * dx,
    };

    const dist = getDistanceMeters(userLoc.lat, userLoc.lng, projectedPoint.lat, projectedPoint.lng);
    if (dist < minDistance) {
      minDistance = dist;
      bestSegIdx = flatPoints[i].segmentIndex;
      bestCoordIdx = flatPoints[i].coordIndex;
      bestProj = projectedPoint;
    }
  }

  if (minDistance === Infinity) {
    return segments;
  }

  const newSegments: DecodedSegment[] = [];

  segments.forEach((seg, sIdx) => {
    if (sIdx < bestSegIdx) {
      newSegments.push({
        color: '#8E8E93',
        coordinates: seg.coordinates,
      });
    } else if (sIdx === bestSegIdx) {
      const coveredCoords = seg.coordinates.slice(0, bestCoordIdx + 1);
      coveredCoords.push(bestProj);

      const remainingCoords = [bestProj];
      if (bestCoordIdx + 1 < seg.coordinates.length) {
        remainingCoords.push(...seg.coordinates.slice(bestCoordIdx + 1));
      }

      if (coveredCoords.length > 1) {
        newSegments.push({
          color: '#8E8E93',
          coordinates: coveredCoords,
        });
      }
      if (remainingCoords.length > 1) {
        newSegments.push({
          color: seg.color,
          coordinates: remainingCoords,
        });
      }
    } else {
      newSegments.push({
        color: seg.color,
        coordinates: seg.coordinates,
      });
    }
  });

  return newSegments;
}

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

