import pytest

PHONE = "+2348012345678"


@pytest.mark.asyncio
async def test_full_auth_flow(client):
    # Request OTP (dev mode returns the code)
    r = await client.post("/auth/request-otp", json={"phone": PHONE})
    assert r.status_code == 200
    code = r.json()["dev_otp"]
    assert code and len(code) == 6

    # Wrong code rejected
    r = await client.post(
        "/auth/verify-otp", json={"phone": PHONE, "code": "000000"}
    )
    assert r.status_code == 400

    # Correct code mints a token and creates the user
    r = await client.post(
        "/auth/verify-otp",
        json={"phone": PHONE, "code": code, "full_name": "Ada Obi"},
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
        "/auth/verify-otp", json={"phone": PHONE, "code": code}
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_update_profile_persists_and_partial_patch_is_non_destructive(client):
    """Settings.jsx's save flow depends on this round-tripping reliably, and
    on a partial PATCH (name only) never wiping a field it didn't send."""
    r = await client.post("/auth/request-otp", json={"phone": PHONE})
    code = r.json()["dev_otp"]
    r = await client.post(
        "/auth/verify-otp", json={"phone": PHONE, "code": code, "full_name": "Ada Obi"}
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
