from __future__ import annotations

from io import BytesIO

import requests


class MapsService:
    UW_CENTER = (47.6553, -122.3035)

    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    def get_uw_static_map(self, width: int = 600, height: int = 320, zoom: int = 15) -> bytes:
        if not self.api_key:
            raise ValueError('GOOGLE_MAPS_API_KEY is not configured on backend.')

        lat, lng = self.UW_CENTER
        response = requests.get(
            'https://maps.googleapis.com/maps/api/staticmap',
            params={
                'center': f'{lat},{lng}',
                'zoom': str(zoom),
                'size': f'{width}x{height}',
                'scale': '2',
                'maptype': 'roadmap',
                'markers': f'color:red|label:U|{lat},{lng}',
                'key': self.api_key,
            },
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

        # Ensure payload is bytes-like image data.
        return BytesIO(data).getvalue()
