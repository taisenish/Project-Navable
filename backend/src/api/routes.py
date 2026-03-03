from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.api.deps import (
    get_google_auth_service,
    get_preference_store,
    get_routing_engine,
    get_uw_data_service,
)
from src.models.schemas import (
    Alert,
    GoogleLoginRequest,
    GoogleLoginResponse,
    ErrorResponse,
    Poi,
    PoiType,
    RouteRequest,
    RouteResponse,
    UserPreferenceRecord,
)
from src.services.auth_service import GoogleAuthService
from src.services.preference_store import PreferenceStore
from src.services.routing_engine import RoutingEngine
from src.services.uw_data_service import UWDataService

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/auth/google",
    response_model=GoogleLoginResponse,
    responses={401: {"model": ErrorResponse}},
)
def login_with_google(
    payload: GoogleLoginRequest,
    auth_service: GoogleAuthService = Depends(get_google_auth_service),
) -> GoogleLoginResponse:
    try:
        claims = auth_service.verify_id_token(payload.id_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {exc}",
        ) from exc

    user = auth_service.upsert_user(claims)
    return GoogleLoginResponse(user=user)


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
