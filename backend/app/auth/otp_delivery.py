"""Actually delivering a one-time code: SMS first, WhatsApp or a voice call as
the fallback when the SMS doesn't arrive.

The standard approach for Nigerian numbers balances reliability and cost:
transactional SMS is cheap (a few naira) and reaches most people; the ones it
doesn't reach (DND lists, weak networks, delayed routes) get a second route -
a WhatsApp message or an automated voice call - offered by the UI after a
short wait (settings.otp_fallback_after_seconds). All three go through one
provider (Termii) so there's a single key and a single sender to configure.

Nothing here is called unless SMS_API_KEY is set: with no provider configured
(local dev, tests) the code is simply returned to the caller as `dev_otp`, the
behaviour the whole login flow was built and tested against.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Tests swap this for httpx.MockTransport so no real request is ever made.
_transport: httpx.AsyncBaseTransport | None = None


class OtpDeliveryError(Exception):
    """The provider refused or couldn't be reached. The caller decides what to
    tell the user (in production: try another way to receive the code)."""


def provider_configured() -> bool:
    return bool(settings.sms_api_key)


def _digits(phone: str) -> str:
    # Termii wants international format without the "+": 2348012345678.
    return "".join(ch for ch in phone if ch.isdigit())


def _message(code: str) -> str:
    minutes = settings.otp_expire_minutes
    return (
        f"Your Qyka verification code is {code}. It expires in {minutes} "
        f"minute{'s' if minutes != 1 else ''}. Never share this code with anyone."
    )


async def deliver_otp(phone: str, code: str, channel: str) -> bool:
    """Send `code` to `phone` over `channel` ("sms" | "whatsapp" | "voice").

    Returns True if a provider accepted it, False if no provider is configured
    (dev). Raises OtpDeliveryError if a configured provider failed.
    """
    if not provider_configured():
        return False

    base = settings.sms_base_url.rstrip("/")
    to = _digits(phone)

    if channel == "voice":
        # Termii's voice OTP speaks the digits aloud. Codes never start with a
        # zero (see auth.service._generate_code) so passing it as a number
        # can't drop a leading digit.
        url = f"{base}/api/sms/otp/send/voice"
        payload = {"api_key": settings.sms_api_key, "phone_number": to, "code": int(code)}
    else:
        url = f"{base}/api/sms/send"
        payload = {
            "api_key": settings.sms_api_key,
            "to": to,
            "from": settings.sms_sender_id,
            "sms": _message(code),
            "type": "plain",
            # "dnd" is the transactional route that also reaches numbers on
            # Nigeria's do-not-disturb list - the whole point of using it for
            # OTPs; "generic" silently drops those.
            "channel": "whatsapp" if channel == "whatsapp" else "dnd",
        }

    try:
        async with httpx.AsyncClient(timeout=10.0, transport=_transport) as client:
            response = await client.post(url, json=payload)
    except httpx.HTTPError as exc:
        logger.warning("OTP delivery to provider failed (%s): %s", channel, exc)
        raise OtpDeliveryError(f"could not reach the {channel} provider") from exc

    if response.status_code >= 400:
        logger.warning("OTP provider rejected %s delivery: %s %s", channel, response.status_code, response.text[:200])
        raise OtpDeliveryError(f"the {channel} provider rejected the request")
    return True
