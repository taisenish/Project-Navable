from __future__ import annotations

import logging
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from src.core.config import get_settings

logger = logging.getLogger(__name__)


def _create_engine(database_url: str):
    connect_args = {'check_same_thread': False} if database_url.startswith('sqlite') else {}
    return create_engine(database_url, connect_args=connect_args)


def _can_connect(engine) -> bool:
    try:
        with Session(engine) as session:
            session.exec(text('SELECT 1'))
        return True
    except Exception:
        return False


@lru_cache(maxsize=1)
def get_engine():
    settings = get_settings()

    if settings.database_url:
        remote_engine = _create_engine(settings.database_url)
        if _can_connect(remote_engine):
            logger.info('Connected to configured database URL.')
            return remote_engine
        logger.warning('Configured database is unavailable; switching to local SQLite fallback.')

    local_engine = _create_engine(settings.local_database_url)
    if not _can_connect(local_engine):
        raise RuntimeError('Unable to connect to local fallback database.')

    return local_engine


def init_db() -> None:
    # Import table models so metadata includes them before create_all.
    from src.models.db_models import UserAccount, UserPreference  # noqa: F401

    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session
