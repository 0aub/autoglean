#!/bin/bash
# Create a new Alembic migration

set -e

MESSAGE="${1:-auto_migration}"

echo "Creating migration: $MESSAGE"
docker exec autoglean-api alembic revision --autogenerate -m "$MESSAGE"
