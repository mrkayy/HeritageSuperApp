# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Full stack (backend + frontend concurrently)
make dev

# Backend only (from root)
make backend
# or from church-backend/:
make run          # go run
make dev          # Air hot-reload

# Frontend only (from root)
make frontend
# or from web/:
npm run dev       # Vite dev server on :5173, proxies /api to :8080

# Install all deps
make install

# Build production artifacts
make build

# Lint
cd church-backend && make lint    # golangci-lint (enforces module isolation)
cd web && npm run lint            # eslint --max-warnings 0

# Scaffold a new backend module
cd church-backend && make new-module NAME=events
# Then wire it in cmd/server/main.go (build, register routes, contract checks)
```

## Architecture

**Two-project repo**: Go backend (`church-backend/`) + React SPA (`web/`), orchestrated by a root Makefile.

### Backend — Modular Monolith (Go + Echo + Ent)

Every feature is an isolated module under `internal/modules/`. Modules **cannot import each other** — this is enforced by `golangci-lint` via `.golangci.yml` depguard rules. Cross-module communication goes through `internal/contracts/` interfaces, wired together **only** in `cmd/server/main.go`.

Each module follows handler → service → repository layering.

**Key directories:**
- `cmd/server/main.go` — sole wiring point; the only file that imports all modules
- `internal/contracts/` — shared interfaces and DTOs for cross-module deps
- `internal/platform/` — shared infra: config, db connection, middleware (auth, roles, feature flags, logging)
- `internal/modules/` — isolated feature modules (auth, membership, souls, followup, transport, teams, featureflags, profile, dashboard)
- `internal/ent/schema/` — Ent ORM schema definitions (code-generated entity framework)

**Adding a new module:** `make new-module NAME=<name>`, then add ~4 lines in `main.go`: build the service, register routes (behind `requireAuth`), add compile-time contract checks. If it needs data from another module, define the interface in `contracts/`, have the owning module satisfy it, and pass it in.

**Auth model:** Single SSO — `auth` module issues JWTs, `platform/middleware.RequireAuth` verifies them. Other modules read the logged-in user via `contracts.UserFromContext(ctx)`. No module depends on auth internals.

**Roles** (highest → lowest): `super_admin`, `church_admin`, `team_lead`, `resident_pastor`, `steward`, `member`, `first_timer`, `guest`

**Database:** PostgreSQL 16. Ent auto-migrates on startup (`client.Schema.Create`). Seed data (default admin, churches, sectors, teams, feature flags) runs on boot via `internal/platform/db/`.

### Frontend — React + Vite + shadcn/ui

- **Path alias:** `@/` → `./src/`, `@repo/dto` → `./src/dto/index.ts`
- **Provider stack:** `QueryClientProvider` → `AuthProvider` → `FeatureFlagProvider` → `TooltipProvider` → `BrowserRouter`
- **State:** Zustand (persisted auth in `auth-storage` localStorage key) + React Context (runtime auth, feature flags)
- **API layer:** Axios client in `src/lib/` with JWT interceptor; service classes in `src/services/` per domain
- **UI primitives:** shadcn/ui (Radix + Tailwind), configured via `components.json` (base color: slate, CSS variables, default style)
- **Feature gating:** `<FeatureFlagGate flagKey="...">` wraps routes in `App.tsx`; backend uses `middleware.RequireFeature(svc, "flag_name")`

### Feature Flags

Database-backed flags gate features on both sides. Backend: `middleware.RequireFeature` on route groups. Frontend: `FeatureFlagGate` component + `FeatureFlagContext`. Super admins toggle flags at `/super-admin/settings`.

## Environment Variables

**Backend** (`church-backend/.env`): `PORT`, `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`

**Frontend** (`web/.env`): `VITE_API_BASE_URL` (defaults to `/api`, proxied to `:8080` in dev)

## Deployment

**Backend (Vercel Serverless):** Set root directory to `church-backend/` in Vercel project settings. The `api/index.go` handler wraps the full Echo app as a single serverless function. All requests are routed to it via `vercel.json` rewrites. Set env vars (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, Google OAuth vars) in the Vercel dashboard.

**App wiring:** `internal/app/app.go` is the sole wiring point — both `cmd/server/main.go` (local dev) and `api/index.go` (Vercel) call `app.New()`.

## CI/CD

Push to `staging` triggers `.github/workflows/staging-to-main.yml`: runs `go vet` + `go build`, then `npm ci` + `npm run build`, then promotes staging → main.
