"""Fee calculation — the settled Qyka money model, isolated in one file.

FEE POLICY (see project docs):
  Items    : whatever the agent actually TRANSFERRED to vendors (JIT).
  Combined agent/commission fee: a single COMBINED_BASE_FEE covering the first
             INCLUDED_MINUTES. Beyond that, PER_MINUTE per minute (rounded up).
             The customer sees ONE line. Internally it splits:
               - company keeps COMPANY_SHARE (flat, regardless of time)
               - agent gets the rest of the base PLUS all overtime
  Delivery : courier quote; flat placeholder until a partner is live.
  EMTL     : ₦50 govt stamp duty per transfer >= EMTL_THRESHOLD. Pass-through.
  Transfer : provider fee per transfer. Pass-through. (OPay->OPay = 0.)

DEPOSIT POLICY:
  Orders whose estimate passes DEPOSIT_THRESHOLD pay DEPOSIT_RATE of the goods
  estimate up front. Flagged/prepay customers pay 100% up front instead.

All money is Decimal, quantized to 2 places.
"""

import math
from decimal import ROUND_HALF_UP, Decimal

# --- Combined agent/commission fee ---
COMBINED_BASE_FEE = Decimal("2000.00")   # customer-facing single line, first 30 min
INCLUDED_MINUTES = 30                     # minutes covered by the base fee
PER_MINUTE = Decimal("50.00")            # per minute beyond the window (agent's)
COMPANY_SHARE = Decimal("1000.00")       # company's flat cut of the base

# --- Delivery ---
DELIVERY_FEE_FLAT = Decimal("3600.00")   # placeholder until courier quotes live

# --- Government stamp duty (EMTL) ---
EMTL_PER_TRANSFER = Decimal("50.00")
EMTL_THRESHOLD = Decimal("10000.00")     # applies to transfers >= this

# --- Deposit policy ---
DEPOSIT_THRESHOLD = Decimal("30000.00")  # estimates above this need a deposit
DEPOSIT_RATE = Decimal("0.20")           # 20% of the goods estimate

# --- Mid-order additions ---
# Flat platform fee for adding a new item to an order that's already being
# shopped (see orders.service.add_item). Deliberately flat regardless of the
# item's own price or how far along shopping is - fair and predictable
# rather than punitive, per the product spec this came from. Charged
# separately from - and never folded into - the spending authorization cap:
# it's a platform fee, not goods money, same reasoning that already keeps
# delivery/combined_fee out of goods_estimate (see Order.goods_estimate's
# own comment).
ADD_ITEM_FEE = Decimal("500.00")


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def billable_minutes(seconds: float) -> int:
    """Round the shopping duration UP to whole started minutes."""
    if seconds <= 0:
        return 0
    return math.ceil(seconds / 60)


def combined_fee(shopping_seconds: float) -> Decimal:
    """The single customer-facing agent/commission fee."""
    minutes = billable_minutes(shopping_seconds)
    extra = max(0, minutes - INCLUDED_MINUTES)
    return _money(COMBINED_BASE_FEE + (PER_MINUTE * extra))


def split_fee(shopping_seconds: float) -> dict[str, Decimal]:
    """Split the combined fee into company and agent shares.

    Company: COMPANY_SHARE flat, always.
    Agent  : the rest of the base (COMBINED_BASE_FEE - COMPANY_SHARE) PLUS all
             overtime minutes.
    """
    total = combined_fee(shopping_seconds)
    company = COMPANY_SHARE
    agent = total - company
    return {"total": total, "company": _money(company), "agent": _money(agent)}


def emtl_for_transfer(amount: Decimal) -> Decimal:
    """Stamp duty on a single transfer. ₦50 if >= threshold, else 0."""
    return EMTL_PER_TRANSFER if amount >= EMTL_THRESHOLD else Decimal("0.00")


def calculate_fees(
    items_total: Decimal,
    shopping_seconds: float = 0.0,
    emtl_total: Decimal = Decimal("0.00"),
    transfer_fees_total: Decimal = Decimal("0.00"),
    delivery_fee: Decimal | None = None,
) -> dict[str, Decimal]:
    """Final bill once shopping is done and real transfers are known.

    items_total          : sum of actual vendor transfers (goods)
    emtl_total           : sum of stamp duty across the order's transfers
    transfer_fees_total  : sum of provider fees across the order's transfers
    delivery_fee         : courier quote; falls back to the flat placeholder
    """
    fee = split_fee(shopping_seconds)
    delivery = DELIVERY_FEE_FLAT if delivery_fee is None else delivery_fee
    grand_total = (
        items_total + fee["total"] + delivery + emtl_total + transfer_fees_total
    )
    return {
        "items_total": _money(items_total),
        "combined_fee": fee["total"],       # single customer-facing line
        "company_share": fee["company"],    # internal
        "agent_share": fee["agent"],        # internal
        "delivery_fee": _money(delivery),
        "emtl_total": _money(emtl_total),
        "transfer_fees_total": _money(transfer_fees_total),
        "grand_total": _money(grand_total),
    }


def estimate_order_value(listed_items_total: Decimal, delivery_fee: Decimal | None = None) -> Decimal:
    """Pre-shopping estimate for the deposit threshold check.

    The only total that exists before bargaining: listed items + delivery +
    the combined base fee.
    """
    delivery = DELIVERY_FEE_FLAT if delivery_fee is None else delivery_fee
    return _money(listed_items_total + delivery + COMBINED_BASE_FEE)


def required_deposit(
    listed_items_total: Decimal,
    estimated_value: Decimal,
    *,
    must_prepay: bool = False,
) -> Decimal:
    """Deposit due up front.

    - must_prepay (flagged customer): 100% of the estimate.
    - estimate over threshold: DEPOSIT_RATE of the GOODS estimate.
    - otherwise: nothing.
    """
    if must_prepay:
        return _money(estimated_value)
    if estimated_value <= DEPOSIT_THRESHOLD:
        return Decimal("0.00")
    return _money(listed_items_total * DEPOSIT_RATE)
