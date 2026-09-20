"""Vendor transfer client — the JIT payout rail (Paystack Transfers API).

Isolated like paystack.py so the app never talks to the rail directly and it
can be swapped (Paystack -> OPay/Moniepoint) without touching order logic.

SECURITY NOTE: with Paystack OTP disabled for automation, the secret key is the
ONLY control on outbound money. The service layer enforces per-transfer and
daily caps in code (see config) as the last line of defence, because the rail
executes whatever it is asked.

Two calls: resolve/verify a recipient account, and send a transfer. Idempotency
is handled by the service layer via a unique reference + a verify-before-resend
check, so a dropped response never double-pays a vendor.
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


async def send_transfer(
    *, account_number: str, bank_code: str, amount_naira: Decimal, reference: str,
    reason: str = "Qyka vendor payment",
) -> dict:
    """Send money to a vendor account. Returns the rail's response incl. fee.

    The service layer guarantees `reference` is unique per attempt and checks
    status before any resend, so this never double-pays.

    Outside production this short-circuits instead of hitting the real rail.
    Automated tests bypass this entirely by monkeypatching this function, but
    interactive use (Swagger, the frontend) goes through the real function
    call and needs its own guard - without it, every JIT vendor payment during
    manual testing was a live call to Paystack's Transfers API, which also
    needs a recipient code (not a raw account/bank pair) to succeed for real.
    """
    if settings.environment != "production":
        return {"reference": reference, "status": "success", "fee": 0}

    payload = {
        "source": "balance",
        "amount": naira_to_kobo(amount_naira),
        "recipient_account": account_number,
        "bank_code": bank_code,
        "reference": reference,
        "reason": reason,
    }
    async with httpx.AsyncClient(base_url=settings.paystack_base_url) as client:
        resp = await client.post("/transfer", json=payload, headers=_headers())
        resp.raise_for_status()
        return resp.json()["data"]


async def verify_transfer(reference: str) -> dict:
    """Ask the rail what actually happened to a transfer, by reference.

    This is the idempotency backbone: before resending after an unknown/timed-
    out response, the service calls this. If the rail says it already succeeded,
    we record that and do NOT resend.
    """
    async with httpx.AsyncClient(base_url=settings.paystack_base_url) as client:
        resp = await client.get(f"/transfer/verify/{reference}", headers=_headers())
        resp.raise_for_status()
        return resp.json()["data"]
