from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from src.api.deps import (
    get_google_auth_service,
    get_maps_service,
    get_preference_store,
    get_routing_engine,
    get_uw_data_service,
)
from src.models.schemas import (
    Alert,
    GoogleLoginResponse,
    GoogleDirectionsResponse,
    GoogleNativeLoginRequest,
    GoogleWebLoginRequest,
    PlaceSuggestion,
    UwStaticMapParams,
    ErrorResponse,
    Poi,
    PoiType,
    RouteRequest,
    RouteResponse,
    UserPreferenceRecord,
)
from src.services.auth_service import GoogleAuthService
from src.services.maps_service import MapsService
from src.services.preference_store import PreferenceStore
from src.services.routing_engine import RoutingEngine
from src.services.uw_data_service import UWDataService

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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


@router.post(
    "/auth/google/ios",
    response_model=GoogleLoginResponse,
    responses={401: {"model": ErrorResponse}},
)
def login_with_google_ios(
    payload: GoogleNativeLoginRequest,
    auth_service: GoogleAuthService = Depends(get_google_auth_service),
) -> GoogleLoginResponse:
    try:
        claims = auth_service.verify_native_id_token(payload.id_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {exc}",
        ) from exc

    user, is_new_user = auth_service.upsert_user(claims)
    return GoogleLoginResponse(user=user, is_new_user=is_new_user)


@router.post(
    "/auth/google/web",
    response_model=GoogleLoginResponse,
    responses={401: {"model": ErrorResponse}},
)
def login_with_google_web(
    payload: GoogleWebLoginRequest,
    auth_service: GoogleAuthService = Depends(get_google_auth_service),
) -> GoogleLoginResponse:
    try:
        claims = auth_service.exchange_web_code_for_claims(
            code=payload.code,
            redirect_uri=payload.redirect_uri,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google web login: {exc}",
        ) from exc

    user, is_new_user = auth_service.upsert_user(claims)
    return GoogleLoginResponse(user=user, is_new_user=is_new_user)


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


@router.get("/poi", response_model=list[Poi])
def list_pois(
    type: PoiType | None = Query(default=None),
    data: UWDataService = Depends(get_uw_data_service),
) -> list[Poi]:
    pois = data.load_pois()
    if type is None:
        return pois
    return [poi for poi in pois if poi.type == type]


@router.get("/alerts", response_model=list[Alert])
def list_alerts(data: UWDataService = Depends(get_uw_data_service)) -> list[Alert]:
    return data.load_alerts()


@router.get("/user/preferences", response_model=UserPreferenceRecord)
def get_user_preferences(
    user_id: str = Query(..., min_length=1),
    store: PreferenceStore = Depends(get_preference_store),
) -> UserPreferenceRecord:
    return UserPreferenceRecord(user_id=user_id, preferences=store.get(user_id))


@router.post("/user/preferences", response_model=UserPreferenceRecord)
def set_user_preferences(
    record: UserPreferenceRecord,
    store: PreferenceStore = Depends(get_preference_store),
) -> UserPreferenceRecord:
    saved = store.set(record.user_id, record.preferences)
    return UserPreferenceRecord(user_id=record.user_id, preferences=saved)
