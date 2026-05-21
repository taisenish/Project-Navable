/**
 * Mock UW emergency alerts for Greek Row area.
 * Used in development when EXPO_PUBLIC_MOCK_ALERTS=true.
 *
 * Greek Row is along 17th–20th Ave NE, between NE 45th and NE 47th:
 *   - 17th Ave NE:  lng ≈ -122.3101   (OSM verified: NE 45th & 17th = 47.6613, -122.3101)
 *   - 18th Ave NE:  lng ≈ -122.3087   (OSM verified: Sigma Chi 4505 18th = 47.6615, -122.3087)
 *   - 19th Ave NE:  lng ≈ -122.3079
 *   - 20th Ave NE:  lng ≈ -122.3069   (OSM verified: NE 45th & 20th = 47.6613, -122.3069)
 *   - NE 45th St:   lat ≈ 47.6613
 *   - NE 46th St:   lat ≈ 47.6620
 *   - NE 47th St:   lat ≈ 47.6627
 */

import type { Alert } from '../types/api';

export const MOCK_GREEK_ROW_ALERTS: Alert[] = [
  {
    id: 'mock-alert-001',
    title: 'Gas Leak — 17th Ave NE & NE 47th St',
    description:
      'Seattle Fire Department reports a major natural gas main rupture at the intersection of 17th Ave NE and NE 47th St. Entire block evacuated. Avoid the area — hazardous fumes present. Do NOT use open flames. Roads closed in all directions.',
    severity: 'critical',
    status: 'active',
    is_resolved: false,
    location: { lat: 47.6627, lng: -122.3101 }, // 17th Ave NE & NE 47th St (north end of Greek Row)
  },
  {
    id: 'mock-alert-002',
    title: 'Active Structure Fire — Sigma Chi House',
    description:
      'Seattle Fire is responding to a 2-alarm structure fire at the Sigma Chi fraternity house on 18th Ave NE. All residents evacuated. Smoke visible several blocks away. Emergency crews blocking NE 45th St between 17th and 19th Ave NE.',
    severity: 'critical',
    status: 'active',
    is_resolved: false,
    location: { lat: 47.6615, lng: -122.3087 }, // Sigma Chi — 4505 18th Ave NE (OSM verified)
  },
  {
    id: 'mock-alert-003',
    title: 'Road Closure — NE 45th St at 19th Ave NE',
    description:
      'Water main break has caused a sinkhole closing NE 45th St between 18th and 20th Ave NE. Seattle Public Utilities crews on scene. Expect significant delays — use Campus Pkwy or Pacific Ave as alternate routes.',
    severity: 'warning',
    status: 'active',
    is_resolved: false,
    location: { lat: 47.6613, lng: -122.3079 }, // NE 45th St & 19th Ave NE
  },
  {
    id: 'mock-alert-004',
    title: 'Hazmat Spill — 20th Ave NE near NE 46th St',
    description:
      'Unknown chemical spill reported in the roadway on 20th Ave NE near NE 46th St. Hazmat team en route. Avoid contact — do not approach the area. One block perimeter established by UWPD.',
    severity: 'critical',
    status: 'investigating',
    is_resolved: false,
    location: { lat: 47.6620, lng: -122.3069 }, // 20th Ave NE & NE 46th St (OSM verified range)
  },
  {
    id: 'mock-alert-005',
    title: 'Power Outage — Greek Row Corridor',
    description:
      'Widespread power outage affecting fraternity and sorority houses along 17th–20th Ave NE between NE 45th and NE 47th Streets. Seattle City Light estimating 4-hour restoration window. Traffic signals at NE 45th & 20th Ave NE are dark.',
    severity: 'warning',
    status: 'active',
    is_resolved: false,
    location: { lat: 47.6620, lng: -122.3090 }, // Center of Greek Row corridor (18th Ave NE & NE 46th)
  },
];

