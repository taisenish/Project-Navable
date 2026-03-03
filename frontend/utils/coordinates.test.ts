import { parseCoordinate } from '@/utils/coordinates';

describe('parseCoordinate', () => {
  it('parses a valid coordinate pair', () => {
    expect(parseCoordinate('47.6517,-122.3082')).toEqual({ lat: 47.6517, lng: -122.3082 });
  });

  it('returns null for invalid input', () => {
    expect(parseCoordinate('invalid')).toBeNull();
  });
});
