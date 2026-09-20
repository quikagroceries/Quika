import pytest

PHONE = "+2348012345678"


@pytest.mark.asyncio
async def test_full_auth_flow(client):
    # Request OTP (dev mode returns the code)
    r = await client.post("/auth/request-otp", json={"identifier": PHONE})
    assert r.status_code == 200
    code = r.json()["dev_otp"]
    assert code and len(code) == 6

    # Wrong code rejected
    r = await client.post(
        "/auth/verify-otp", json={"identifier": PHONE, "code": "000000"}
    )
    assert r.status_code == 400

    # Correct code mints a token and creates the user
    r = await client.post(
        "/auth/verify-otp",
        json={"identifier": PHONE, "code": code, "full_name": "Ada Obi"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]

    # Protected route refuses missing token
    r = await client.get("/auth/me")
    assert r.status_code == 401

    # Protected route accepts valid token
    r = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    me = r.json()
    assert me["phone"] == PHONE
    assert me["is_phone_verified"] is True
    assert me["role"] == "customer"
    assert me["basket_cap_kobo"] == 500_000

    # OTP cannot be replayed
    r = await client.post(
        "/auth/verify-otp", json={"identifier": PHONE, "code": code}
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_update_profile_persists_and_partial_patch_is_non_destructive(client):
    """Settings.jsx's save flow depends on this round-tripping reliably, and
    on a partial PATCH (name only) never wiping a field it didn't send."""
    r = await client.post("/auth/request-otp", json={"identifier": PHONE})
    code = r.json()["dev_otp"]
    r = await client.post(
        "/auth/verify-otp", json={"identifier": PHONE, "code": code, "full_name": "Ada Obi"}
    )
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.patch("/auth/me", headers=h, json={
        "full_name": "Ada Obi-Nwosu",
        "default_delivery_address": "12 Allen Avenue, Ikeja",
    })
    assert r.status_code == 200, r.text
    assert r.json()["full_name"] == "Ada Obi-Nwosu"
    assert r.json()["default_delivery_address"] == "12 Allen Avenue, Ikeja"

    # Round-trips via a fresh GET, not just the PATCH response.
    r = await client.get("/auth/me", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["full_name"] == "Ada Obi-Nwosu"
    assert r.json()["default_delivery_address"] == "12 Allen Avenue, Ikeja"

    # A name-only PATCH must not clear the address that's already set.
    r = await client.patch("/auth/me", headers=h, json={"full_name": "Ada O."})
    assert r.status_code == 200, r.text
    assert r.json()["full_name"] == "Ada O."
    assert r.json()["default_delivery_address"] == "12 Allen Avenue, Ikeja"

    r = await client.get("/auth/me", headers=h)
    assert r.json()["full_name"] == "Ada O."
    assert r.json()["default_delivery_address"] == "12 Allen Avenue, Ikeja"


@pytest.mark.asyncio
async def test_email_identifier_signs_up_and_logs_in(client):
    """Email is now a full primary ID, not just a Google-linked extra — this
    account never touches a phone number at all."""
    email = "ada@example.com"
    r = await client.post("/auth/request-otp", json={"identifier": email})
    assert r.status_code == 200
    assert r.json()["channel"] == "email"
    code = r.json()["dev_otp"]

    r = await client.post(
        "/auth/verify-otp", json={"identifier": email, "code": code, "full_name": "Ada"}
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    me = r.json()
    assert me["email"] == email
    assert me["phone"] is None
    assert me["is_email_verified"] is True
    assert me["is_phone_verified"] is False

    # Same email, second OTP round-trip logs back into the SAME account
    # rather than creating a new one.
    r = await client.post("/auth/request-otp", json={"identifier": email})
    code2 = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"identifier": email, "code": code2})
    assert r.status_code == 200
    r = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"}
    )
    assert r.json()["id"] == me["id"]


@pytest.mark.asyncio
async def test_otp_channel_selection(client):
    """A phone identifier honors the requested channel; an email identifier
    is always "email" regardless of what's asked for."""
    r = await client.post(
        "/auth/request-otp", json={"identifier": "+2348099999999", "channel": "whatsapp"}
    )
    assert r.json()["channel"] == "whatsapp"

    r = await client.post("/auth/request-otp", json={"identifier": "+2348099999998"})
    assert r.json()["channel"] == "sms"  # default when unspecified

    r = await client.post(
        "/auth/request-otp", json={"identifier": "someone@example.com", "channel": "sms"}
    )
    assert r.json()["channel"] == "email"


async def _auth_headers(client, phone=PHONE):
    r = await client.post("/auth/request-otp", json={"identifier": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"identifier": phone, "code": code})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_profile_photo_set_keep_reject_and_clear(client):
    h = await _auth_headers(client)
    url = "https://res.cloudinary.com/demo/image/upload/v1/me.jpg"

    r = await client.patch("/auth/me", headers=h, json={"avatar_url": url})
    assert r.status_code == 200 and r.json()["avatar_url"] == url

    # Editing another field must not wipe the photo.
    r = await client.patch("/auth/me", headers=h, json={"full_name": "Ada Obi"})
    assert r.json()["avatar_url"] == url

    # Only our own hosted images are accepted.
    r = await client.patch("/auth/me", headers=h, json={"avatar_url": "http://evil.example/x.png"})
    assert r.status_code == 422
    r = await client.patch("/auth/me", headers=h, json={"avatar_url": "javascript:alert(1)"})
    assert r.status_code == 422

    # An explicit null removes it.
    r = await client.patch("/auth/me", headers=h, json={"avatar_url": None})
    assert r.status_code == 200 and r.json()["avatar_url"] is None
