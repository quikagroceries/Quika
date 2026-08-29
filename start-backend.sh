#!/usr/bin/env bash
# Starts the Quika backend stack (Postgres + FastAPI) via Docker Compose.
#
# Usage:
#   ./start-backend.sh          # foreground, logs stream, Ctrl+C stops everything
#   ./start-backend.sh -d       # detached — runs in the background
#
# Handles the two things you'd otherwise have to remember every time:
#   1. Docker Desktop has to actually be running first (this starts it and
#      waits, instead of failing with a confusing "cannot connect" error).
#   2. The compose file lives in backend/, not the repo root.

set -euo pipefail

cd "$(dirname "$0")/backend"

# --- 1. Make sure Docker's daemon is actually reachable ---------------------
if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running — starting Docker Desktop…"
  open -a Docker

  echo -n "Waiting for Docker to be ready"
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      echo " done."
      break
    fi
    echo -n "."
    sleep 2
  done

  if ! docker info >/dev/null 2>&1; then
    echo
    echo "Docker still isn't responding after 2 minutes. Open Docker Desktop" >&2
    echo "manually, wait for it to finish starting, then run this again." >&2
    exit 1
  fi
fi

# --- 2. .env must exist — the compose file's api service requires it -------
if [ ! -f .env ]; then
  echo ".env is missing in backend/ — copying .env.example as a starting point."
  cp .env.example .env
fi

# --- 3. Bring the stack up ---------------------------------------------------
echo "Starting Postgres + API…"
if [ "${1-}" = "-d" ]; then
  docker compose up --build -d
  echo
  echo "Running in the background. Check it's alive:  curl http://localhost:8000/health"
  echo "Logs:   docker compose -f backend/docker-compose.yml logs -f"
  echo "Stop:   docker compose -f backend/docker-compose.yml down"
else
  echo "(Ctrl+C stops everything. Pass -d to run in the background instead.)"
  echo
  docker compose up --build
fi
