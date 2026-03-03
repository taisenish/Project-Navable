import type { Coordinate } from '@/types/api';

export function parseCoordinate(raw: string): Coordinate | null {
  const [latText, lngText] = raw.split(',').map((value) => value.trim());
  const lat = Number(latText);
  const lng = Number(lngText);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return { lat, lng };
}
