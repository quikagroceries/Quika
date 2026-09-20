# Qyka Groceries — Backend

FastAPI + PostgreSQL backend for Qyka Groceries. Recycled-float grocery
shopping via human market agents: a customer places a list, an agent shops
it at a real market, paid for out of a company float pool that's
replenished the moment the customer pays.

## Stack
- FastAPI + async SQLAlchemy 2.0
- PostgreSQL 16 (asyncpg driver)
- Alembic migrations (auto-applied on container start, see `entrypoint.sh`)
- Docker Compose
- Paystack for payments (checkout, wallet top-up, webhooks)
- LiveKit for the voice/video call prototype
- JWT (python-jose) auth, OTP-based login (no passwords)

## Project layout
Organised by domain, not by file type. Most domains follow the same
internal shape: `models.py` (tables), `schemas.py` (Pydantic in/out),
`service.py` (the actual logic — money code lives here, never in routes),
`routes.py` (thin HTTP wiring).

```
app/
  core/                config, database, enums, JWT/security, phone normalization
  auth/                users, OTP request/verify, profile
  markets/             markets + agents (on_duty / is_available)
  agent_applications/  customer -> agent onboarding + admin approval
  orders/              order + order_item models, state machine, propose->accept
                       assignment, item-unavailable flow, per-item overage flow
  jit/                 just-in-time vendor transfers + spending authorization
                       (the agent's real payment rail - the transfer IS the price)
  float/               the recycled float pool ledger (append-only)
  payments/            Paystack checkout/webhook, wallet-funded payment, deposit
  wallet/              customer wallet ledger
  delivery/            packing, courier dispatch, delivery confirmation, payout split
  chat/                order-scoped messaging (customer <-> agent)
  calls/               LiveKit token issuance for voice/video
  notifications/       in-app notifications feed
  ratings/             post-completion agent rating (feedback only)
  admin/               admin oversight: agents, markets, orders, float, losses, analytics
  agent/               agent dashboard: earnings, task counts, availability toggle
  dev/                 dev-only seed/test helpers - 404s when ENVIRONMENT=production
  main.py              FastAPI entrypoint, router registration, CORS
  models.py            imports every model so Alembic autogenerate sees all tables
alembic/               migrations (27 and counting)
tests/                 pytest suite (SQLite in-memory per test) - 19 files
```

## Key design decisions baked in
- **Money is always Numeric/Decimal**, never float. No floating-point kobo bugs.
- **The float ledger is append-only.** Balance is derived, never updated in place.
  See `app/float/service.py`.
- **`order_items.description` is free text, not a product FK.** There is no
  catalogue on purpose — a catalogue would make this a supermarket app.
- **The payment gate lives in `app/orders/state_machine.py`.** Nothing moves
  past `paid` without a confirmed Paystack webhook or wallet debit. That
  single rule is most of the risk model.
- **Money logic stays in service layers**, never inline in route handlers.
- **Propose, then accept — the agent doesn't just get assigned.** On order
  creation the system *proposes* an available agent from the order's own
  market only; the agent gains zero access (`Order.agent_id` stays unset)
  until the customer explicitly accepts. The customer can ask for someone
  else ("see another"), which excludes everyone already turned down for
  that order. See `app/orders/assignment.py` + `app/orders/service.py`.
- **The deposit (if one is owed) is paid before the agent is assigned, not
  after.** `accept_proposal` refuses with 402 until it's paid — an agent is
  never assigned to, or shown, an order the customer hasn't committed real
  money to.
- **The agent never sees the customer's total.** No aggregate cap, no
  goods/grand total, anywhere on the agent side — only each item's own
  listed price. The spending ceiling exists (`jit.SpendingAuthorization`)
  but is enforced silently; the agent just gets a 402 if they try to
  overspend it.
- **Per-item prices are typed per item, never split evenly.** One vendor
  transfer can cover several items bought at the same stall, but each item
  carries its own agent-typed price — `jit.service.pay_vendor` sums them for
  the transfer amount, it never derives them by dividing a total.
- **A purchase photo is required, but never blocks the money.** The vendor
  transfer fires immediately regardless of a photo. `finish_shopping`
  refuses (409) until every successful transfer has one attached — the
  accountability catches up after the fact, the payment never waits on it.

## Running it

1. Copy env and fill in real values where you have them (Paystack TEST
   keys at minimum; LiveKit/SMS/Google Maps can stay blank):
   ```
   cp .env.example .env
   ```

2. Start the stack:
   ```
   docker compose up --build
   ```
   Migrations run automatically on container start (`entrypoint.sh` runs
   `alembic upgrade head` before the server boots) — no manual migration
   step needed.

3. Check it's alive: http://localhost:8000/health
   API docs (Swagger): http://localhost:8000/docs

If you change a model, generate a migration yourself:
```
docker compose exec api alembic revision --autogenerate -m "describe the change"
docker compose exec api alembic upgrade head
```

## Running the tests
```
docker compose exec api pytest -q
```
Tests run against SQLite in-memory (a fresh DB per test), not the real
Postgres container — fast, and each test starts from a clean slate.

## Dev-only helpers
`app/dev/routes.py` (prefix `/dev`) has one-tap seed helpers for spinning up
a full customer/agent/admin/market fixture with tokens ready to paste into
Swagger's Authorize button. Every route there 404s once
`ENVIRONMENT=production` — never reachable outside local dev.
