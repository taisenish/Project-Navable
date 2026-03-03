from __future__ import annotations

from sqlmodel import Field, SQLModel


class UserPreference(SQLModel, table=True):
    __tablename__ = 'user_preferences'

    user_id: str = Field(primary_key=True, index=True)
    avoid_stairs: bool = Field(default=True)
    max_slope_percent: float = Field(default=8.0)
    allowed_surfaces_csv: str = Field(default='paved,brick,mixed')
    avoid_closures: bool = Field(default=True)


class UserAccount(SQLModel, table=True):
    __tablename__ = 'user_accounts'

    user_id: str = Field(primary_key=True, index=True)
    google_sub: str = Field(index=True, unique=True)
    email: str = Field(index=True)
    full_name: str | None = None
    picture_url: str | None = None
