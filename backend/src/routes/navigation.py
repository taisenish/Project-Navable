from __future__ import annotations

import os
import re
import requests
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from src.models.schemas import Coordinate, ErrorResponse, RouteRequest, RouteResponse, TransitRouteResponse
from src.routes.deps import get_maps_service, get_routing_engine
from src.services.maps_service import MapsService
from src.services.routing_engine import RoutingEngine

router = APIRouter()


ABBREVIATIONS = {
    r"\bNE\b": "North East",
    r"\bNW\b": "North West",
    r"\bSE\b": "South East",
    r"\bSW\b": "South West",
    r"\bN\b": "North",
    r"\bS\b": "South",
    r"\bE\b": "East",
    r"\bW\b": "West",
    r"\bAve\b": "Avenue",
    r"\bSt\b": "Street",
    r"\bRd\b": "Road",
    r"\bDr\b": "Drive",
    r"\bBlvd\b": "Boulevard",
    r"\bPl\b": "Place",
    r"\bCt\b": "Court",
    r"\bPkwy\b": "Parkway",
    r"\bHwy\b": "Highway",
    r"\bLn\b": "Lane",
    r"\bExpy\b": "Expressway",
    r"\bFwy\b": "Freeway",
    r"\bft\b": "feet",
    r"\bm\b": "meters",
}


def expand_abbreviations(text: str) -> str:
    """Expand navigation abbreviations for text-to-speech engine."""
    expanded = text
    for pattern, replacement in ABBREVIATIONS.items():
        expanded = re.sub(pattern, replacement, expanded, flags=re.IGNORECASE)
    return expanded


@router.post(
    "/route",
    response_model=RouteResponse,
    responses={500: {"model": ErrorResponse}},
)
def generate_route(
    payload: RouteRequest,
    engine: RoutingEngine = Depends(get_routing_engine),
) -> RouteResponse:
    return engine.build_route(payload)


def _encode_polyline(points: list[Coordinate]) -> str:
    encoded = ""
    prev_lat = 0
    prev_lng = 0

    for point in points:
        lat = round(point.lat * 100000)
        lng = round(point.lng * 100000)
        encoded += _encode_polyline_value(lat - prev_lat)
        encoded += _encode_polyline_value(lng - prev_lng)
        prev_lat = lat
        prev_lng = lng

    return encoded


def _encode_polyline_value(value: int) -> str:
    shifted = ~(value << 1) if value < 0 else value << 1
    chunk = ""
    while shifted >= 0x20:
        chunk += chr(((shifted & 0x1F) | 0x20) + 63)
        shifted >>= 5
    chunk += chr(shifted + 63)
    return chunk


@router.get("/route/transit", response_model=TransitRouteResponse)
def generate_transit_route(
    destination_lat: float = Query(...),
    destination_lng: float = Query(...),
    origin_lat: float | None = Query(default=None),
    origin_lng: float | None = Query(default=None),
    engine: RoutingEngine = Depends(get_routing_engine),
    maps_service: MapsService = Depends(get_maps_service),
) -> TransitRouteResponse:
    transit_payload = maps_service.get_transit_directions(
        destination_lat=destination_lat,
        destination_lng=destination_lng,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
    )

    def build_accessible_option(option_payload: dict[str, object]) -> dict[str, object]:
        next_legs = []
        total_duration_seconds = 0
        for leg in option_payload["legs"]:
            if leg["type"] != "walk":
                total_duration_seconds += int(leg["duration_seconds"])
                next_legs.append(leg)
                continue

            accessible_route = engine.build_route(
                RouteRequest(
                    origin=Coordinate.model_validate(leg["start_location"]),
                    destination=Coordinate.model_validate(leg["end_location"]),
                )
            )

            total_duration_seconds += accessible_route.leg.duration_seconds
            next_legs.append(
                {
                    "type": "walk",
                    "distance_text": f"{round(accessible_route.leg.distance_meters * 0.000621371, 2)} mi",
                    "duration_text": f"{round(accessible_route.leg.duration_seconds / 60)} min",
                    "duration_seconds": accessible_route.leg.duration_seconds,
                    "start_location": accessible_route.polyline[0],
                    "end_location": accessible_route.polyline[-1],
                    "overview_polyline": _encode_polyline(accessible_route.polyline),
                    "transit_details": None,
                    "steps": [
                        {
                            "instruction": step.instruction,
                            "distance_text": f"{round(step.distance_meters * 3.28084)} ft",
                            "duration_text": f"{round(step.distance_meters / 1.4 / 60)} min",
                            "end_location": step.end_location or accessible_route.polyline[-1],
                            "accessibility_note": step.accessibility_note,
                        }
                        for step in accessible_route.leg.steps
                    ],
                }
            )

        total_minutes = max(1, round(total_duration_seconds / 60))
        return {
            "total_distance_text": option_payload["total_distance_text"],
            "total_duration_text": f"{total_minutes} min",
            "duration_seconds": total_duration_seconds,
            "legs": next_legs,
            "google_maps_url": option_payload["google_maps_url"],
        }

    option_payloads = transit_payload.get("options") or [transit_payload]
    options = [build_accessible_option(option) for option in option_payloads]
    primary = {**options[0], "options": options}
    return TransitRouteResponse.model_validate(primary)


@router.get("/tts")
def text_to_speech(text: str = Query(...)) -> StreamingResponse:
    api_key = os.getenv("DEEPGRAM_API_KEY") or "9bf5982d19e4669da6db15631002a0c98d1eb337"
    url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
    }
    
    expanded_text = expand_abbreviations(text)
    payload = {"text": expanded_text}
    
    response = requests.post(url, headers=headers, json=payload, stream=True)
    
    def iter_audio():
        for chunk in response.iter_content(chunk_size=4096):
            yield chunk
            
    return StreamingResponse(iter_audio(), media_type="audio/mpeg")
