"""
SQLAlchemy engine / session configuration.

DATABASE_URL always comes from environment configuration (see core.config).
When TESTING=true, an in-memory/SQLite database is used instead so the test
suite does not require a running PostgreSQL instance.
"""
from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _build_engine():
    if settings.TESTING:
        # File-based sqlite so multiple connections in the same test run
        # see the same data (in-memory sqlite is per-connection).
        return create_engine(
            "sqlite:///./test_secure_dms.db",
            connect_args={"check_same_thread": False},
        )
    if settings.DATABASE_URL.startswith("sqlite"):
        return create_engine(
            settings.DATABASE_URL, connect_args={"check_same_thread": False}
        )
    return create_engine(settings.DATABASE_URL, pool_pre_ping=True)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables. Used for local/dev bootstrap and tests.

    In production, prefer Alembic migrations (`alembic upgrade head`).
    """
    from app import models  # noqa: F401  (ensure models are registered)

    Base.metadata.create_all(bind=engine)
