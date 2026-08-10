import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    AGENT = "agent"
    RIDER = "rider"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    FLAGGED = "flagged"
    LOCKED = "locked"


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class OrderStatus(str, enum.Enum):
    # Happy path
    DRAFT = "draft"
    # An agent has been proposed but not yet accepted by the customer - the
    # agent does NOT have access to this order yet (agent_id is still unset;
    # see Order.proposed_agent_id). Sits between DRAFT and AGENT_ASSIGNED.
    PROPOSED = "proposed"
    AGENT_ASSIGNED = "agent_assigned"
    SHOPPING = "shopping"
    AWAITING_PAYMENT = "awaiting_payment"
    PAID = "paid"
    PACKED = "packed"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CLOSED = "closed"
    # Exits
    CANCELLED = "cancelled"
    CANCELLED_UNPAID = "cancelled_unpaid"
    DISPUTED = "disputed"


class LedgerDirection(str, enum.Enum):
    DEBIT = "debit"    # money leaving the float pool (agent buying)
    CREDIT = "credit"  # money returning to the pool (customer paying)


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
