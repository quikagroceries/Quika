"""LiveKit call token issuance — voice/video prototype, not production-hardened.

Room name is the order id, so the customer and their assigned agent always
land in the same room. Token generation is entirely local (an HMAC-signed
JWT via LiveKit's server SDK) - no network call to LiveKit happens here; the
actual call connection happens client-side when the frontend uses this token
to join settings.livekit_url.
"""

import uuid
from datetime import timedelta

from fastapi import HTTPException, status
from livekit import api as lk_api

from app.auth.models import User
from app.core.config import settings

TOKEN_TTL = timedelta(hours=2)


def create_room_token(*, order_id: uuid.UUID, user: User) -> dict:
    if not (settings.livekit_url and settings.livekit_api_key and settings.livekit_api_secret):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "LiveKit isn't configured - set LIVEKIT_URL, LIVEKIT_API_KEY and "
            "LIVEKIT_API_SECRET.",
        )
    room = str(order_id)
    token = (
        lk_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(user.id))
        .with_name(user.phone or str(user.id))
        .with_grants(lk_api.VideoGrants(room_join=True, room=room))
        .with_ttl(TOKEN_TTL)
        .to_jwt()
    )
    return {"token": token, "url": settings.livekit_url, "room": room}
