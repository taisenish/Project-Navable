from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes.base import router as base_router
from src.utils.config import get_settings
from src.utils.db import init_db


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(base_router, prefix=settings.api_prefix)

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    return app


app = create_app()
