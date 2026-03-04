from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        os.environ[key] = value.strip()


_load_env_file()


@dataclass(frozen=True)
class Settings:
    app_name: str = "NavAble API"
    app_version: str = "0.1.0"
    app_env: str = os.getenv("APP_ENV", "development")
    api_prefix: str = "/api/v1"
    google_maps_api_key: str | None = os.getenv("GOOGLE_MAPS_API_KEY")
    google_oauth_client_id: str | None = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    google_oauth_client_secret: str | None = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    google_oauth_ios_client_id: str | None = os.getenv("GOOGLE_OAUTH_IOS_CLIENT_ID")
    database_url: str | None = os.getenv("DATABASE_URL")
    local_database_url: str = os.getenv("LOCAL_DATABASE_URL", "sqlite:///./navable.db")


def get_settings() -> Settings:
    return Settings()
