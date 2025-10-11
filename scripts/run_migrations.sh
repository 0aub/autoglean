#!/bin/bash
# Run Alembic migrations

set -e

echo "Running database migrations..."
docker exec autoglean-api alembic upgrade head
echo "Migrations completed!"
