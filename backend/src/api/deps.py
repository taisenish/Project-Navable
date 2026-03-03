from __future__ import annotations

from functools import lru_cache

from fastapi import Depends
from sqlmodel import Session

from src.core.config import get_settings
from src.db import get_session
from src.services.auth_service import GoogleAuthService
from src.services.google_maps_service import GoogleMapsService
from src.services.preference_store import PreferenceStore
from src.services.routing_engine import RoutingEngine
from src.services.uw_data_service import UWDataService


@lru_cache(maxsize=1)
def get_uw_data_service() -> UWDataService:
    return UWDataService()


@lru_cache(maxsize=1)
def get_google_maps_service() -> GoogleMapsService:
    return GoogleMapsService(api_key=get_settings().google_maps_api_key)


def get_preference_store(session: Session = Depends(get_session)) -> PreferenceStore:
    return PreferenceStore(session)


def get_google_auth_service(session: Session = Depends(get_session)) -> GoogleAuthService:
    return GoogleAuthService(session, oauth_client_id=get_settings().google_oauth_client_id)


@lru_cache(maxsize=1)
def get_routing_engine() -> RoutingEngine:
    return RoutingEngine(get_uw_data_service(), get_google_maps_service())
