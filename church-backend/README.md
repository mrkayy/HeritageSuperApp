# Heritage SuperApp — Backend (V2)

High-performance, modular monolith Go backend for Heritage SuperApp built on PostgreSQL 16, Ent ORM, and Gin.

---

## Architectural Principles

1. **Explicit Identity & Tenancy Hierarchy**:
   - `Person` (human identity) is canonical organization-wide.
   - `Account` (auth credentials/sessions) is linked to `Person`.
   - `ChurchAffiliation` (branch relationship) and `Assignment` (operational roles) are decoupled.
2. **Multi-Dimensional Authorization**:
   - Capability checks evaluate `(Capability, ScopeLevel, SensitivityClass)` in active assignment context.
3. **Transactional Outbox & Idempotency**:
   - Durable integration events committed atomically via `UnitOfWork` with worker leasing (`FOR UPDATE SKIP LOCKED`).
4. **Deterministic Migration & Role Separation**:
   - Versioned migrations with SHA-256 integrity checksums and Postgres advisory locks.
   - Schema mutations and migrations are executed solely by DB owner (`hof_v2_user`).
   - The runtime API server executes under restricted least-privilege credentials (`hof_v2_runtime`).

---

## Directory Layout

```
cmd/
  server/                 # Canonical HTTP server process (:8081)
  migrate/                # Forward/backward migration CLI
  seed/                   # Synthetic fixture seeder
internal/v2/
  api/                    # HTTP handlers, middleware, request/response models
  authorization/          # Multi-dimensional authorization engine
  ent/                    # Ent ORM schemas and generated models
  fixtures/               # Deterministic synthetic test fixtures
  idempotency/            # Request idempotency and conflict store
  identity/               # Session management and token hashing
  migration/              # Migration runner with checksum verification
  migrations/             # Versioned SQL migrations (000001_foundation, etc.)
  outbox/                 # Outbox leasing, worker dispatch, and consumer receipts
  platform/               # Platform utilities (config, logging, clock, db)
  testutil/               # Integration testing utilities
  uow/                    # Unit of Work transactional boundaries
  visitor/                # Visitor capture, work item creation, account claims
scripts/
  check-v2-boundaries.py  # Import boundary & fixture leakage verification
  init-v2-dbs.sql         # DB roles and development database initialization
  smoke-v2.sh             # Read-only boot, migration, seeding, and health smoke test
  test-v2.sh              # Disposable PostgreSQL container acceptance test harness
```

---

## Local Development & Execution

### 1. Start PostgreSQL 16 Database
```bash
make up
# or: docker compose up -d
```

### 2. Run Database Migrations
```bash
make migrate
# or: go run ./cmd/migrate up
```

### 3. Seed Development Fixtures *(Optional)*
```bash
make seed
# or: go run ./cmd/seed
```

### 4. Start the API Server
```bash
make run
# or: go run ./cmd/server
```

---

## Running Tests & Quality Verification

```bash
# Run unit tests
make test-unit

# Run full integration & acceptance test harness in disposable container
make test-integration

# Verify import boundaries & full build checks
make check
```

---

## Health Check Endpoints

- `GET /health/live` — Process liveness probe.
- `GET /health/ready` — Database connectivity and migration integrity readiness probe.
- `GET /api/v2/me/context` — Authenticated member/worker identity and capability context.
