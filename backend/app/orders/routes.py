import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import get_current_user, get_customer_user, require_role
from app.orders import service
from app.orders.schemas import (
    AddItemIn,
    AssignedAgentOut,
    BargainedListOut,
    AssignAgentIn,
    CreateOrderIn,
    OrderItemOut,
    OrderOut,
    ProposedAgentOut,
    SeeAnotherOut,
    UpdateDraftIn,
)

router = APIRouter()


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(
    body: CreateOrderIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_customer_user),
) -> OrderOut:
    order = await service.create_order(
        db,
        customer_id=user.id,
        market_id=body.market_id,
        items=[i.model_dump() for i in body.items],
        delivery_address=body.delivery_address,
        listed_items_total=body.listed_items_total,
        dropoff_latitude=body.dropoff_latitude,
        dropoff_longitude=body.dropoff_longitude,
    )
    return order


@router.get("/mine", response_model=list[OrderOut])
async def my_orders(
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> list[OrderOut]:
    """Orders currently or previously assigned to the logged-in agent."""
    return await service.list_orders_for_agent(db, agent_id=agent.id)


@router.get("/mine-customer", response_model=list[OrderOut])
async def my_orders_as_customer(
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> list[OrderOut]:
    """Orders placed by the logged-in customer."""
    return await service.list_orders_for_customer(db, customer_id=customer.id)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrderOut:
    return await service.get_order(db, order_id)


@router.put("/{order_id}/draft", response_model=OrderOut)
async def update_draft(
    order_id: uuid.UUID,
    body: UpdateDraftIn,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> OrderOut:
    """Edit a draft list: replaces its items and re-prices it."""
    return await service.update_draft(
        db,
        order_id=order_id,
        customer_id=customer.id,
        items=[i.model_dump() for i in body.items],
        listed_items_total=body.listed_items_total,
        delivery_address=body.delivery_address,
    )


@router.delete("/{order_id}", status_code=204)
async def delete_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> None:
    """Let a customer delete their own order before shopping has started."""
    await service.delete_order(db, order_id=order_id, customer_id=customer.id)


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> OrderOut:
    """Customer cancels before shopping starts - unlike delete, legal even
    with a deposit already paid (it's refunded to the wallet)."""
    return await service.cancel_order(db, order_id=order_id, customer_id=customer.id)


@router.get("/{order_id}/proposed-agent", response_model=ProposedAgentOut | None)
async def proposed_agent(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> ProposedAgentOut | None:
    """Who the system is currently proposing for this order, if anyone -
    enough for the customer to recognize/accept them. None once there's no
    pending proposal (already accepted, or nobody available)."""
    return await service.get_proposed_agent(db, order_id)


@router.get("/{order_id}/agent", response_model=AssignedAgentOut | None)
async def assigned_agent(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> AssignedAgentOut | None:
    """Who is shopping this order (name + photo), once accepted. Customer-only."""
    return await service.get_assigned_agent(db, order_id, customer.id)


@router.post("/{order_id}/accept-agent", response_model=OrderOut)
async def accept_agent(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> OrderOut:
    """Customer accepts the currently proposed agent."""
    return await service.accept_proposal(db, order_id=order_id, customer_id=customer.id)


@router.post("/{order_id}/see-another-agent", response_model=SeeAnotherOut)
async def see_another_agent(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> SeeAnotherOut:
    """Customer turns down the proposed agent and asks for a different one."""
    result = await service.see_another(db, order_id=order_id, customer_id=customer.id)
    return SeeAnotherOut(**result)


@router.post("/{order_id}/assign-agent", response_model=OrderOut)
async def assign_agent(
    order_id: uuid.UUID,
    body: AssignAgentIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> OrderOut:
    return await service.assign_agent(
        db, order_id=order_id, agent_id=body.agent_id
    )


@router.post("/{order_id}/release", response_model=OrderOut)
async def release_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> OrderOut:
    """Agent releases an order before shopping has started."""
    return await service.release_order(db, order_id=order_id, agent_id=agent.id)


@router.post("/{order_id}/start-shopping", response_model=OrderOut)
async def start_shopping(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> OrderOut:
    return await service.start_shopping(
        db, order_id=order_id, agent_id=agent.id
    )


@router.post("/{order_id}/finish-shopping", response_model=OrderOut)
async def finish_shopping(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> OrderOut:
    return await service.finish_shopping(
        db, order_id=order_id, agent_id=agent.id
    )


@router.get("/{order_id}/bargained-list", response_model=BargainedListOut)
async def bargained_list(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BargainedListOut:
    """What the customer reviews before paying: real bargained prices."""
    data = await service.get_bargained_list(db, order_id)
    return BargainedListOut(**data)


@router.post("/{order_id}/items", response_model=OrderItemOut)
async def add_item(
    order_id: uuid.UUID,
    body: AddItemIn,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> OrderItemOut:
    """Customer adds a new item to an order while it's actively being
    shopped - additions only (see service.add_item's own docstring for why
    there's no companion remove/reduce here). Charges the flat
    fees.ADD_ITEM_FEE from the customer's wallet."""
    return await service.add_item(
        db, order_id=order_id, customer_id=customer.id, item=body.model_dump()
    )


@router.post("/{order_id}/items/{item_id}/unavailable")
async def flag_item_unavailable(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> dict:
    """Agent flags a listed item as not found; pings the customer to decide."""
    from app.orders import availability
    order = await service._load(db, order_id)
    item = await availability.flag_unavailable(
        db, order=order, agent_id=agent.id, item_id=item_id
    )
    return {"item_id": str(item.id), "availability": item.availability}


@router.post("/{order_id}/items/{item_id}/decide")
async def decide_unavailable_item(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Customer chooses buy_elsewhere or dropped for an unavailable item."""
    from app.orders import availability
    order = await service._load(db, order_id)
    item = await availability.customer_decide(
        db, order=order, customer_id=customer.id, item_id=item_id,
        decision=body.get("decision", ""),
    )
    return {"item_id": str(item.id), "availability": item.availability}


@router.post("/{order_id}/items/{item_id}/request-overage")
async def request_item_overage(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> dict:
    """Agent flags that an item's real price is over the customer's listed
    price; pings the customer to approve the extra cost."""
    from app.orders import overage
    order = await service._load(db, order_id)
    item = await overage.request_overage(
        db, order=order, agent_id=agent.id, item_id=item_id,
        price=Decimal(str(body.get("price", "0"))),
    )
    return {
        "item_id": str(item.id),
        "availability": item.availability,
        "overage_requested_price": str(item.overage_requested_price),
    }


@router.post("/{order_id}/items/{item_id}/overage-decide")
async def decide_item_overage(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Customer approves or declines a pending per-item overage request."""
    from app.orders import overage
    order = await service._load(db, order_id)
    item = await overage.customer_decide(
        db, order=order, customer_id=customer.id, item_id=item_id,
        decision=body.get("decision", ""),
    )
    return {
        "item_id": str(item.id),
        "availability": item.availability,
        "overage_decision": item.overage_decision,
    }
