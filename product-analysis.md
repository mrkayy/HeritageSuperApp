# Heritage SuperApp — Product & Technical Analysis

> Comprehensive breakdown of project intent, architecture, strengths, weaknesses, and critical issues.

---

## What This Project Is

A **church management "super app"** for **God's Heritage of Faith Church (HOF Church)**, branded as "Heritage MMC" (Member Management Console) / "Soul Bank." It is a full-stack platform that digitizes church operations across multiple ministry teams:

- **Member directory & journey tracking** — a 9-stage pipeline from first-time guest to resident pastor
- **Soul/Evangelism management** — GPS-tagged outreach contacts with follow-up assignments and journals
- **Transport coordination** — scheduling pickups for new converts
- **Team & sector management** — hierarchical org structure (districts > churches > sectors > teams)
- **Kids ministry** — guardian relationships, check-in codes, allergy tracking
- **Feature flags** — admins can enable/disable entire modules at runtime
- **OTP-based onboarding** — controlled invite flow where members must be pre-profiled before they can register
- **CSV bulk import** — batch member ingestion with inline preview editing
- **Leaderboard & dashboard** — outreach targets and admin analytics

The app serves **7 church locations** across Nigeria, the UK, and beyond, with role-based access for super admins, church admins, resident pastors, team leads, stewards, and members.

---

## Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Frontend      | React 18, TypeScript, Vite 6, Tailwind CSS 3, shadcn/ui (Radix)  |
| State         | Zustand (persisted auth), React Context, TanStack React Query (installed but unused) |
| Backend       | Go 1.25, Echo v4, Ent ORM                                        |
| Database      | PostgreSQL 16 (Alpine)                                            |
| Auth          | JWT (HS256, 24h expiry) + Google OAuth (via Goth)                 |
| Infra         | Docker multi-stage builds, Nginx reverse proxy, GitHub Actions CI |
| Charts        | Recharts                                                          |
| Maps          | Leaflet / react-leaflet                                           |
| Forms         | react-hook-form + Zod (partial adoption)                          |

---

## Architecture Overview

### Backend: Modular Monolith

A single Go binary where each domain feature lives in an isolated module under `internal/modules/`:

```
church-backend/
  cmd/server/main.go              -- Composition root (wires all modules)
  internal/
    contracts/                     -- Cross-module interfaces (the ONLY allowed import between modules)
    modules/
      auth/                        -- Login, Google OAuth, JWT issuance
      membership/                  -- Member CRUD, CSV import, stage management
      souls/                       -- Soul registration, journals
      followup/                    -- Follow-up task management
      transport/                   -- Transport request coordination
      teams/                       -- Teams, sectors, churches CRUD
      profile/                     -- User profile, kids ministry
      dashboard/                   -- Admin dashboard aggregations
      featureflags/                -- Feature flag management
    platform/
      config/                      -- Environment configuration loader
      db/                          -- Database connection, migrations, seed data
      middleware/                  -- Auth, logging, feature flag middleware
    ent/                           -- Ent ORM generated code + 21 schemas
```

Module isolation is **enforced at build time** via golangci-lint's depguard rules. Compile-time contract verification in `main.go` ensures services satisfy their interfaces (`var _ contracts.XReader = xSvc`).

Each module follows a consistent **Handler > Service > Repository** layering with constructor-based dependency injection.

### Frontend: Single-Page Application

```
web/src/
  components/
    admin/          -- CreateChurch, CreateSector, CreateTeam
    auth/           -- FeatureFlagGate, ProtectedRoute, PublicRoute
    layout/         -- AppLayout, AppSidebar, CsvPreviewModal
    map/            -- LeafletMap
    members/        -- GuardianRelationshipModal
    ui/             -- ~45 shadcn/ui primitives
  contexts/         -- AuthContext, FeatureFlagContext
  pages/
    admin/          -- Admin panel, management, invites
    auth/           -- Login, AdminLogin, Register
    teams/          -- Membership CRM, birthdays, anniversaries, journey
  services/         -- 11 API service files (Axios-based)
  store/            -- Zustand stores (auth, loading)
```

### Database: 21 Entities

**Core:** User, Member, Soul, SoulJournal, FollowUp, TransportRequest
**Organizational:** LocalChurch, Sector, Team, Districts
**Junction:** MemberTeam, UserTeam, UserSector, ChurchTeams, TeamVolunteers
**Ministry:** GuardianRelationship, KidsMinistryProfile, MembershipStageHistory, ChurchEvent
**System:** FeatureFlag, OtpInvites, OutreachReport, OutreachTargets

---

## The Good

### 1. Solid Backend Architecture

The modular monolith design is genuinely well-engineered. Modules communicate exclusively through interfaces in `internal/contracts/`, enforced at build time by golangci-lint's depguard rules. Cross-module imports are literally a linter error. This is a level of architectural discipline rarely seen in projects of this size.

### 2. Consistent Layering

Every module follows the same **Handler > Service > Repository** pattern with constructor-based dependency injection. Once you've read one module, you know the structure of all of them. The composition root in `main.go` is the only place that wires dependencies together.

### 3. No SQL Injection Risk

All database access goes through Ent's type-safe query builder. There is zero raw SQL in the entire codebase.

### 4. Modern, Well-Chosen Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 6 + shadcn/ui + Tailwind is a modern, fast, well-supported stack with excellent DX
- **Backend**: Go + Echo + Ent ORM is performant, type-safe, and produces a single static binary
- **State**: Zustand (persisted) + React Context is lightweight and appropriate for the app's complexity

### 5. Feature Flag System

A proper database-backed feature flag system with role-based access. Admins can toggle entire modules on/off at runtime without redeployment. The frontend uses `<FeatureFlagGate>` components to conditionally render features, with "inactive module" cards for disabled features.

### 6. Production-Ready Infrastructure

- Multi-stage Docker builds for both frontend and backend
- Non-root user in the backend container
- Nginx with gzip compression and security headers (X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, Referrer-Policy)
- SPA fallback routing configured correctly
- CI/CD pipeline that auto-promotes staging to main after checks pass

### 7. Sensitive Field Redaction in Logs

The request logger middleware sanitizes `password`, `password_hash`, and `token` fields from request body logs. Shows security awareness in the logging layer.

### 8. Idempotent Database Seeding

Seed logic checks for existence before creating records, so it won't duplicate data on server restarts. Seeds include 7 church locations, 5 sectors, 16 teams, and 8 feature flags.

### 9. Comprehensive Domain Modeling

The 9-stage member journey pipeline (first_time_guest through resident_pastor), guardian relationships, kids ministry profiles, outreach GPS tracking, and transport coordination show deep understanding of the church operations domain.

---

## The Bad

### 1. Zero Meaningful Test Coverage

The entire project has:
- **Backend**: 1 test file with 4 shallow unit tests (input validation checks with `nil` repos in `souls/service_test.go`)
- **Frontend**: 0 test files. No test runner configured. No `test` script in `package.json`.

For an app managing real church member data, transport logistics, and children's ministry profiles, this is a serious reliability gap. Any refactor or feature addition is done without a safety net.

### 2. TypeScript `strict: false` with 285+ Compiler Errors

The frontend runs with TypeScript strict mode disabled, and `tsc_errors.txt` tracks **285 lines of unresolved errors**: unused imports, implicit `any` types, possibly-undefined access, and variables used before declaration. The type system is effectively a suggestion, not a safety net.

### 3. React Query Installed But Never Used

TanStack React Query v5 is in the dependencies and `QueryClientProvider` wraps the entire app, but **not a single component uses `useQuery` or `useMutation`**. All data fetching is done with raw `useState` + `useEffect` + direct service calls. This means:
- No request caching
- No request deduplication
- No background refetching
- No optimistic updates
- Manual loading/error state management everywhere

### 4. Inconsistent Form Handling

`react-hook-form` + `zod` is installed and used in exactly **1 out of ~15 forms** (the registration page). Every other form uses raw `useState` per field with manual `if (!field)` validation. The registration page even redundantly calls `schema.parse()` inside the submit handler despite already using `zodResolver`.

### 5. Monolithic Page Components

Several page components are massive monoliths mixing form logic, API calls, state management, and UI:

| File                     | Lines |
| ------------------------ | ----- |
| `MemberInvites.tsx`      | 930   |
| `MembershipTeamCRM.tsx`  | 677   |
| `SuperAdminInvites.tsx`  | 616   |
| `CsvPreviewModal.tsx`    | 613   |
| `Register.tsx`           | 600   |
| `SoulRegistration.tsx`   | 588   |

No custom hooks for data fetching, no container/presenter separation, no component extraction.

### 6. Ad-Hoc Backend Validation

No validation library is used in the backend. Validation is scattered `if field == ""` checks in handlers and services. No email format validation, no phone number format validation, no input length limits, no XSS sanitization. The Member schema marks `first_name` and `surname` as `Optional().Default("")`, allowing empty strings at the database level despite handlers requiring non-empty values.

### 7. Internal Errors Leaked to API Consumers

Handler error responses often pass raw `err.Error()` directly to the client. This means Ent/PostgreSQL error messages (including table names, constraint names, and query details) can leak to the frontend, exposing internal implementation details.

### 8. No Token Refresh Mechanism

JWT tokens expire after 24 hours with no refresh token flow. When the token expires, the 401 interceptor silently logs the user out and redirects to `/login`. For a daily-use church app, this forces re-authentication every day.

### 9. User/Member Dual-Record Pattern

`User` (authentication) and `Member` (directory) are separate entities joined only by email. Changes must be manually synced between them, and the code does this inconsistently across multiple repositories. This is a maintenance footgun that will cause data drift.

### 10. Code Duplication

- `mapEntMemberToContract` (~100 lines) is copy-pasted between `membership/repository.go` and `profile/repository.go`
- `MEMBERSHIP_STAGES` and `MONTHS` arrays are duplicated between frontend components
- Nullable field handling patterns (~50 lines of if/else) are repeated verbatim across multiple backend repositories

### 11. Naming Inconsistencies

- Frontend services mix class-based static methods (`AuthenticationService`, `MembershipService`) with object-literal exports (`soulService`, `followUpService`)
- File names mix PascalCase (`AuthenticationService.ts`) with camelCase (`soulService.ts`)
- The `User` interface is defined in three different places with different field names (snake_case vs camelCase)

### 12. Orphaned Dependencies and Configuration

- `@repo/dto` Vite alias points to `./src/dto/index.ts` which doesn't exist
- `@repo/eslint-config/react-internal` referenced in ESLint config doesn't resolve
- `@vitejs/plugin-react-swc` is in devDependencies but the config uses `@vitejs/plugin-react` (Babel)
- Two toast systems (`@radix-ui/react-toast` and `sonner`) are both mounted in `App.tsx`

---

## The Ugly

### 1. Hardcoded Default Admin Credentials in Source Code

In `internal/platform/db/db.go`, the seed data creates an admin account with `admin@hofchurch.org` / `Password123@`. This runs on every startup with **no mechanism to force a password change**. Anyone reading the source code knows the production admin login.

### 2. Weak JWT Secret with Unsafe Fallback

`internal/platform/config/config.go` hardcodes a default JWT secret of `"dev-secret-change-me"`. If the `.env` is missing in production, this weak default **silently takes effect** with no warning or startup failure. The actual `.env` value (`"myHertage-superapp"`) is also weak and guessable. There is no validation that critical configuration values are non-default before the server starts.

### 3. JWT Token Passed in URL Query Parameter

The Google OAuth callback redirects to `frontend/login?token=<JWT>`. Tokens in URLs are:
- Stored in browser history
- Logged by web servers, proxies, and CDNs
- Sent in `Referer` headers to third parties
- Visible in server access logs

This is a well-known OWASP anti-pattern for token handling.

### 4. Response Body Logging Includes Tokens

The logger middleware logs **full response bodies**, meaning JWT tokens returned from login endpoints are written to `app.log` and stdout in plaintext. The field redaction only covers request bodies, not responses. The JWT secret is also reused as the Goth session cookie secret, meaning a compromise of one key compromises both systems.

### 5. `super_admin` Role Cannot Exist in the Database

The User Ent schema defines role values as: `church_admin, team_lead, resident_pastor, steward, member, first_timer, guest`. But `contracts.Role` defines `super_admin` as a valid role, and the frontend gates features behind it. The `super_admin` role **cannot be stored** via the ORM because it's not in the schema enum. Any code checking for `super_admin` (middleware, frontend sidebar, admin pages) will never match a real database user.

### 6. No CORS, No Rate Limiting, No CSRF Protection

The backend has:
- **No CORS middleware** — in production, cross-origin requests either fail silently or are uncontrolled
- **No rate limiting** on any endpoint, including login — brute-force attacks are unrestricted
- **No CSRF protection** — the cookie-based session store (used for OAuth) has no CSRF tokens

### 7. Architecture Violations Within the Codebase

Despite the clean modular architecture, there are places where handlers bypass the layering:
- Membership handler line 297 accesses `h.svc.repo.db.User.Get(...)` — handler reaches through service, through repository, into the raw database client
- Profile handler's `listUsers` similarly reaches through `h.svc.repo.db.Member.Query()` directly
- The dashboard module takes the raw `*ent.Client` directly, bypassing the service/repository pattern entirely

### 8. `console.log` with Typos in Production Code

- `Register.tsx` line 96: `console.log('LOAING_STATE:: '+ loading)` (typo: "LOAING")
- `AuthenticationService.ts`: `console.log('Guest registration response::')`
- Debug logging shipped to production with no log-level gating

### 9. Frontend Role-Based Access is UI-Only

Role-based authorization on the frontend is enforced at the **component level** only (checking `user?.role` inline), not at the route level. The admin page at `/admin` checks the role and renders "Access Denied" text, but the route itself is accessible to any authenticated user. A motivated user could bypass UI-level guards. Backend route protection via `RequireRole` middleware exists but is not applied consistently to all sensitive endpoints.

### 10. Lovable.dev Scaffolding Artifacts

The `lovable-tagger` dev dependency and orphaned `@repo/*` path aliases indicate the frontend was **AI-scaffolded via Lovable.dev** and carries dead configuration from that tool that was never cleaned up.

---

## Risk Assessment Summary

| Dimension          | Grade | Notes                                                                 |
| ------------------ | ----- | --------------------------------------------------------------------- |
| **Architecture**   | B+    | Well-designed modular monolith with enforced boundaries               |
| **Code Quality**   | C     | Inconsistent patterns, large monolithic components, duplication       |
| **Security**       | D     | Hardcoded secrets, token-in-URL, no rate limiting, no CORS            |
| **Testing**        | F     | Effectively zero test coverage across the entire stack                |
| **Type Safety**    | D     | strict: false, 285+ errors, `any` types scattered throughout         |
| **DevOps/Infra**   | B     | Docker, CI/CD, Nginx — solid production setup                        |
| **Domain Modeling** | B-   | Comprehensive schema, but User/Member split is problematic            |
| **Frontend UX**    | C-    | No React Query usage, raw state management, no error boundaries       |

---

## Recommended Priority Actions

1. **Fix the security holes** — rotate JWT secret to a strong random value, add CORS middleware, add rate limiting on auth endpoints, move OAuth token to HTTP-only cookie or POST body, stop logging response bodies containing tokens.
2. **Add `super_admin` to the User Ent schema** — or remove it from the contracts and frontend. The current mismatch means the role literally cannot work.
3. **Enable TypeScript strict mode** and fix the 285+ errors incrementally. Start with `noImplicitAny: true`.
4. **Adopt React Query for data fetching** — it's already installed. Replace `useState`/`useEffect` patterns with `useQuery`/`useMutation` for caching, deduplication, and automatic error/loading states.
5. **Add integration tests** for critical paths: login, member CRUD, CSV import, OAuth flow.
6. **Extract shared code** — deduplicate `mapEntMemberToContract`, create shared form components, consolidate the User interface definition.
7. **Break up monolithic page components** — extract custom hooks for data fetching, separate container logic from presentation.

---

> Analysis generated on 2026-08-30. Based on the current state of the `feat/teams-module` branch.
