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
    ) -> bytes:
        api_key = self._require_api_key()
        lat, lng = self.UW_CENTER if center_lat is None or center_lng is None else (center_lat, center_lng)

        params: dict[str, str] = {
            'center': f'{lat},{lng}',
            'zoom': str(zoom),
            'size': f'{width}x{height}',
            'scale': '2',
            'maptype': 'roadmap',
            'key': api_key,
        }
        if destination_lat is not None and destination_lng is not None:
            params['markers'] = f'color:blue|label:D|{destination_lat},{destination_lng}'

        if path_polyline:
            params['path'] = f'weight:5|color:0x7B3FF3FF|enc:{path_polyline}'

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
