from __future__ import annotations

import os
import requests
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

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


@router.get("/tts")
def text_to_speech(text: str = Query(...)) -> StreamingResponse:
    api_key = os.getenv("DEEPGRAM_API_KEY") or "9bf5982d19e4669da6db15631002a0c98d1eb337"
    url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
    }
    payload = {"text": text}
    
    response = requests.post(url, headers=headers, json=payload, stream=True)
    
    def iter_audio():
        for chunk in response.iter_content(chunk_size=4096):
            yield chunk
            
    return StreamingResponse(iter_audio(), media_type="audio/mpeg")
