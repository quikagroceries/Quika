"""Payout split — how a paid order's money is divided on delivery confirmation.

When the customer paid, the full grand_total was credited back into the float
pool (Week 3). Payout is the mirror: on delivery confirmation we release the
agent's and rider's shares OUT of the pool to them, and the company retains the
rest (item cost recovery + service charge margin).

Kept isolated like fees.py so the split policy lives in one place. In V1 this
records the split on the transaction; actual disbursement to agent/rider bank
accounts via Paystack Transfers is a thin call layered on top later.
"""

from decimal import Decimal

from app.orders.models import Order


def compute_split(order: Order) -> dict[str, str]:
    """Return the payout breakdown for a delivered order, as string amounts.

    - agent_payout   : the agent's fee
    - courier_cost   : paid to the third-party courier partner
    - company_retained: items cost (float recovery) + service charge (margin)
    """
    agent_payout = order.agent_share
    courier_cost = order.delivery_fee
    company_retained = order.company_share
    return {
        "agent_payout": str(agent_payout),
        "courier_cost": str(courier_cost),
        "company_retained": str(company_retained),
        "grand_total": str(order.grand_total),
    }
