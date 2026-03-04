from __future__ import annotations

from fastapi import APIRouter, Depends

from src.models.schemas import ErrorResponse, RouteRequest, RouteResponse
from src.routes.deps import get_routing_engine
from src.services.routing_engine import RoutingEngine

router = APIRouter()


@router.post(
    "/route",
    response_model=RouteResponse,
    responses={500: {"model": ErrorResponse}},
)
def generate_route(
    payload: RouteRequest,
    engine: RoutingEngine = Depends(get_routing_engine),
) -> RouteResponse:
    return engine.build_route(payload)
