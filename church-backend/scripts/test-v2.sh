#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="hof-v2-acceptance-$(date +%s)-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Disposable filesystem, loopback-only random port, no development volumes.
docker run -d --name "$container" --tmpfs /var/lib/postgresql/data -p 127.0.0.1::5432 \
 -e POSTGRES_USER=hof_v2_user -e POSTGRES_PASSWORD=hof_v2_test_only -e POSTGRES_DB=hof_v2_test postgres:16-alpine >/dev/null
for attempt in {1..60}; do
 if docker exec "$container" pg_isready -U hof_v2_user -d hof_v2_test >/dev/null 2>&1; then break; fi
 sleep 1
done
port=$(docker port "$container" 5432/tcp)
export V2_TEST_DATABASE_URL="postgres://hof_v2_user:hof_v2_test_only@${port}/hof_v2_test?sslmode=disable"
go test -count=1 -timeout=5m ./internal/v2/... "$@"
./scripts/smoke-v2.sh "$container" "${port##*:}"
