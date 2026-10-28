#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
COMPOSE_FILE="$ROOT_DIR/compose.production.yaml"
ENV_FILE=${PRODUCTION_ENV_FILE:-"$ROOT_DIR/ops/production.env"}
IMAGE_TAG=${1:?usage: rollback.sh <previous-compatible-image-tag>}
export IMAGE_TAG

test -f "$ENV_FILE" || { echo "Missing production environment file: $ENV_FILE" >&2; exit 1; }

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull api web admin
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --wait --remove-orphans api web admin
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
