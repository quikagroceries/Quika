"""Thin Paystack HTTP client.

Isolated so the rest of the app never talks to Paystack directly and so it can
be swapped/mocked in tests. Only the two calls Week 3 needs are here:
initialize a transaction and verify one. Amounts are sent in KOBO (Paystack's
smallest unit) — naira * 100.
"""

from decimal import Decimal

import httpx

from app.core.config import settings


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }


def naira_to_kobo(amount: Decimal) -> int:
    return int((amount * 100).to_integral_value())


async def initialize_transaction(
    *, email: str, amount_naira: Decimal, reference: str, callback_url: str | None = None,
) -> dict:
    """Create a Paystack transaction; returns authorization_url + reference.

    Without callback_url, Paystack falls back to whatever's configured in the
    dashboard (or nothing) - the browser may not land back on the app at all
    after payment. Callers should pass the frontend's actual origin.
    """
    payload = {
        "email": email,
        "amount": naira_to_kobo(amount_naira),
        "reference": reference,
    }
    if callback_url:
        payload["callback_url"] = callback_url
    async with httpx.AsyncClient(base_url=settings.paystack_base_url) as client:
        resp = await client.post(
            "/transaction/initialize", json=payload, headers=_headers()
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def verify_transaction(reference: str) -> dict:
    """Server-side confirmation of a transaction's true status."""
    async with httpx.AsyncClient(base_url=settings.paystack_base_url) as client:
        resp = await client.get(
            f"/transaction/verify/{reference}", headers=_headers()
        )
        resp.raise_for_status()
        return resp.json()["data"]
