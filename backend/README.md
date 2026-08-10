# Quika Groceries — Backend

FastAPI + PostgreSQL backend for Quika Groceries. Recycled-float grocery
shopping via human market agents.

## Stack
- FastAPI + async SQLAlchemy 2.0
- PostgreSQL 16 (asyncpg driver)
- Alembic migrations
- Docker Compose
- Paystack for payments (checkout, split payments, transfers)

## Project layout
Organised by domain, not by file type:

```
app/
  core/        config, database, enums (shared)
  auth/        users, OTP verification
  markets/     markets + agents
  orders/      order + order_item models, state machine
  float/       the recycled float pool ledger + service
  payments/    Paystack transactions
  main.py      FastAPI entrypoint
  models.py    imports all models for Alembic autogenerate
alembic/       migrations
```

## Key design decisions baked in
- **Money is always Numeric/Decimal**, never float. No floating-point kobo bugs.
- **The float ledger is append-only.** Balance is derived, never updated in place.
  See `app/float/service.py`.
- **`order_items.description` is free text, not a product FK.** There is no
  catalogue on purpose — a catalogue would make this a supermarket app.
- **The payment gate lives in `app/orders/state_machine.py`.** Nothing moves
  from `awaiting_payment` to `packed` without passing through `paid` (set only
  by a confirmed Paystack webhook). That single rule is the entire risk model.
- **Money logic stays in service layers**, never inline in route handlers.

## Running it

1. Copy env and add your Paystack TEST keys:
   ```
   cp .env.example .env
   # edit .env, set PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY
   ```

2. Start the stack:
   ```
   docker compose up --build
   ```

3. Create the first migration (once containers are up):
   ```
   docker compose exec api alembic revision --autogenerate -m "initial schema"
   docker compose exec api alembic upgrade head
   ```

4. Check it's alive: http://localhost:8000/health
   API docs: http://localhost:8000/docs

## What's built (Week 1 foundation)
- Modular project structure
- Full DB schema: users, otp_codes, markets, agents, orders, order_items,
  float_ledger, transactions
- Order state machine with the payment gate enforced
- Float pool service (append-only ledger)
- Docker + Alembic + config wired up

## Next (Week 1 remainder -> Week 2)
- Auth routes: request OTP, verify OTP, issue JWT
- Order creation + agent assignment endpoints
- Item confirmation endpoints (agent logs prices)
