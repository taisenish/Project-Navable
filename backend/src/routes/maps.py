from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from src.models.schemas import GoogleDirectionsResponse, PlaceSuggestion, UwStaticMapParams
from src.routes.deps import get_maps_service
from src.services.maps_service import MapsService

router = APIRouter()


@router.get("/maps/uw-static")
def get_uw_static_map(
    width: int = Query(default=600, ge=200, le=1280),
    height: int = Query(default=320, ge=200, le=1280),
    zoom: int = Query(default=15, ge=10, le=20),
    center_lat: float | None = Query(default=None),
    center_lng: float | None = Query(default=None),
    destination_lat: float | None = Query(default=None),
    destination_lng: float | None = Query(default=None),
    path_polyline: str | None = Query(default=None),
    maps_service: MapsService = Depends(get_maps_service),
) -> Response:
    try:
        params = UwStaticMapParams(
            width=width,
            height=height,
            zoom=zoom,
            center_lat=center_lat,
            center_lng=center_lng,
            destination_lat=destination_lat,
            destination_lng=destination_lng,
            path_polyline=path_polyline,
        )
        image_bytes = maps_service.get_uw_static_map(
            width=params.width,
            height=params.height,
            zoom=params.zoom,
            center_lat=params.center_lat,
            center_lng=params.center_lng,
            destination_lat=params.destination_lat,
            destination_lng=params.destination_lng,
            path_polyline=params.path_polyline,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch UW static map: {exc}",
        ) from exc

    return Response(content=image_bytes, media_type="image/png")


@router.get("/maps/place-search", response_model=list[PlaceSuggestion])
def search_places(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=8, ge=1, le=10),
    maps_service: MapsService = Depends(get_maps_service),
) -> list[PlaceSuggestion]:
    try:
        return [PlaceSuggestion.model_validate(item) for item in maps_service.search_places(q, limit=limit)]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to search places: {exc}",
        ) from exc


@router.get("/maps/directions", response_model=GoogleDirectionsResponse)
def get_directions(
    destination_lat: float = Query(...),
    destination_lng: float = Query(...),
    origin_lat: float | None = Query(default=None),
    origin_lng: float | None = Query(default=None),
    maps_service: MapsService = Depends(get_maps_service),
) -> GoogleDirectionsResponse:
    try:
        payload = maps_service.get_walking_directions(
            destination_lat=destination_lat,
            destination_lng=destination_lng,
            origin_lat=origin_lat,
            origin_lng=origin_lng,
        )
        return GoogleDirectionsResponse.model_validate(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch directions: {exc}",
        ) from exc
