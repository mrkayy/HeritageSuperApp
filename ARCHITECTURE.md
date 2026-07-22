# HOF Church Ng — Platform Architecture & Onboarding Guide

This document is the single place to understand *why* this project is
built the way it is, before touching any code. Read this before your
first PR, whether you're building Membership, Giving, Events, Facilities,
or anything else.

---

## 1. What this project is

One web application that serves every ministry/team (Stewardship
department) and internal operations function of HOF Church Ng, built so
that:

- Different people/volunteers can build different features **independently**,
  without needing to understand the whole codebase or coordinate releases.
- Everything runs against **one shared database**, so data isn't siloed
  per team, but no module can accidentally break another module's data
  or logic.
- A user logs in **once** and moves between Membership, Giving, Events,
  etc. without re-authenticating anywhere.

Two repositories:

| Repo | Stack | Purpose |
|---|---|---|
| `church-backend` | Go | API, business logic, database access |
| `church-frontend` | React + TypeScript | UI |

They deploy and version independently but talk over a single REST API.

---

## 2. The core architecture pattern: modular monolith

This is **not** microservices. It's one backend deployable and one
frontend deployable, each internally sliced by feature ("module" on the
backend, "feature" on the frontend). Think of each module as its own
small app that happens to live in a shared house.

**The one rule that matters more than any other:**

> A module never imports another module directly. Ever. Not "just this
> once," not "it's a small thing." If module A needs something from
> module B, it goes through `internal/contracts` (backend) or
> `src/shared` (frontend).

This rule is enforced by tooling (see §6), not just code review, because
tooling doesn't get tired or make exceptions under deadline pressure.

### Why this matters practically
- You can be handed the Events module and ship it without reading
  Giving's code at all.
- A bug or bad migration in one module can't silently corrupt another
  module's tables or logic.
- Onboarding a new volunteer developer = "here's your module folder,
  here's the contracts you can use, go."

---

## 3. Repository layout

### Backend (`church-backend`)
```
cmd/server/main.go        <- THE ONLY file that imports every module (wiring/composition root)
internal/
  contracts/               <- shared interfaces + types modules use to talk to each other
  platform/                <- shared infrastructure, safe for any module to import
    config/                    env/config loading
    db/                         single shared Postgres connection pool
    middleware/                 SSO auth verification (see §4)
    migrate/                    runs every module's migrations against the one DB
  modules/
    auth/                    issues SSO tokens (login) — see §4
    membership/               example ministry module (reference implementation)
    <your-module>/            your new module goes here
```

### Frontend (`church-frontend`)
```
src/
  App.tsx, routes.tsx      <- THE ONLY files allowed to import more than one feature
  shared/
    auth/                     AuthContext (session state) + apiClient (attaches SSO token)
    components/               ProtectedRoute and other cross-feature UI
  features/
    auth/                     the one login screen
    membership/                example ministry feature (reference implementation)
    <your-feature>/            your new feature goes here
```

**Rule of thumb:** if you're about to write `import ... from
"../../features/otherThing"` or `import "internal/modules/otherModule"` —
stop. That need belongs in `contracts`/`shared`, wired at the composition
root, or it's a sign the two modules shouldn't be depending on each other
at all.

---

## 4. How single sign-on (SSO) works

There is exactly **one** login flow for the entire application, shared
by every ministry/ops module.

- `internal/modules/auth` is the **only** module that *issues* a JWT
  (`POST /api/auth/login`).
- `internal/platform/middleware.RequireAuth` is the **only** place that
  *verifies* a JWT. It only needs the shared JWT secret — it does **not**
  depend on the auth module. This is what lets every other module
  protect its own routes without importing auth internals.
- Once verified, the current user is attached to the request context as
  a `contracts.AuthedUser`. Any module reads it with:
  ```go
  user, ok := contracts.UserFromContext(r.Context())
  ```
- Role-based access (e.g. only Finance admins can see Giving reports)
  uses `contracts.AuthedUser.HasRole("finance_admin")` or the
  `middleware.RequireRole("finance_admin")` chain — modules never invent
  their own auth scheme.

On the frontend, the equivalent is:
- `features/auth/LoginPage.tsx` — the one login screen.
- `shared/auth/AuthContext.tsx` — holds the logged-in user; every
  feature reads it via `useAuth()`.
- `shared/auth/apiClient.ts` — attaches the token to every API call and
  redirects to `/login` automatically on a 401.
- `shared/components/ProtectedRoute.tsx` — wrap any page in this instead
  of writing a custom auth check.

**If you're building a new module and find yourself writing a login
check, a token, or a session cookie — stop.** That already exists
upstream; use it.

---

## 5. Database & migrations

- There is **one** Postgres database for the whole application.
- Each module owns its own `migrations/` folder
  (`internal/modules/<name>/migrations/*.up.sql`), versioned
  independently of every other module.
- `internal/platform/migrate` walks every registered module's migration
  folder at startup and applies any files not yet recorded in the shared
  `schema_migrations` tracking table (tracked per-module, so modules
  never collide or block each other).
- **You do not need write access to another module's tables.** If you
  need another module's data, ask for it through a `contracts` interface
  — don't query its tables directly, even though physically you could.
  Direct table access across modules re-creates the exact coupling this
  architecture exists to prevent.

---

## 6. Enforcement (this isn't just convention)

Two tools mechanically fail your build if module isolation is broken:

- **Backend:** `.golangci.yml` uses `depguard` to block any
  `internal/modules/x` package from importing `internal/modules/y`.
  Run `make lint`.
- **Frontend:** `.eslintrc.cjs` uses `eslint-plugin-boundaries` to block
  `src/features/x` from importing `src/features/y`. Run `npm run lint`.

If your PR fails one of these, the fix is almost always: move the
shared piece into `contracts/` or `shared/`, or wire the dependency at
the composition root (`main.go` / `routes.tsx`) instead of importing
directly.

---

## 7. Adding a new ministry/ops module — step by step

### Backend
```bash
make new-module NAME=events
```
This scaffolds `internal/modules/events/{handler,service,repository}.go`
and a `migrations/` folder. Then in `cmd/server/main.go` (the only file
you touch outside your own module folder):
1. Build it: `svc := events.NewService(events.NewRepository(pool))`
2. Add `events.Migrations` to the `migrate.Run([...])` list
3. Mount its routes, behind `requireAuth` if it needs a logged-in user

If Events needs data from Membership, define the shape it needs in
`internal/contracts/`, have `membership.Service` implement it, and pass
that interface into `events.NewService(...)` — Events never imports
`internal/modules/membership`.

### Frontend
1. `mkdir src/features/events`, add `api.ts` (calls your backend
   endpoints via `shared/auth/apiClient`) and a page component.
2. In `src/routes.tsx`, lazy-import the page and add a
   `<Route>` wrapped in `<ProtectedRoute>` (add `role="..."` if it's
   restricted).

Nothing inside any *other* feature folder changes.

---

## 8. Local development

```bash
# Backend
createdb hof_church
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/hof_church?sslmode=disable
cd church-backend && make run     # migrations run automatically on startup

# Frontend
cd church-frontend && npm install && npm run dev     # proxies /api to :8080
```

---

## 9. Conventions & expectations for contributors

- **One module, one owner (or one small team).** Use `CODEOWNERS` so
  PRs to your module folder auto-request the right reviewer.
- **Contracts are a shared API — treat changes to them carefully.**
  Unlike your own module's internals, editing `internal/contracts/` or
  `src/shared/` can affect every other module. Flag these changes for
  broader review.
- **No direct cross-module database queries**, even though the DB is
  physically shared — go through a contract.
- **New module = new folder + composition-root wiring only.** If a PR
  touches files outside the contributor's own module folder *and*
  outside `main.go`/`routes.tsx`, that's worth a second look.
- **Migrations are additive and versioned per module** — never edit a
  migration file that's already been applied; add a new one.
- **Auth is solved — don't re-solve it.** Use the shared middleware,
  context helpers, and frontend hooks described in §4.

---

## 10. Quick mental model

> Think of each module/feature as a small, independent app that shares a
> building (the database) and a front door (SSO). It has its own room,
> its own furniture, and its own lock — but it doesn't get to wander
> into another room and rearrange the furniture. If it needs something
> from another room, it asks at the front desk (`contracts`/`shared`),
> and the building manager (`main.go`/`routes.tsx`) hands it over.

---

## 11. Reference implementation

`internal/modules/membership` (backend) and `src/features/membership`
(frontend) are working, minimal examples of everything described above:
module isolation, SSO-protected routes, its own migration, and a
contract (`contracts.MembershipReader`) another future module could
depend on. When in doubt about how to structure a new module, copy its
shape.
