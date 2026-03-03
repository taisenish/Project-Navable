from __future__ import annotations

from sqlmodel import Session

from src.models.db_models import UserPreference
from src.models.schemas import AccessibilityPreferences


class PreferenceStore:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, user_id: str) -> AccessibilityPreferences:
        row = self.session.get(UserPreference, user_id)
        if row is None:
            return AccessibilityPreferences()

        surfaces = [item for item in row.allowed_surfaces_csv.split(",") if item]
        return AccessibilityPreferences(
            avoid_stairs=row.avoid_stairs,
            max_slope_percent=row.max_slope_percent,
            allowed_surfaces=surfaces,  # type: ignore[arg-type]
            avoid_closures=row.avoid_closures,
        )

    def set(
        self,
        user_id: str,
        preferences: AccessibilityPreferences,
    ) -> AccessibilityPreferences:
        row = self.session.get(UserPreference, user_id)
        surfaces_csv = ",".join(item.value for item in preferences.allowed_surfaces)
        if row is None:
            row = UserPreference(
                user_id=user_id,
                avoid_stairs=preferences.avoid_stairs,
                max_slope_percent=preferences.max_slope_percent,
                allowed_surfaces_csv=surfaces_csv,
                avoid_closures=preferences.avoid_closures,
            )
        else:
            row.avoid_stairs = preferences.avoid_stairs
            row.max_slope_percent = preferences.max_slope_percent
            row.allowed_surfaces_csv = surfaces_csv
            row.avoid_closures = preferences.avoid_closures

        self.session.add(row)
        self.session.commit()
        return preferences
