from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.models.schemas import Alert, Poi, PoiType
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
