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
