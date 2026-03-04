from src.routes.base import (
    generate_route,
    get_directions,
    get_uw_static_map,
    get_user_preferences,
    health,
    list_alerts,
    list_pois,
    login_with_google_ios,
    login_with_google_web,
    router,
    search_places,
    set_user_preferences,
)

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
