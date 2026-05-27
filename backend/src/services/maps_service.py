from __future__ import annotations

from io import BytesIO
import re

import requests


class MapsService:
    UW_CENTER = (47.6553, -122.3035)

    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    def _require_api_key(self) -> str:
        if not self.api_key:
            raise ValueError('GOOGLE_MAPS_API_KEY is not configured on backend.')
        return self.api_key

    def get_uw_static_map(
        self,
        width: int = 600,
        height: int = 320,
        zoom: int = 15,
        center_lat: float | None = None,
        center_lng: float | None = None,
        destination_lat: float | None = None,
        destination_lng: float | None = None,
        path_polyline: str | None = None,
        path_color: str = '7B3FF3FF',
        route_segments: list[tuple[str, str]] | None = None,
    ) -> bytes:
        api_key = self._require_api_key()
        lat, lng = self.UW_CENTER if center_lat is None or center_lng is None else (center_lat, center_lng)

        params: list[tuple[str, str]] = [
            ('center', f'{lat},{lng}'),
            ('zoom', str(zoom)),
            ('size', f'{width}x{height}'),
            ('scale', '2'),
            ('maptype', 'roadmap'),
            ('key', api_key),
        ]
        if destination_lat is not None and destination_lng is not None:
            params.append(('markers', f'color:blue|label:D|{destination_lat},{destination_lng}'))

        if path_polyline:
            safe_path_color = path_color if re.fullmatch(r'[0-9A-Fa-f]{6,8}', path_color) else '7B3FF3FF'
            params.append(('path', f'weight:5|color:0x{safe_path_color}|enc:{path_polyline}'))

        for segment_polyline, segment_color in route_segments or []:
            safe_segment_color = segment_color if re.fullmatch(r'[0-9A-Fa-f]{6,8}', segment_color) else '7B3FF3FF'
            params.append(('path', f'weight:5|color:0x{safe_segment_color}|enc:{segment_polyline}'))

        response = requests.get(
            'https://maps.googleapis.com/maps/api/staticmap',
            params=params,
            timeout=15,
        )

        if response.status_code != 200:
            raise ValueError(f'Google Static Maps request failed: HTTP {response.status_code}')

        content_type = response.headers.get('Content-Type', '')
        if not content_type.startswith('image/'):
            raise ValueError('Google Static Maps returned non-image content.')

        data = response.content
        if not data:
            raise ValueError('Google Static Maps returned empty image payload.')

        return BytesIO(data).getvalue()

    def search_places(self, query: str, limit: int = 8) -> list[dict[str, object]]:
        api_key = self._require_api_key()
        if not query.strip():
            return []

        response = requests.get(
            'https://maps.googleapis.com/maps/api/place/textsearch/json',
            params={
                'query': query,
                'key': api_key,
            },
            timeout=15,
        )
        if response.status_code != 200:
            raise ValueError(f'Google Places search failed: HTTP {response.status_code}')

        payload = response.json()
        status = payload.get('status')
        if status not in {'OK', 'ZERO_RESULTS'}:
            error_message = payload.get('error_message', 'Unknown Places API error')
            raise ValueError(f'Google Places search failed ({status}): {error_message}')

        results = payload.get('results', [])
        suggestions: list[dict[str, object]] = []
        for item in results[:limit]:
            geometry = item.get('geometry', {})
            location = geometry.get('location', {})
            lat = location.get('lat')
            lng = location.get('lng')
            if not isinstance(lat, (float, int)) or not isinstance(lng, (float, int)):
                continue
            suggestions.append(
                {
                    'place_id': str(item.get('place_id', '')),
                    'name': str(item.get('name', 'Unknown location')),
                    'address': str(item.get('formatted_address', '')),
                    'hours_text': (
                        'Open now'
                        if item.get('opening_hours', {}).get('open_now') is True
                        else 'Closed now'
                        if item.get('opening_hours', {}).get('open_now') is False
                        else None
                    ),
                    'location': {'lat': float(lat), 'lng': float(lng)},
                }
            )
        return suggestions

    def get_walking_directions(
        self,
        destination_lat: float,
        destination_lng: float,
        origin_lat: float | None = None,
        origin_lng: float | None = None,
    ) -> dict[str, object]:
        api_key = self._require_api_key()
        start_lat = self.UW_CENTER[0] if origin_lat is None else origin_lat
        start_lng = self.UW_CENTER[1] if origin_lng is None else origin_lng

        response = requests.get(
            'https://maps.googleapis.com/maps/api/directions/json',
            params={
                'origin': f'{start_lat},{start_lng}',
                'destination': f'{destination_lat},{destination_lng}',
                'mode': 'walking',
                'key': api_key,
            },
            timeout=15,
        )
        if response.status_code != 200:
            raise ValueError(f'Google Directions failed: HTTP {response.status_code}')

        payload = response.json()
        status = payload.get('status')
        if status != 'OK':
            error_message = payload.get('error_message', 'Unknown Directions API error')
            raise ValueError(f'Google Directions failed ({status}): {error_message}')

        routes = payload.get('routes', [])
        if not routes:
            raise ValueError('Google Directions returned no routes.')

        route = routes[0]
        legs = route.get('legs', [])
        if not legs:
            raise ValueError('Google Directions returned no route legs.')

        leg = legs[0]
        steps = []
        for step in leg.get('steps', []):
            html_instruction = str(step.get('html_instructions', ''))
            cleaned_instruction = re.sub(r'<[^>]*>', ' ', html_instruction)
            cleaned_instruction = ' '.join(cleaned_instruction.split())
            steps.append(
                {
                    'instruction': cleaned_instruction,
                    'distance_text': str(step.get('distance', {}).get('text', '')),
                    'distance_meters': int(step.get('distance', {}).get('value', 0)),
                    'duration_text': str(step.get('duration', {}).get('text', '')),
                    'end_location': {
                        'lat': float(step.get('end_location', {}).get('lat', destination_lat)),
                        'lng': float(step.get('end_location', {}).get('lng', destination_lng)),
                    },
                }
            )

        start_location = leg.get('start_location', {})
        end_location = leg.get('end_location', {})
        overview = route.get('overview_polyline', {}).get('points', '')

        return {
            'distance_text': str(leg.get('distance', {}).get('text', '')),
            'duration_text': str(leg.get('duration', {}).get('text', '')),
            'start_location': {
                'lat': float(start_location.get('lat', start_lat)),
                'lng': float(start_location.get('lng', start_lng)),
            },
            'end_location': {
                'lat': float(end_location.get('lat', destination_lat)),
                'lng': float(end_location.get('lng', destination_lng)),
            },
            'overview_polyline': str(overview),
            'steps': steps,
            'google_maps_url': (
                'https://www.google.com/maps/dir/?api=1'
                f'&origin={start_lat},{start_lng}'
                f'&destination={destination_lat},{destination_lng}'
                '&travelmode=walking'
                '&dir_action=navigate'
            ),
        }

    def get_bicycling_directions(
        self,
        destination_lat: float,
        destination_lng: float,
        origin_lat: float | None = None,
        origin_lng: float | None = None,
    ) -> dict[str, object]:
        api_key = self._require_api_key()
        start_lat = self.UW_CENTER[0] if origin_lat is None else origin_lat
        start_lng = self.UW_CENTER[1] if origin_lng is None else origin_lng

        response = requests.get(
            'https://maps.googleapis.com/maps/api/directions/json',
            params={
                'origin': f'{start_lat},{start_lng}',
                'destination': f'{destination_lat},{destination_lng}',
                'mode': 'bicycling',
                'key': api_key,
            },
            timeout=15,
        )
        if response.status_code != 200:
            raise ValueError(f'Google Bike Directions failed: HTTP {response.status_code}')

        payload = response.json()
        status = payload.get('status')
        if status != 'OK':
            error_message = payload.get('error_message', 'Unknown Directions API error')
            raise ValueError(f'Google Bike Directions failed ({status}): {error_message}')

        routes = payload.get('routes', [])
        if not routes:
            raise ValueError('Google Bike Directions returned no routes.')

        route = routes[0]
        legs = route.get('legs', [])
        if not legs:
            raise ValueError('Google Bike Directions returned no route legs.')

        leg = legs[0]
        steps = []
        for step in leg.get('steps', []):
            html_instruction = str(step.get('html_instructions', ''))
            cleaned_instruction = re.sub(r'<[^>]*>', ' ', html_instruction)
            cleaned_instruction = ' '.join(cleaned_instruction.split())
            steps.append(
                {
                    'instruction': cleaned_instruction,
                    'distance_text': str(step.get('distance', {}).get('text', '')),
                    'distance_meters': int(step.get('distance', {}).get('value', 0)),
                    'duration_text': str(step.get('duration', {}).get('text', '')),
                    'end_location': {
                        'lat': float(step.get('end_location', {}).get('lat', destination_lat)),
                        'lng': float(step.get('end_location', {}).get('lng', destination_lng)),
                    },
                    'polyline': str(step.get('polyline', {}).get('points', '')),
                }
            )

        start_location = leg.get('start_location', {})
        end_location = leg.get('end_location', {})
        overview = route.get('overview_polyline', {}).get('points', '')

        return {
            'distance_text': str(leg.get('distance', {}).get('text', '')),
            'duration_text': str(leg.get('duration', {}).get('text', '')),
            'start_location': {
                'lat': float(start_location.get('lat', start_lat)),
                'lng': float(start_location.get('lng', start_lng)),
            },
            'end_location': {
                'lat': float(end_location.get('lat', destination_lat)),
                'lng': float(end_location.get('lng', destination_lng)),
            },
            'overview_polyline': str(overview),
            'steps': steps,
            'google_maps_url': (
                'https://www.google.com/maps/dir/?api=1'
                f'&origin={start_lat},{start_lng}'
                f'&destination={destination_lat},{destination_lng}'
                '&travelmode=bicycling'
                '&dir_action=navigate'
            ),
            'route_segments': self._build_bike_route_segments(steps),
        }

    def _build_bike_route_segments(self, steps: list[dict]) -> list[dict[str, str]]:
        segments: list[dict[str, str]] = []
        for step in steps:
            polyline = step.get('polyline', '')
            if not polyline:
                continue
            instruction = step.get('instruction', '')
            lower = instruction.lower()
            if any(kw in lower for kw in ['bike lane', 'bicycle lane', 'cycle lane', 'bike route', 'bikeway']):
                color = '#4A148C'
            elif any(kw in lower for kw in ['path', 'trail', 'bike path', 'cycle path', 'greenway', 'multi-use', 'multi use']):
                color = '#CE93D8'
            else:
                color = '#7B1FA2'
            segments.append({'overview_polyline': polyline, 'color': color})
        return segments

    def get_transit_directions(
        self,
        destination_lat: float,
        destination_lng: float,
        origin_lat: float | None = None,
        origin_lng: float | None = None,
    ) -> dict[str, object]:
        api_key = self._require_api_key()
        start_lat = self.UW_CENTER[0] if origin_lat is None else origin_lat
        start_lng = self.UW_CENTER[1] if origin_lng is None else origin_lng

        response = requests.get(
            'https://maps.googleapis.com/maps/api/directions/json',
            params={
                'origin': f'{start_lat},{start_lng}',
                'destination': f'{destination_lat},{destination_lng}',
                'mode': 'transit',
                'transit_mode': 'bus',
                'alternatives': 'true',
                'key': api_key,
            },
            timeout=15,
        )
        if response.status_code != 200:
            raise ValueError(f'Google Transit Directions failed: HTTP {response.status_code}')

        payload = response.json()
        status = payload.get('status')
        if status != 'OK':
            error_message = payload.get('error_message', 'Unknown Directions API error')
            raise ValueError(f'Google Transit Directions failed ({status}): {error_message}')

        routes = payload.get('routes', [])
        if not routes:
            raise ValueError('Google Transit Directions returned no routes.')

        def parse_route(route: dict[str, object]) -> dict[str, object] | None:
            route_legs = route.get('legs', [])
            if not route_legs:
                return None

            leg = route_legs[0]
            transit_legs = []
            for step in leg.get('steps', []):
                travel_mode = str(step.get('travel_mode', '')).lower()
                step_start = step.get('start_location', {})
                step_end = step.get('end_location', {})
                encoded_polyline = str(step.get('polyline', {}).get('points', ''))
                html_instruction = str(step.get('html_instructions', ''))
                cleaned_instruction = re.sub(r'<[^>]*>', ' ', html_instruction)
                cleaned_instruction = ' '.join(cleaned_instruction.split())

                nested_steps = []
                for substep in step.get('steps', []):
                    sub_html_instruction = str(substep.get('html_instructions', ''))
                    sub_instruction = re.sub(r'<[^>]*>', ' ', sub_html_instruction)
                    sub_instruction = ' '.join(sub_instruction.split())
                    nested_steps.append(
                        {
                            'instruction': sub_instruction,
                            'distance_text': str(substep.get('distance', {}).get('text', '')),
                            'duration_text': str(substep.get('duration', {}).get('text', '')),
                            'end_location': {
                                'lat': float(substep.get('end_location', {}).get('lat', step_end.get('lat', destination_lat))),
                                'lng': float(substep.get('end_location', {}).get('lng', step_end.get('lng', destination_lng))),
                            },
                        }
                    )

                transit_details_payload = None
                if travel_mode == 'transit':
                    transit_details = step.get('transit_details', {})
                    line = transit_details.get('line', {})
                    vehicle = line.get('vehicle', {})
                    transit_details_payload = {
                        'headsign': str(transit_details.get('headsign', '')),
                        'line_name': str(line.get('name', '')),
                        'line_short_name': str(line.get('short_name', '')),
                        'vehicle_type': str(vehicle.get('type', '')),
                        'departure_stop': str(transit_details.get('departure_stop', {}).get('name', '')),
                        'arrival_stop': str(transit_details.get('arrival_stop', {}).get('name', '')),
                        'departure_location': {
                            'lat': float(
                                transit_details.get('departure_stop', {})
                                .get('location', {})
                                .get('lat', step_start.get('lat', start_lat))
                            ),
                            'lng': float(
                                transit_details.get('departure_stop', {})
                                .get('location', {})
                                .get('lng', step_start.get('lng', start_lng))
                            ),
                        },
                        'arrival_location': {
                            'lat': float(
                                transit_details.get('arrival_stop', {})
                                .get('location', {})
                                .get('lat', step_end.get('lat', destination_lat))
                            ),
                            'lng': float(
                                transit_details.get('arrival_stop', {})
                                .get('location', {})
                                .get('lng', step_end.get('lng', destination_lng))
                            ),
                        },
                        'departure_time': str(transit_details.get('departure_time', {}).get('text', '')),
                        'arrival_time': str(transit_details.get('arrival_time', {}).get('text', '')),
                        'num_stops': int(transit_details.get('num_stops', 0)),
                    }

                transit_legs.append(
                    {
                        'type': 'transit' if travel_mode == 'transit' else 'walk',
                        'distance_text': str(step.get('distance', {}).get('text', '')),
                        'duration_text': str(step.get('duration', {}).get('text', '')),
                        'duration_seconds': int(step.get('duration', {}).get('value', 0)),
                        'start_location': {
                            'lat': float(step_start.get('lat', start_lat)),
                            'lng': float(step_start.get('lng', start_lng)),
                        },
                        'end_location': {
                            'lat': float(step_end.get('lat', destination_lat)),
                            'lng': float(step_end.get('lng', destination_lng)),
                        },
                        'overview_polyline': encoded_polyline,
                        'transit_details': transit_details_payload,
                        'steps': nested_steps
                        or [
                            {
                                'instruction': cleaned_instruction,
                                'distance_text': str(step.get('distance', {}).get('text', '')),
                                'duration_text': str(step.get('duration', {}).get('text', '')),
                                'end_location': {
                                    'lat': float(step_end.get('lat', destination_lat)),
                                    'lng': float(step_end.get('lng', destination_lng)),
                                },
                            }
                        ],
                    }
                )

            return {
                'total_distance_text': str(leg.get('distance', {}).get('text', '')),
                'total_duration_text': str(leg.get('duration', {}).get('text', '')),
                'duration_seconds': int(leg.get('duration', {}).get('value', 0)),
                'legs': transit_legs,
                'google_maps_url': (
                    'https://www.google.com/maps/dir/?api=1'
                    f'&origin={start_lat},{start_lng}'
                    f'&destination={destination_lat},{destination_lng}'
                    '&travelmode=transit'
                    '&dir_action=navigate'
                ),
            }

        parsed_routes = [parsed for route in routes[:4] if (parsed := parse_route(route))]
        if not parsed_routes:
            raise ValueError('Google Transit Directions returned no route legs.')

        primary = parsed_routes[0]
        primary['options'] = parsed_routes
        return primary

        transit_legs = []
        for step in leg.get('steps', []):
            travel_mode = str(step.get('travel_mode', '')).lower()
            step_start = step.get('start_location', {})
            step_end = step.get('end_location', {})
            encoded_polyline = str(step.get('polyline', {}).get('points', ''))
            html_instruction = str(step.get('html_instructions', ''))
            cleaned_instruction = re.sub(r'<[^>]*>', ' ', html_instruction)
            cleaned_instruction = ' '.join(cleaned_instruction.split())

            nested_steps = []
            for substep in step.get('steps', []):
                sub_html_instruction = str(substep.get('html_instructions', ''))
                sub_instruction = re.sub(r'<[^>]*>', ' ', sub_html_instruction)
                sub_instruction = ' '.join(sub_instruction.split())
                nested_steps.append(
                    {
                        'instruction': sub_instruction,
                        'distance_text': str(substep.get('distance', {}).get('text', '')),
                        'duration_text': str(substep.get('duration', {}).get('text', '')),
                        'end_location': {
                            'lat': float(substep.get('end_location', {}).get('lat', step_end.get('lat', destination_lat))),
                            'lng': float(substep.get('end_location', {}).get('lng', step_end.get('lng', destination_lng))),
                        },
                    }
                )

            transit_details_payload = None
            if travel_mode == 'transit':
                transit_details = step.get('transit_details', {})
                line = transit_details.get('line', {})
                vehicle = line.get('vehicle', {})
                transit_details_payload = {
                    'headsign': str(transit_details.get('headsign', '')),
                    'line_name': str(line.get('name', '')),
                    'line_short_name': str(line.get('short_name', '')),
                    'vehicle_type': str(vehicle.get('type', '')),
                    'departure_stop': str(transit_details.get('departure_stop', {}).get('name', '')),
                    'arrival_stop': str(transit_details.get('arrival_stop', {}).get('name', '')),
                    'departure_location': {
                        'lat': float(
                            transit_details.get('departure_stop', {})
                            .get('location', {})
                            .get('lat', step_start.get('lat', start_lat))
                        ),
                        'lng': float(
                            transit_details.get('departure_stop', {})
                            .get('location', {})
                            .get('lng', step_start.get('lng', start_lng))
                        ),
                    },
                    'arrival_location': {
                        'lat': float(
                            transit_details.get('arrival_stop', {})
                            .get('location', {})
                            .get('lat', step_end.get('lat', destination_lat))
                        ),
                        'lng': float(
                            transit_details.get('arrival_stop', {})
                            .get('location', {})
                            .get('lng', step_end.get('lng', destination_lng))
                        ),
                    },
                    'num_stops': int(transit_details.get('num_stops', 0)),
                }

            transit_legs.append(
                {
                    'type': 'transit' if travel_mode == 'transit' else 'walk',
                    'distance_text': str(step.get('distance', {}).get('text', '')),
                    'duration_text': str(step.get('duration', {}).get('text', '')),
                    'duration_seconds': int(step.get('duration', {}).get('value', 0)),
                    'start_location': {
                        'lat': float(step_start.get('lat', start_lat)),
                        'lng': float(step_start.get('lng', start_lng)),
                    },
                    'end_location': {
                        'lat': float(step_end.get('lat', destination_lat)),
                        'lng': float(step_end.get('lng', destination_lng)),
                    },
                    'overview_polyline': encoded_polyline,
                    'transit_details': transit_details_payload,
                    'steps': nested_steps
                    or [
                        {
                            'instruction': cleaned_instruction,
                            'distance_text': str(step.get('distance', {}).get('text', '')),
                            'duration_text': str(step.get('duration', {}).get('text', '')),
                            'end_location': {
                                'lat': float(step_end.get('lat', destination_lat)),
                                'lng': float(step_end.get('lng', destination_lng)),
                            },
                        }
                    ],
                }
            )

        return {
            'total_distance_text': str(leg.get('distance', {}).get('text', '')),
            'total_duration_text': str(leg.get('duration', {}).get('text', '')),
            'legs': transit_legs,
            'google_maps_url': (
                'https://www.google.com/maps/dir/?api=1'
                f'&origin={start_lat},{start_lng}'
                f'&destination={destination_lat},{destination_lng}'
                '&travelmode=transit'
                '&dir_action=navigate'
            ),
        }
