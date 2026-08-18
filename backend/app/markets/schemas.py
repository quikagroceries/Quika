import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import VenueType


class CreateMarketIn(BaseModel):
    name: str = Field(..., examples=["Mile 12 Market"])
    city: str = Field(..., examples=["Lagos"])
    state: str = Field(..., examples=["Lagos"])
    venue_type: VenueType = VenueType.LOCAL_MARKET
    latitude: float | None = None
    longitude: float | None = None


class UpdateMarketIn(BaseModel):
    # Every field optional and only applied when actually sent - same
    # "omitted means unchanged" convention as auth.UpdateProfileIn.
    name: str | None = None
    city: str | None = None
    state: str | None = None
    is_active: bool | None = None
    venue_type: VenueType | None = None
    latitude: float | None = None
    longitude: float | None = None


class MarketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    city: str
    state: str
    is_active: bool
    venue_type: str
    latitude: float | None
    longitude: float | None


class CreateVendorIn(BaseModel):
    """A stall registered by an agent on the fly while shopping — no photo,
    no hours, no approval gate. Live the moment it's created."""

    name: str = Field(..., examples=["Mama Chidinma's stall"])
    # Rough location/category, free text — e.g. "Produce, near the east gate".
    stall_description: str | None = Field(default=None, examples=["Fresh produce, row 3"])
    phone: str | None = None
    # A single point captured from the agent's device at save time - optional,
    # never required. See Seller.latitude/longitude.
    latitude: float | None = None
    longitude: float | None = None


class VendorOut(BaseModel):
    """A stall / seller inside a market — customer browse surface."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    market_id: uuid.UUID
    name: str
    stall_description: str | None
    phone: str | None
    latitude: float | None
    longitude: float | None


class ShopActivityOut(BaseModel):
    """Honest live pulse for the shop hero banner."""

    agents_on_duty: int
    active_markets: int
    active_supermarkets: int


class SetDutyIn(BaseModel):
    on_duty: bool


class AgentStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    on_duty: bool
    is_available: bool
    assigned_market_id: uuid.UUID | None
