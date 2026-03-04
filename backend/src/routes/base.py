from __future__ import annotations

from fastapi import APIRouter

from src.routes.auth import login_with_google_ios, login_with_google_web, router as auth_router
from src.routes.data import list_alerts, list_pois, router as data_router
from src.routes.health import health, router as health_router
from src.routes.maps import get_directions, get_uw_static_map, router as maps_router, search_places
from src.routes.navigation import generate_route, router as navigation_router
from src.routes.preferences import get_user_preferences, router as preferences_router, set_user_preferences

router = APIRouter()
router.include_router(health_router)
router.include_router(maps_router)
router.include_router(auth_router)
router.include_router(navigation_router)
router.include_router(data_router)
router.include_router(preferences_router)

__all__ = [
    "router",
    "health",
    "get_uw_static_map",
    "search_places",
    "get_directions",
    "login_with_google_ios",
    "login_with_google_web",
    "generate_route",
    "list_pois",
    "list_alerts",
    "get_user_preferences",
    "set_user_preferences",
]
