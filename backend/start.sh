#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma --url="$DATABASE_URL"

echo "Starting app..."
exec node dist/main.js
