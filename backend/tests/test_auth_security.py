"""OTP rate-limiting (request-side abuse + verify-side brute force) and the
fail-closed JWT secret check.
"""

import pytest

from app.core.config import Settings

PHONE = "+2348010000099"


@pytest.mark.asyncio
async def test_otp_request_rate_limited(client):
    from app.core.config import settings

    for _ in range(settings.otp_max_requests_per_hour):
        r = await client.post("/auth/request-otp", json={"phone": PHONE})
        assert r.status_code == 200, r.text

    # One more than the cap must be rejected.
    r = await client.post("/auth/request-otp", json={"phone": PHONE})
    assert r.status_code == 429, r.text


@pytest.mark.asyncio
async def test_otp_verify_locks_after_max_wrong_attempts(client):
    from app.core.config import settings

    r = await client.post("/auth/request-otp", json={"phone": PHONE})
    code = r.json()["dev_otp"]

    for _ in range(settings.otp_max_verify_attempts):
        r = await client.post(
            "/auth/verify-otp", json={"phone": PHONE, "code": "000000"}
        )
        assert r.status_code == 400

    # The code is now locked — even the CORRECT code must fail, forcing the
    # customer to request a fresh one.
    r = await client.post("/auth/verify-otp", json={"phone": PHONE, "code": code})
    assert r.status_code == 400, "code should be locked after too many wrong guesses"


@pytest.mark.asyncio
async def test_otp_verify_succeeds_within_attempt_budget(client):
    """Sanity check: a few wrong guesses followed by the right one still works."""
    r = await client.post("/auth/request-otp", json={"phone": "+2348010000098"})
    code = r.json()["dev_otp"]

    await client.post(
        "/auth/verify-otp", json={"phone": "+2348010000098", "code": "000000"}
    )
    r = await client.post(
        "/auth/verify-otp", json={"phone": "+2348010000098", "code": code}
    )
    assert r.status_code == 200, r.text


def test_settings_refuses_default_secret_in_production():
    with pytest.raises(RuntimeError):
        Settings(
            environment="production",
            jwt_secret="change-me-in-production",
            _env_file=None,
        )


def test_settings_allows_real_secret_in_production():
    s = Settings(
        environment="production",
        jwt_secret="a-real-randomly-generated-secret",
        _env_file=None,
    )
    assert s.jwt_secret == "a-real-randomly-generated-secret"


def test_settings_allows_default_secret_outside_production():
    s = Settings(environment="development", _env_file=None)
    assert s.jwt_secret == "change-me-in-production"
