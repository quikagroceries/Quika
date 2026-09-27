"""Order state machine — the single source of truth for legal transitions.

The critical guard lives here: nothing moves from AWAITING_PAYMENT to PACKED
without going through PAID first. That one rule is the entire risk model —
delivery never starts on an unpaid order.
"""

from app.core.enums import OrderStatus

# Map of status -> set of statuses it may transition to.
ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.DRAFT: {
        OrderStatus.PROPOSED,       # an available agent was found to propose
        OrderStatus.AGENT_ASSIGNED,  # admin manual assign - skips the propose step
        OrderStatus.CANCELLED,
    },
    OrderStatus.PROPOSED: {
        OrderStatus.AGENT_ASSIGNED,  # customer accepted the proposed agent
        OrderStatus.DRAFT,           # customer rejected the last candidate - nobody left to propose
        OrderStatus.CANCELLED,
    },
    OrderStatus.AGENT_ASSIGNED: {
        OrderStatus.SHOPPING,
        OrderStatus.CANCELLED,
        OrderStatus.DRAFT,  # agent releases the order before shopping starts
    },
    OrderStatus.SHOPPING: {
        OrderStatus.AWAITING_PAYMENT,
        OrderStatus.CANCELLED,
    },
    OrderStatus.AWAITING_PAYMENT: {
        OrderStatus.PAID,             # only via confirmed Paystack webhook
        OrderStatus.CANCELLED_UNPAID,  # payment window lapsed
        OrderStatus.CANCELLED,         # admin override, see orders/service.py::admin_cancel_order
    },
    OrderStatus.PAID: {
        OrderStatus.PACKED,
        OrderStatus.CANCELLED,  # admin override
    },
    OrderStatus.PACKED: {
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.CANCELLED,  # admin override
    },
    OrderStatus.OUT_FOR_DELIVERY: {
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,  # admin override - the last point before a rider is out with the goods
    },
    OrderStatus.DELIVERED: {
        OrderStatus.CLOSED,
        OrderStatus.DISPUTED,
    },
    OrderStatus.CLOSED: set(),
    OrderStatus.CANCELLED: set(),
    OrderStatus.CANCELLED_UNPAID: set(),
    OrderStatus.DISPUTED: {OrderStatus.CLOSED},
}


class IllegalTransition(Exception):
    pass


def assert_can_transition(current: OrderStatus, target: OrderStatus) -> None:
    if target not in ALLOWED_TRANSITIONS.get(current, set()):
        raise IllegalTransition(
            f"Cannot move order from {current.value} to {target.value}"
        )
