from __future__ import annotations

import logging
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

from src.utils.config import get_settings

logger = logging.getLogger(__name__)


def _create_engine(database_url: str):
    if database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    elif "postgresql" in database_url:
        # Enforce modern psycopg (v3) dialect, automatically upgrading psycopg2
        if "postgresql+psycopg2://" in database_url:
            database_url = database_url.replace("postgresql+psycopg2://", "postgresql+psycopg://")
        elif not database_url.startswith("postgresql+"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg://")
        
        # Enforce sslmode=require for Azure PostgreSQL connections
        if "sslmode=" not in database_url:
            separator = "&" if "?" in database_url else "?"
            database_url = f"{database_url}{separator}sslmode=require"
            
        connect_args = {}
    else:
        connect_args = {}
    return create_engine(database_url, connect_args=connect_args)


def _can_connect(engine) -> bool:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.exception("Database connection verification failed: %s", exc)
        return False


@lru_cache(maxsize=1)
def get_engine():
    settings = get_settings()

    if settings.database_url:
        remote_engine = _create_engine(settings.database_url)
        if _can_connect(remote_engine):
            logger.info("Connected to configured database URL.")
            return remote_engine
        logger.warning("Configured database is unavailable; switching to local SQLite fallback.")

    local_engine = _create_engine(settings.local_database_url)
    if not _can_connect(local_engine):
        raise RuntimeError("Unable to connect to local fallback database.")

    return local_engine


def init_db() -> None:
    from src.models.db_models import UserAccount, UserPreference  # noqa: F401

    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session
