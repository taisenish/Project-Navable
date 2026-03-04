from __future__ import annotations

import json
from urllib import parse, request

from sqlmodel import Session, select

from src.models.db_models import UserAccount
from src.models.schemas import AuthUser


class GoogleAuthService:
    def __init__(
        self,
        session: Session,
        oauth_client_id: str | None = None,
        oauth_client_secret: str | None = None,
        oauth_ios_client_id: str | None = None,
    ) -> None:
        self.session = session
        self.oauth_client_id = oauth_client_id
        self.oauth_client_secret = oauth_client_secret
        self.oauth_ios_client_id = oauth_ios_client_id

    def _verify_id_token_with_audience(self, id_token: str, audience: str | None) -> dict[str, str]:
        from google.auth.transport.requests import Request as GoogleRequest  # type: ignore[import-not-found]
        from google.oauth2 import id_token as google_id_token  # type: ignore[import-not-found]

        claims = google_id_token.verify_oauth2_token(id_token, GoogleRequest(), audience)

        sub = claims.get('sub')
        email = claims.get('email')
        if not sub or not email:
            raise ValueError('Google token is missing required claims (sub/email).')

        return {
            'sub': str(sub),
            'email': str(email),
            'name': str(claims.get('name') or ''),
            'picture': str(claims.get('picture') or ''),
        }

    def verify_native_id_token(self, id_token: str) -> dict[str, str]:
        audiences: list[str] = []
        if self.oauth_ios_client_id:
            audiences.append(self.oauth_ios_client_id)
        if self.oauth_client_id and self.oauth_client_id not in audiences:
            audiences.append(self.oauth_client_id)

        if not audiences:
            raise ValueError('Google native login requires GOOGLE_OAUTH_IOS_CLIENT_ID or GOOGLE_OAUTH_CLIENT_ID.')

        last_error: Exception | None = None
        for audience in audiences:
            try:
                return self._verify_id_token_with_audience(id_token, audience)
            except Exception as exc:
                last_error = exc

        raise ValueError(f'Native token verification failed for configured audiences: {last_error}')

    def exchange_web_code_for_claims(self, code: str, redirect_uri: str) -> dict[str, str]:
        if not self.oauth_client_id or not self.oauth_client_secret:
            raise ValueError('Google web login requires GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.')

        form = parse.urlencode(
            {
                'code': code,
                'client_id': self.oauth_client_id,
                'client_secret': self.oauth_client_secret,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
            }
        ).encode('utf-8')

        token_request = request.Request(
            'https://oauth2.googleapis.com/token',
            data=form,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            method='POST',
        )

        try:
            with request.urlopen(token_request, timeout=10) as response:
                payload = json.loads(response.read().decode('utf-8'))
        except Exception as exc:
            raise ValueError(f'Failed to exchange authorization code: {exc}') from exc

        id_token = payload.get('id_token')
        if not id_token:
            raise ValueError('Token exchange did not return an id_token.')

        return self._verify_id_token_with_audience(str(id_token), self.oauth_client_id)

    def upsert_user(self, claims: dict[str, str]) -> tuple[AuthUser, bool]:
        google_sub = claims['sub']
        statement = select(UserAccount).where(UserAccount.google_sub == google_sub)
        user = self.session.exec(statement).first()
        is_new_user = user is None

        if user is None:
            user = UserAccount(
                user_id=google_sub,
                google_sub=google_sub,
                email=claims['email'],
                full_name=claims.get('name') or None,
                picture_url=claims.get('picture') or None,
            )
        else:
            user.email = claims['email']
            user.full_name = claims.get('name') or None
            user.picture_url = claims.get('picture') or None

        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)

        return (
            AuthUser(
                user_id=user.user_id,
                email=user.email,
                full_name=user.full_name,
                picture_url=user.picture_url,
            ),
            is_new_user,
        )
