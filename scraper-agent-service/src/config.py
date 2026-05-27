from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str = "mock-key-for-now"
    openai_general_model: str = "gpt-5.2"
    poll_interval_seconds: int = 300
    port: int = 8005
    log_level: str = "info"
    backend_poi_path: str = "../backend/src/data/uw_pois.json"
    state_file_path: str = "data/state.json"
    mode: str = "prod"
    backend_url: str = "http://127.0.0.1:8000/api/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
