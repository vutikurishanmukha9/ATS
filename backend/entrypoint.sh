#!/usr/bin/env bash
set -e

echo "[startup] Running database migrations (alembic upgrade head)..."
alembic upgrade head

if [ -n "$FIRST_USER_EMAIL" ] && [ -n "$FIRST_USER_PASSWORD" ]; then
    echo "[startup] Checking / creating initial recruiter user ($FIRST_USER_EMAIL)..."
    python -m app.cli create-first-user || echo "[startup] User bootstrap skipped or already present."
fi

PORT="${PORT:-8000}"
echo "[startup] Starting FastAPI on 0.0.0.0:${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --workers 2 --proxy-headers --forwarded-allow-ips='*'
