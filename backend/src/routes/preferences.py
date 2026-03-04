from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.models.schemas import UserPreferenceRecord
from src.routes.deps import get_preference_store
from src.services.preference_store import PreferenceStore

router = APIRouter()


@router.get("/user/preferences", response_model=UserPreferenceRecord)
def get_user_preferences(
    user_id: str = Query(..., min_length=1),
    store: PreferenceStore = Depends(get_preference_store),
) -> UserPreferenceRecord:
    return UserPreferenceRecord(user_id=user_id, preferences=store.get(user_id))


@router.post("/user/preferences", response_model=UserPreferenceRecord)
def set_user_preferences(
    record: UserPreferenceRecord,
    store: PreferenceStore = Depends(get_preference_store),
) -> UserPreferenceRecord:
    saved = store.set(record.user_id, record.preferences)
    return UserPreferenceRecord(user_id=record.user_id, preferences=saved)
