#!/bin/sh
set -e

mkdir -p /app/uploads
if [ -d /app/seed-uploads ]; then
  cp -n /app/seed-uploads/* /app/uploads/ 2>/dev/null || true
fi

node dist/db/migrate.js
exec "$@"
