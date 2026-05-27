from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.models.schemas import Alert, Poi, PoiType, CommunityAlert
from src.routes.deps import get_uw_data_service
from src.services.uw_data_service import UWDataService

router = APIRouter()


@router.get("/poi", response_model=list[Poi])
def list_pois(
    type: PoiType | None = Query(default=None),
    data: UWDataService = Depends(get_uw_data_service),
) -> list[Poi]:
    pois = data.load_pois()
    if type is None:
        return pois
    return [poi for poi in pois if poi.type == type]


@router.get("/alerts", response_model=list[Alert])
def list_alerts(data: UWDataService = Depends(get_uw_data_service)) -> list[Alert]:
    return data.load_alerts()


@router.post("/alerts", response_model=Alert)
def create_or_update_alert(
    alert: Alert,
    data: UWDataService = Depends(get_uw_data_service),
) -> Alert:
    data.save_alert(alert)
    return alert


@router.get("/community-alerts", response_model=list[CommunityAlert])
def list_community_alerts(data: UWDataService = Depends(get_uw_data_service)) -> list[CommunityAlert]:
    return data.load_community_alerts()


@router.post("/community-alerts", response_model=CommunityAlert)
def create_or_update_community_alert(
    alert: CommunityAlert,
    data: UWDataService = Depends(get_uw_data_service),
) -> CommunityAlert:
    data.save_community_alert(alert)
    return alert
