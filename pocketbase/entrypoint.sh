#!/bin/sh
set -e

echo "[pocketbase] Running database migrations..."
/pb/pocketbase migrate up --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations || true

if [ -n "$POCKETBASE_SUPERUSER_EMAIL" ] && [ -n "$POCKETBASE_SUPERUSER_PASSWORD" ]; then
    echo "[pocketbase] Setting up superuser ($POCKETBASE_SUPERUSER_EMAIL)..."
    /pb/pocketbase superuser upsert "$POCKETBASE_SUPERUSER_EMAIL" "$POCKETBASE_SUPERUSER_PASSWORD" --dir=/pb/pb_data || true
fi

echo "[pocketbase] Starting PocketBase server on 0.0.0.0:8090..."
exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations "$@"
