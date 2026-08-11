"""Dev-only helpers. Disabled entirely when environment == 'production'.

The seed endpoint solves the testing hassle: one call returns ready-to-use
admin, agent, and customer tokens (verified, roles set, an agent record and a
market created) so you don't have to walk the OTP flow three times to test a
single order.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth.models import User
from app.core.config import settings
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.enums import LedgerDirection, UserRole, UserStatus
from app.core.phone import normalize_phone
from app.core.security import create_access_token
from app.float import service as float_service
from app.jit.models import Seller
from app.markets.models import Agent, Market

router = APIRouter()


def _guard() -> None:
    if settings.environment == "production":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


async def _make_user(db, phone, role) -> User:
    phone = normalize_phone(phone)
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            phone=phone, role=role, status=UserStatus.ACTIVE,
            is_phone_verified=True, basket_cap_kobo=settings.default_basket_cap_kobo,
        )
        db.add(user)
        await db.flush()
    else:
        user.role = role
    return user


# Directory markets aligned with frontend marketing slugs / names
SEED_MARKETS = [
    {
        "name": "Balogun Market",
        "city": "Lagos Island",
        "state": "Lagos",
        "latitude": 6.4550,
        "longitude": 3.3841,
        "is_active": True,
        "venue_type": "local_market",
    },
    {
        "name": "Mile 12 Market",
        "city": "Ketu",
        "state": "Lagos",
        "latitude": 6.6093,
        "longitude": 3.3935,
        "is_active": True,
        "venue_type": "local_market",
    },
    {
        "name": "Bodija Market",
        "city": "Ibadan",
        "state": "Oyo",
        "latitude": 7.4356,
        "longitude": 3.9147,
        "is_active": True,
        "venue_type": "local_market",
    },
    {
        "name": "Wuse Market",
        "city": "Abuja",
        "state": "FCT",
        "latitude": 9.0645,
        "longitude": 7.4833,
        "is_active": True,
        "venue_type": "local_market",
    },
    {
        "name": "Shoprite Ikeja City Mall",
        "city": "Ikeja",
        "state": "Lagos",
        "latitude": 6.6194,
        "longitude": 3.3571,
        "is_active": True,
        "venue_type": "supermarket",
    },
    {
        "name": "Spar Lekki",
        "city": "Lekki",
        "state": "Lagos",
        "latitude": 6.4474,
        "longitude": 3.4723,
        "is_active": True,
        "venue_type": "supermarket",
    },
]

# Stalls per market — customer browse; agent still bargains live prices
SEED_VENDORS: dict[str, list[dict]] = {
    "Balogun Market": [
        {"name": "Mama Chidinma", "stall_description": "Fresh peppers, tomatoes & onions"},
        {"name": "Alhaja Provisions", "stall_description": "Rice, beans, oil & pantry staples"},
        {"name": "Baba Fish Corner", "stall_description": "Fresh & smoked fish"},
        {"name": "Iya Ibeji Spices", "stall_description": "Ground peppers, seasoning & herbs"},
        {"name": "Green Basket Produce", "stall_description": "Leafy greens, ugwu & scent leaf"},
        {"name": "Okada Protein Hub", "stall_description": "Chicken, turkey & goat"},
    ],
    "Mile 12 Market": [
        {"name": "Wholesale Peppers", "stall_description": "Bulk peppers & tomatoes"},
        {"name": "Tomato King", "stall_description": "Fresh tomatoes by the basket"},
        {"name": "Onion Row 4", "stall_description": "Red & white onions"},
        {"name": "Leafy Greens Co-op", "stall_description": "Ugwu, spinach & scent leaf"},
        {"name": "Yam & Cassava Yard", "stall_description": "Tubers and flour"},
    ],
    "Bodija Market": [
        {"name": "Iya Risi Grains", "stall_description": "Rice, beans & garri"},
        {"name": "Fresh Catch Bodija", "stall_description": "River fish & stockfish"},
        {"name": "Pepper Mama", "stall_description": "Atarodo, tatase & shombo"},
        {"name": "Palm Oil Shed", "stall_description": "Red oil & groundnut oil"},
        {"name": "Family Provisions", "stall_description": "Everyday kitchen staples"},
    ],
    "Wuse Market": [
        {"name": "Capital Greens", "stall_description": "Produce & salad mixes"},
        {"name": "Suya Protein Spot", "stall_description": "Beef, chicken & spices"},
        {"name": "Pantry Hub Wuse", "stall_description": "Imported & local groceries"},
        {"name": "Fruit Lane", "stall_description": "Seasonal fruits"},
        {"name": "Spice & Seasoning", "stall_description": "Seasoning cubes & dry pepper"},
    ],
}


async def _upsert_vendors(db: AsyncSession, market: Market) -> list[dict]:
    specs = SEED_VENDORS.get(market.name, [])
    out = []
    for spec in specs:
        result = await db.execute(
            select(Seller).where(
                Seller.market_id == market.id,
                Seller.name == spec["name"],
            )
        )
        seller = result.scalar_one_or_none()
        if seller is None:
            seller = Seller(
                market_id=market.id,
                name=spec["name"],
                stall_description=spec.get("stall_description"),
            )
            db.add(seller)
            await db.flush()
        else:
            seller.stall_description = spec.get("stall_description")
        out.append({"id": str(seller.id), "name": seller.name})
    return out


@router.post("/seed")
async def seed(db: AsyncSession = Depends(get_db)):
    """Create admin + agent + customer + markets, seed float, return tokens."""
    _guard()
    admin = await _make_user(db, "+2340000000001", UserRole.ADMIN)
    agent_user = await _make_user(db, "+2340000000002", UserRole.AGENT)
    customer = await _make_user(db, "+2340000000003", UserRole.CUSTOMER)

    markets_out = []
    vendors_out: dict[str, list] = {}
    primary = None
    for spec in SEED_MARKETS:
        result = await db.execute(select(Market).where(Market.name == spec["name"]))
        market = result.scalar_one_or_none()
        if market is None:
            market = Market(**spec)
            db.add(market)
            await db.flush()
        else:
            market.city = spec["city"]
            market.state = spec["state"]
            market.latitude = spec["latitude"]
            market.longitude = spec["longitude"]
            market.is_active = spec["is_active"]
            market.venue_type = spec.get("venue_type", "local_market")
        vendors_out[market.name] = await _upsert_vendors(db, market)
        markets_out.append({"id": str(market.id), "name": market.name})
        if primary is None:
            primary = market

    assert primary is not None

    # an agent record tied to the agent user + primary market
    result = await db.execute(select(Agent).where(Agent.user_id == agent_user.id))
    agent = result.scalar_one_or_none()
    if agent is None:
        agent = Agent(
            user_id=agent_user.id, assigned_market_id=primary.id, is_available=True
        )
        db.add(agent)
        await db.flush()
    else:
        agent.assigned_market_id = primary.id

    # seed the float pool on primary if empty
    balance = await float_service.get_pool_balance(db, primary.id)
    if balance == 0:
        await float_service.record_movement(
            db, direction=LedgerDirection.CREDIT,
            amount=__import__("decimal").Decimal("500000.00"),
            market_id=primary.id, note="Dev seed float",
        )
    await db.flush()

    return {
        "admin_token": create_access_token(admin.id, admin.role),
        "agent_token": create_access_token(agent_user.id, agent_user.role),
        "customer_token": create_access_token(customer.id, customer.role),
        "market_id": str(primary.id),
        "markets": markets_out,
        "vendors": vendors_out,
        "agent_user_id": str(agent_user.id),
        "note": "Paste a token into Swagger's Authorize as: Bearer <token>",
    }


@router.post("/seed-markets")
async def seed_markets(db: AsyncSession = Depends(get_db)):
    """Upsert the marketing directory markets + stall vendors."""
    _guard()
    out = []
    for spec in SEED_MARKETS:
        result = await db.execute(select(Market).where(Market.name == spec["name"]))
        market = result.scalar_one_or_none()
        if market is None:
            market = Market(**spec)
            db.add(market)
            await db.flush()
        else:
            market.city = spec["city"]
            market.state = spec["state"]
            market.latitude = spec["latitude"]
            market.longitude = spec["longitude"]
            market.is_active = spec["is_active"]
            market.venue_type = spec.get("venue_type", "local_market")
        vendors = await _upsert_vendors(db, market)
        out.append({
            "id": str(market.id),
            "name": market.name,
            "city": market.city,
            "vendors": vendors,
        })
    await db.flush()
    return {"markets": out, "count": len(out)}

