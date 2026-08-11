#!/bin/sh
set -e

# Wait for Postgres (compose healthcheck helps, but DNS/start can still race)
i=0
until python - <<'PY'
import asyncio, os, sys
from urllib.parse import urlparse
import asyncpg

url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://", 1)
u = urlparse(url)

async def main():
    conn = await asyncpg.connect(
        host=u.hostname,
        port=u.port or 5432,
        user=u.username,
        password=u.password,
        database=(u.path or "/quika").lstrip("/") or "quika",
    )
    await conn.close()

asyncio.run(main())
PY
do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "Database not reachable after 30s" >&2
    exit 1
  fi
  echo "Waiting for database… ($i)"
  sleep 1
done

alembic upgrade head

exec "$@"
