from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from src.models.schemas import ErrorResponse, GoogleLoginResponse, GoogleNativeLoginRequest, GoogleWebLoginRequest
from src.routes.deps import get_google_auth_service
from src.services.auth_service import GoogleAuthService

router = APIRouter()


@router.post(
    "/auth/google/ios",
    response_model=GoogleLoginResponse,
    responses={401: {"model": ErrorResponse}},
)
def login_with_google_ios(
    payload: GoogleNativeLoginRequest,
    auth_service: GoogleAuthService = Depends(get_google_auth_service),
) -> GoogleLoginResponse:
    try:
        claims = auth_service.verify_native_id_token(payload.id_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {exc}",
        ) from exc

    user, is_new_user = auth_service.upsert_user(claims)
    return GoogleLoginResponse(user=user, is_new_user=is_new_user)


@router.post(
    "/auth/google/web",
    response_model=GoogleLoginResponse,
    responses={401: {"model": ErrorResponse}},
)
def login_with_google_web(
    payload: GoogleWebLoginRequest,
    auth_service: GoogleAuthService = Depends(get_google_auth_service),
) -> GoogleLoginResponse:
    try:
        claims = auth_service.exchange_web_code_for_claims(
            code=payload.code,
            redirect_uri=payload.redirect_uri,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google web login: {exc}",
        ) from exc

    user, is_new_user = auth_service.upsert_user(claims)
    return GoogleLoginResponse(user=user, is_new_user=is_new_user)
