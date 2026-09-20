"""Run the whole Qyka order flow in one command.

Instead of clicking through Swagger and re-authorizing between every step, this
walks a complete order end to end, using the correct role's token at each step
automatically, and prints what happened.

Usage (with the app running via `docker compose up`):

    docker compose exec api python walkthrough.py

If a step fails, it prints WHICH step, the status code, and the server's
message — so you can see exactly where things broke instead of guessing.
"""

import asyncio
import os
import sys
from decimal import Decimal

import httpx

BASE = os.environ.get("QYKA_BASE_URL", "http://localhost:8000")

GREEN = "\033[92m"
RED = "\033[91m"
DIM = "\033[2m"
BOLD = "\033[1m"
END = "\033[0m"


def ok(step: str, detail: str = "") -> None:
    print(f"{GREEN}[OK]{END} {step}" + (f"  {DIM}{detail}{END}" if detail else ""))


def fail(step: str, resp) -> None:
    print(f"\n{RED}[FAILED]{END} {BOLD}{step}{END}")
    print(f"  status : {resp.status_code}")
    try:
        print(f"  message: {resp.json()}")
    except Exception:
        print(f"  body   : {resp.text[:400]}")
    print(
        f"\n{DIM}Everything before this step worked. Fix this one and re-run.{END}"
    )
    sys.exit(1)


def check(step: str, resp, expected=(200, 201)):
    if resp.status_code not in expected:
        fail(step, resp)
    return resp


async def main() -> None:
    print(f"\n{BOLD}Qyka order walkthrough{END}  {DIM}({BASE}){END}\n")

    async with httpx.AsyncClient(base_url=BASE, timeout=30.0) as c:
        # ---------------------------------------------------------------
        # 0. Health — is the app even up?
        # ---------------------------------------------------------------
        try:
            r = await c.get("/health")
        except Exception as e:
            print(f"{RED}Cannot reach the API at {BASE}{END}")
            print(f"  {e}")
            print(f"\n{DIM}Is `docker compose up` running?{END}")
            sys.exit(1)
        check("health check", r)
        ok("API is up")

        # ---------------------------------------------------------------
        # 1. Seed the three personas — this is what /dev/seed is for.
        #    It returns one token per role. We keep all three and use the
        #    right one at each step, which is the bit Swagger can't do.
        # ---------------------------------------------------------------
        r = check("POST /dev/seed", await c.post("/dev/seed"))
        seed = r.json()
        admin = {"Authorization": f"Bearer {seed['admin_token']}"}
        agent = {"Authorization": f"Bearer {seed['agent_token']}"}
        customer = {"Authorization": f"Bearer {seed['customer_token']}"}
        market_id = seed["market_id"]
        ok("seeded personas", f"market {market_id[:8]}...")

        # ---------------------------------------------------------------
        # 2. Float pool — the agent shops with this money.
        # ---------------------------------------------------------------
        r = check(
            "GET /admin/float",
            await c.get("/admin/float", headers=admin, params={"market_id": market_id}),
        )
        opening = Decimal(r.json()["pool_balance"])
        ok("float pool", f"opening balance N{opening}")

        # ---------------------------------------------------------------
        # 3. CUSTOMER creates the order.
        #    Auto-assign should attach the seeded agent automatically.
        # ---------------------------------------------------------------
        r = check(
            "POST /orders (as customer)",
            await c.post(
                "/orders",
                headers=customer,
                json={
                    "market_id": market_id,
                    "delivery_address": "12 Aba Road, Port Harcourt",
                    "listed_items_total": "2000.00",
                    "items": [
                        {
                            "description": "500 naira pepper",
                            "requested_note": "ripe ones",
                        },
                        {"description": "1000 naira rice"},
                    ],
                },
            ),
        )
        order = r.json()
        oid = order["id"]
        if not order.get("agent_id"):
            print(
                f"{RED}Order was created but NO agent was auto-assigned.{END}\n"
                f"{DIM}That means no available agent covers this market.{END}"
            )
            sys.exit(1)
        ok("customer created order", f"{oid[:8]}... status={order['status']}")
        ok("agent auto-assigned", f"deposit N{order['deposit_amount']}")

        # ---------------------------------------------------------------
        # 4. AGENT shops. Note the token switches here — this is exactly
        #    where Swagger gives you 403 if you're still authorized as the
        #    customer.
        # ---------------------------------------------------------------
        r = check(
            "POST /orders/{id}/start-shopping (as AGENT)",
            await c.post(f"/orders/{oid}/start-shopping", headers=agent),
        )
        items = r.json()["items"]
        ok("agent started shopping", f"{len(items)} items on the list")

        # Agent bargains and logs the real price of each item.
        prices = ["450.00", "950.00"]
        for item, price in zip(items, prices):
            check(
                f"pay vendor for '{item['description']}'",
                await c.post(
                    f"/jit/orders/{oid}/pay-vendor",
                    headers=agent,
                    json={
                        "account_number": "9012345678",
                        "bank_code": "999992",
                        "amount": price,
                        "item_ids": [item["id"]],
                    },
                ),
            )
            ok(f"bargained '{item['description']}'", f"paid N{price}")

        r = check(
            "POST /orders/{id}/finish-shopping (as AGENT)",
            await c.post(f"/orders/{oid}/finish-shopping", headers=agent),
        )
        final = r.json()
        ok(
            "shopping finished",
            f"items N{final['items_total']} + combined fee N{final['combined_fee']} "
            f"(company N{final['company_share']} / agent N{final['agent_share']}) "
            f"+ delivery N{final['delivery_fee']} = N{final['grand_total']}",
        )

        # ---------------------------------------------------------------
        # 5. CUSTOMER reviews the bargained list and is notified to pay.
        # ---------------------------------------------------------------
        r = check(
            "GET /orders/{id}/bargained-list (as customer)",
            await c.get(f"/orders/{oid}/bargained-list", headers=customer),
        )
        bl = r.json()
        ok("customer sees bargained list", f"amount due N{bl['amount_due']}")

        r = check(
            "GET /notifications (as customer)",
            await c.get("/notifications", headers=customer),
        )
        kinds = [n["kind"] for n in r.json()]
        ok("customer notified", f"kinds={kinds}")

        # ---------------------------------------------------------------
        # 6. CUSTOMER pays from wallet. Fund it first (dev-only shortcut;
        #    in production this goes through the Paystack webhook).
        # ---------------------------------------------------------------
        check(
            "POST /wallet/fund (dev shortcut)",
            await c.post(
                "/wallet/fund", headers=customer, json={"amount": "20000.00"}
            ),
        )
        ok("wallet funded", "N20000 (dev-only direct credit)")

        r = check(
            "POST /payments/orders/{id}/pay-from-wallet",
            await c.post(
                f"/payments/orders/{oid}/pay-from-wallet", headers=customer
            ),
        )
        ok("customer paid", f"{r.json()}")

        # ---------------------------------------------------------------
        # 7. AGENT packs, ADMIN dispatches the courier.
        #    Neither is reachable unless the order is PAID — that's the gate.
        # ---------------------------------------------------------------
        r = check(
            "POST /delivery/orders/{id}/pack (as AGENT)",
            await c.post(f"/delivery/orders/{oid}/pack", headers=agent),
        )
        ok("agent packed the order", f"status={r.json()['status']}")

        r = check(
            "POST /delivery/orders/{id}/dispatch-courier (as ADMIN)",
            await c.post(
                f"/delivery/orders/{oid}/dispatch-courier", headers=admin
            ),
        )
        ok("courier dispatched", f"status={r.json()['status']}")

        # ---------------------------------------------------------------
        # 8. CUSTOMER confirms delivery -> payouts released.
        # ---------------------------------------------------------------
        r = check(
            "POST /delivery/orders/{id}/confirm-delivery (as customer)",
            await c.post(
                f"/delivery/orders/{oid}/confirm-delivery", headers=customer
            ),
        )
        split = r.json()
        ok("delivery confirmed — payouts released")
        print(
            f"     {DIM}agent gets N{split['agent_payout']} | "
            f"courier N{split['courier_cost']} | "
            f"company retains N{split['company_retained']}{END}"
        )

        # ---------------------------------------------------------------
        # 9. The float pool, start to finish.
        # ---------------------------------------------------------------
        r = check(
            "GET /admin/float (final)",
            await c.get("/admin/float", headers=admin, params={"market_id": market_id}),
        )
        closing = Decimal(r.json()["pool_balance"])
        ok("float pool", f"closing balance N{closing}")

        print(
            f"\n{BOLD}Pool moved N{opening} -> N{closing} "
            f"(net {closing - opening:+}){END}"
        )
        print(
            f"{DIM}The net gain is the company's flat combined-fee share: the "
            f"pool fronted the goods, got repaid, paid out agent and courier, "
            f"kept the margin.{END}"
        )
        print(f"\n{GREEN}{BOLD}Full flow completed successfully.{END}\n")


if __name__ == "__main__":
    asyncio.run(main())
