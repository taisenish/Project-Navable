from __future__ import annotations

from functools import lru_cache

from fastapi import Depends
from sqlmodel import Session

from src.core.config import get_settings
from src.db import get_session
from src.services.auth_service import GoogleAuthService
from src.services.google_maps_service import GoogleMapsService
from src.services.maps_service import MapsService
from src.services.preference_store import PreferenceStore
from src.services.routing_engine import RoutingEngine
from src.services.uw_data_service import UWDataService


@lru_cache(maxsize=1)
def get_uw_data_service() -> UWDataService:
    return UWDataService()


@lru_cache(maxsize=1)
def get_google_maps_service() -> GoogleMapsService:
    return GoogleMapsService(api_key=get_settings().google_maps_api_key)


@lru_cache(maxsize=1)
def get_maps_service() -> MapsService:
    return MapsService(api_key=get_settings().google_maps_api_key)


def get_preference_store(session: Session = Depends(get_session)) -> PreferenceStore:
    return PreferenceStore(session)


def get_google_auth_service(session: Session = Depends(get_session)) -> GoogleAuthService:
    settings = get_settings()
    return GoogleAuthService(
        session,
        oauth_client_id=settings.google_oauth_client_id,
        oauth_client_secret=settings.google_oauth_client_secret,
        oauth_ios_client_id=settings.google_oauth_ios_client_id,
    )


@lru_cache(maxsize=1)
def get_routing_engine() -> RoutingEngine:
    return RoutingEngine(get_uw_data_service(), get_google_maps_service())
