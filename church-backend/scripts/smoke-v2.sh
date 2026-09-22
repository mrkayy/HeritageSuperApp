#!/usr/bin/env bash
# Called only by test-v2.sh, against its disposable container.
set -euo pipefail
container=${1:?disposable container required}
port=${2:?disposable PostgreSQL port required}
case "$container" in hof-v2-acceptance-*) ;; *) echo 'Refusing non-acceptance container' >&2; exit 1;; esac
cd "$(dirname "$0")/.."
artifacts=$(mktemp -d)
server_pid=''
cleanup() {
 if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
 rm -rf "$artifacts"
}
trap cleanup EXIT
go build -o "$artifacts/server" ./cmd/server-v2
go build -o "$artifacts/migrate" ./cmd/migrate-v2
go build -o "$artifacts/seed" ./cmd/seed-v2
docker exec "$container" psql -U hof_v2_user -d hof_v2_test -v ON_ERROR_STOP=1 -c 'CREATE DATABASE hof_v2_dev' >/dev/null
docker exec -i "$container" psql -U hof_v2_user -d hof_v2_dev -v ON_ERROR_STOP=1 < scripts/init-v2-dbs.sql >/dev/null
owner="postgres://hof_v2_user:hof_v2_test_only@127.0.0.1:${port}/hof_v2_dev?sslmode=disable"
runtime="postgres://hof_v2_runtime:hof_v2_runtime_dev@127.0.0.1:${port}/hof_v2_dev?sslmode=disable"
export V2_ENVIRONMENT=development
# Startup against a fresh database must fail without creating even a migration table.
if V2_DATABASE_URL="$runtime" "$artifacts/server" >"$artifacts/fresh.log" 2>&1; then
 echo 'Unmigrated API unexpectedly started' >&2; exit 1
fi
count=$(docker exec "$container" psql -U hof_v2_user -d hof_v2_dev -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
[[ "$count" == 0 ]]
V2_DATABASE_URL="$owner" "$artifacts/migrate" up
V2_DATABASE_URL="$owner" "$artifacts/migrate" up
V2_DATABASE_URL="$owner" "$artifacts/seed"
V2_DATABASE_URL="$owner" "$artifacts/seed"
# Database-owner credentials must not run the API.
if V2_DATABASE_URL="$owner" "$artifacts/server" >"$artifacts/owner.log" 2>&1; then
 echo 'API accepted owner credentials' >&2; exit 1
fi
before=$(docker exec "$container" psql -U hof_v2_user -d hof_v2_dev -Atc 'SELECT count(*) FROM accounts')
api_port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
V2_DATABASE_URL="$runtime" V2_PORT="$api_port" "$artifacts/server" >"$artifacts/server.log" 2>&1 &
server_pid=$!
for attempt in {1..40}; do
 if curl --silent --fail "http://127.0.0.1:${api_port}/health/ready" >"$artifacts/ready.json"; then break; fi
 if ! kill -0 "$server_pid" 2>/dev/null; then cat "$artifacts/server.log"; exit 1; fi
 sleep 0.25
done
curl --silent --fail "http://127.0.0.1:${api_port}/health/live" >"$artifacts/live.json"
[[ $(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${api_port}/api/v2/me/context") == 401 ]]
after=$(docker exec "$container" psql -U hof_v2_user -d hof_v2_dev -Atc 'SELECT count(*) FROM accounts')
[[ "$before" == "$after" ]]
python3 - "$artifacts/ready.json" "$artifacts/live.json" <<'PY'
import json,sys
ready=json.load(open(sys.argv[1])); live=json.load(open(sys.argv[2]))
assert ready['status']=='ready' and ready['migration_version']==3
assert live['status']=='alive'
PY
kill -TERM "$server_pid"
wait "$server_pid"
server_pid=''
echo 'V2 CLI/API smoke passed: fresh startup is read-only, migrate/repeat/seed/repeat, restricted runtime, health, unauthenticated context, graceful shutdown.'
