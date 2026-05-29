#!/usr/bin/env sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  bun run db:migrate:deploy
fi

if [ "${RUN_SEED:-true}" = "true" ]; then
  bun run db:seed
fi

exec "$@"
