#!/bin/sh
set -e

cd /app

# Named volume for node_modules can be empty on first boot after a rebuild.
if [ ! -x node_modules/.bin/next ]; then
  echo "Installing npm dependencies…"
  npm ci
fi

npx prisma generate
npx prisma migrate deploy

if [ -n "${PLATFORM_OPERATOR_EMAIL:-}" ] && [ -n "${PLATFORM_OPERATOR_PASSWORD:-}" ]; then
  echo "Seeding Platform Operator (idempotent)…"
  npm run prisma:seed || true
fi

echo "Starting Next.js on 0.0.0.0:3000…"
exec npm run dev -- --hostname 0.0.0.0 --port 3000
