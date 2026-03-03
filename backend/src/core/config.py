from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "NavAble API"
    app_version: str = "0.1.0"
    app_env: str = os.getenv("APP_ENV", "development")
    api_prefix: str = "/api/v1"
    google_maps_api_key: str | None = os.getenv("GOOGLE_MAPS_API_KEY")
    google_oauth_client_id: str | None = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    database_url: str | None = os.getenv("DATABASE_URL")
    local_database_url: str = os.getenv("LOCAL_DATABASE_URL", "sqlite:///./navable.db")


def get_settings() -> Settings:
    return Settings()
