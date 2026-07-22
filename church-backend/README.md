# HOF Church Ng — Backend

A modular-monolith Go backend: one server, one database, but every
ministry/ops feature lives in its own isolated module.

## Structure
```
cmd/server/main.go        <- the ONLY file that imports every module (wiring)
internal/
  contracts/               <- interfaces + shared types modules use to talk to each other
  platform/                <- shared infra: db, config, auth middleware, migration runner
  modules/
    auth/                  <- issues SSO tokens (login)
    membership/             <- example ministry module
    <your-module>/          <- add freely, see below
```

## The single sign-on model
- `internal/modules/auth` is the **only** place that issues a token (`/api/auth/login`).
- `internal/platform/middleware.RequireAuth` is the **only** place that verifies one.
  It needs just the shared JWT secret — not the auth module — so every other
  module can protect its routes without depending on auth internals.
- Any module reads "who's logged in" via `contracts.UserFromContext(ctx)`.
- Result: one login screen, one token, uniformly trusted across every
  ministry/ops feature, with zero module-to-module coupling.

## Adding a new ministry/ops module
```
make new-module NAME=events
```
Then in `cmd/server/main.go`:
1. Build it: `svc := events.NewService(events.NewRepository(pool))`
2. Register its migrations in the `migrate.Run([]migrate.ModuleMigrations{...})` list
3. Mount its routes, behind `requireAuth` if it needs login

If it needs data from another module (e.g. Events needing Membership),
define the read-only shape it needs in `internal/contracts/`, have the
owning module's service satisfy it, and pass that interface in — never
import the other module's package.

## Enforcement
`.golangci.yml` blocks any `internal/modules/x` from importing
`internal/modules/y` directly, so this stays true even as more
volunteers/devs join and own different modules. Run `make lint` in CI.

## Run locally
```
createdb hof_church
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/hof_church?sslmode=disable
make run
```
Migrations run automatically on startup, per module.
