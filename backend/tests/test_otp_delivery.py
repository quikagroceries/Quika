"""OTP delivery: SMS first, WhatsApp / voice as the fallback, and the guards
that stop the fallback from becoming an SMS-bomb."""

import json

import httpx
import pytest

from app.auth import otp_delivery
from app.core.config import settings

PHONE = "+2348011112222"


@pytest.fixture
def provider(monkeypatch):
    """A configured provider whose HTTP calls are captured, never sent."""
    calls: list[tuple[str, dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((str(request.url), json.loads(request.content)))
        return httpx.Response(200, json={"code": "ok"})

    monkeypatch.setattr(settings, "sms_api_key", "test-key")
    monkeypatch.setattr(otp_delivery, "_transport", httpx.MockTransport(handler))
    return calls


@pytest.mark.asyncio
async def test_sms_goes_out_on_the_transactional_dnd_route(client, provider):
    r = await client.post("/auth/request-otp", json={"identifier": PHONE, "channel": "sms"})
    assert r.status_code == 200
    (url, body), = provider
    assert url.endswith("/api/sms/send")
    assert body["channel"] == "dnd"            # reaches do-not-disturb numbers
    assert body["to"] == "2348011112222"       # international, no "+"
    assert r.json()["dev_otp"] in body["sms"]  # the message carries the code


@pytest.mark.asyncio
async def test_whatsapp_and_voice_are_the_fallback_routes(client, provider):
    r = await client.post("/auth/request-otp", json={"identifier": PHONE, "channel": "whatsapp"})
    assert r.json()["channel"] == "whatsapp"
    assert provider[-1][1]["channel"] == "whatsapp"

    r = await client.post("/auth/request-otp", json={"identifier": PHONE, "channel": "voice"})
    body = r.json()
    assert body["channel"] == "voice"
    url, sent = provider[-1]
    assert url.endswith("/api/sms/otp/send/voice")
    # A number, so a leading zero could never be dropped - codes never start with 0.
    assert sent["code"] == int(body["dev_otp"])


@pytest.mark.asyncio
async def test_response_tells_the_ui_when_and_how_to_offer_fallbacks(client):
    r = await client.post("/auth/request-otp", json={"identifier": PHONE})
    body = r.json()
    assert body["fallback_after_seconds"] == settings.otp_fallback_after_seconds
    assert set(body["fallback_channels"]) == {"sms", "whatsapp", "voice"}

    # An email identifier only ever goes by email - there's no fallback route.
    r = await client.post("/auth/request-otp", json={"identifier": "ada@example.com", "channel": "voice"})
    assert r.json()["channel"] == "email" and r.json()["fallback_channels"] == []


@pytest.mark.asyncio
async def test_no_provider_configured_means_nothing_is_sent(client, monkeypatch):
    called = []
    monkeypatch.setattr(otp_delivery, "_transport", httpx.MockTransport(lambda r: called.append(r) or httpx.Response(200)))
    r = await client.post("/auth/request-otp", json={"identifier": PHONE})
    assert r.status_code == 200 and r.json()["dev_otp"] and called == []


@pytest.mark.asyncio
async def test_codes_never_start_with_zero(client):
    from app.auth.service import _generate_code

    assert all(_generate_code()[0] != "0" and len(_generate_code()) == 6 for _ in range(500))


@pytest.mark.asyncio
async def test_resend_cooldown_blocks_a_second_code_too_soon(client, monkeypatch):
    monkeypatch.setattr(settings, "otp_resend_cooldown_seconds", 30)
    assert (await client.post("/auth/request-otp", json={"identifier": PHONE})).status_code == 200
    r = await client.post("/auth/request-otp", json={"identifier": PHONE, "channel": "whatsapp"})
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) > 0
    # A different number isn't affected.
    assert (await client.post("/auth/request-otp", json={"identifier": "+2348033334444"})).status_code == 200


@pytest.mark.asyncio
async def test_provider_failure_in_production_says_try_another_way_and_leaves_no_code(client, monkeypatch, db_session_factory):
    from sqlalchemy import select

    from app.auth.models import OtpCode

    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "sms_api_key", "test-key")
    monkeypatch.setattr(otp_delivery, "_transport", httpx.MockTransport(lambda r: httpx.Response(500, text="boom")))

    r = await client.post("/auth/request-otp", json={"identifier": PHONE})
    assert r.status_code == 502
    assert "another way" in r.json()["detail"]
    async with db_session_factory() as s:
        assert (await s.execute(select(OtpCode).where(OtpCode.identifier == PHONE))).first() is None


@pytest.mark.asyncio
async def test_provider_failure_in_dev_still_lets_you_log_in(client, monkeypatch):
    monkeypatch.setattr(settings, "sms_api_key", "test-key")
    monkeypatch.setattr(otp_delivery, "_transport", httpx.MockTransport(lambda r: httpx.Response(500)))
    r = await client.post("/auth/request-otp", json={"identifier": PHONE})
    assert r.status_code == 200 and r.json()["dev_otp"]


@pytest.fixture
def email_provider(monkeypatch):
    """A configured Resend whose HTTP calls are captured, never sent."""
    calls: list[tuple[str, dict, dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((str(request.url), json.loads(request.content), dict(request.headers)))
        return httpx.Response(200, json={"id": "email_1"})

    monkeypatch.setattr(settings, "email_api_key", "re_test_key")
    monkeypatch.setattr(otp_delivery, "_transport", httpx.MockTransport(handler))
    return calls


@pytest.mark.asyncio
async def test_email_code_is_sent_through_resend(client, email_provider):
    r = await client.post("/auth/request-otp", json={"identifier": "Ada@Example.com"})
    assert r.status_code == 200 and r.json()["channel"] == "email"
    (url, body, headers), = email_provider
    assert url == "https://api.resend.com/emails"
    assert headers["authorization"] == "Bearer re_test_key"
    assert body["to"] == ["ada@example.com"]
    assert body["from"] == settings.email_from
    code = r.json()["dev_otp"]
    assert code in body["subject"] and code in body["text"] and code in body["html"]


@pytest.mark.asyncio
async def test_email_with_no_key_sends_nothing(client, monkeypatch):
    called = []
    monkeypatch.setattr(otp_delivery, "_transport", httpx.MockTransport(lambda r: called.append(r) or httpx.Response(200)))
    r = await client.post("/auth/request-otp", json={"identifier": "ada@example.com"})
    assert r.status_code == 200 and r.json()["dev_otp"] and called == []


@pytest.mark.asyncio
async def test_email_failure_in_production_is_a_502_and_leaves_no_code(client, monkeypatch):
    monkeypatch.setattr(settings, "email_api_key", "re_test_key")
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(otp_delivery, "_transport", httpx.MockTransport(lambda r: httpx.Response(403, json={"message": "domain not verified"})))
    r = await client.post("/auth/request-otp", json={"identifier": "ada@example.com"})
    assert r.status_code == 502
    assert "email" in r.json()["detail"].lower()
