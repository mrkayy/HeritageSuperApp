# Work Done — Team Isolation & Role/Stage Differentiation

**Branch:** `feat/email-templates-and-notification-workflows`
**Scope:** Backend (Go/Ent) + Frontend (React/TypeScript)
**Total files changed:** 33 | +1,283 / -110 lines

---

## 1. Team Isolation — Backend

### Problem
The `/members` route was open to any `steward` role (overly permissive `requireAdminOrPastorOrLead` middleware). The `/info-center` route had **no role guard at all** — any authenticated user could call it. There was no concept of team-scoped API access.

### Changes

#### `internal/contracts/teams.go`
Added canonical team name constants used by both middleware and frontend:
```go
const (
    TeamInfoCenter = "information_center"
    TeamMembership = "membership"
    TeamTransport  = "transport"
)
```

#### `internal/platform/middleware/teams.go` *(new file)*
New `RequireTeamAccess(requiredTeam string)` middleware:
- Reads `teamName` from the JWT claim (already embedded at login)
- Executive roles (`super_admin`, `general_overseer`, `resident_pastor`, `church_admin`) bypass — they have cross-team oversight
- All other users must have `teamName` matching the required team exactly (case-insensitive)
- Returns `403 Forbidden` with a descriptive message if access is denied

#### `app/app.go`
- `/members` group: replaced `requireAdminOrPastorOrLead` (which let any `steward` through) with `RequireTeamAccess(contracts.TeamMembership)`
- `/info-center` group: added `RequireTeamAccess(contracts.TeamInfoCenter)` — previously had no role guard at all

---

## 2. Team Isolation — Frontend

### Problem
The sidebar showed **both** the Membership Team and Information Center sections to any user with `role = "steward"`. `steward` is a seniority tier, not a team identifier. Any worker could also navigate directly to another team's route via URL bar — `ProtectedRoute` only checked `isAuthenticated`, not team membership.

### Changes

#### `web/src/components/layout/AppSidebar.tsx`
Removed `userRoles.includes('steward')` and `userRoles.includes('team_lead')` from both `isMembershipMember` and `isInfoCenterMember` checks. Team visibility is now determined solely by `user.teamName` (from JWT) for non-executives:

```ts
// Before (broken — any steward saw both sections)
const isMembershipMember = isExecutive || userTeamName.includes('membership') || userRoles.includes('steward');
const isInfoCenterMember  = isExecutive || userTeamName.includes('info')       || userRoles.includes('steward');

// After (correct — team name drives visibility)
const isMembershipMember = isExecutive || userTeamName.includes('membership');
const isInfoCenterMember  = isExecutive || userTeamName.includes('info') || userTeamName.includes('information');
```

#### `web/src/components/auth/TeamRouteGate.tsx` *(new file)*
Route-level guard component. Wraps team-specific page routes:
- Reads `user.teamName` from `AuthContext`
- Executives bypass automatically
- Non-matching users are redirected to `/403` instead of silently loading the page
- Prevents direct URL navigation bypassing team isolation

#### `web/src/pages/Forbidden.tsx` *(new file)*
Clean 403 page displayed when `TeamRouteGate` denies access. Shows a descriptive message and "Return to Dashboard" button.

#### `web/src/App.tsx`
All 15 team-specific routes now wrapped with `TeamRouteGate`:
- **8 Membership routes** (`/teams/membership/*`, `/membership/*`) → `allowedTeam="membership"`
- **7 Information Center routes** (`/teams/info-center/*`) → `allowedTeam="information_center"`
- New `/403` route added for the Forbidden page

---

## 3. OtpInvites Schema — `team_id` Field

### Problem
When a Super Admin invited a worker, the invite had no way to carry a team assignment. The worker would complete onboarding with no `team_name` in their JWT, causing `TeamRouteGate` to block them from everything.

### Changes

#### `internal/ent/schema/otpinvites.go`
Added `team_id` UUID field (optional/nullable) and `team` edge.

#### `internal/ent/schema/team.go`
Added reverse `otp_invites` edge.

#### Ent code generation
Ran `go generate ./internal/ent/...` — all generated files updated (`mutation.go`, `otpinvites_create.go`, `otpinvites_query.go`, `otpinvites_update.go`, `migrate/schema.go`, etc.).

---

## 4. Invite → Onboarding Team Assignment (full pipeline)

### Problem
Even with `team_id` on the schema, the invite creation flow, sync functions, and magic link completion flow didn't propagate `team_id` to the `users` or `members` table.

### Changes

#### `internal/contracts/admin.go`
Added `TeamID *string \`json:"team_id,omitempty"\`` to `CreateLeadershipInviteDTO`.

#### `internal/modules/admin/repository.go`
- `CreateLeadershipInvite`: parses `input.TeamID`, calls `builder.SetTeamID(tid)`, passes `teamUUID` to sync function
- `syncLeadershipInviteToMemberAndUser`: signature extended with `teamID *uuid.UUID`; all four branches (member update, member create, user update, user create) now call `SetTeamID` when non-nil

#### `internal/modules/auth/repository.go`
- `CompleteMagicLinkOnboarding`: all four member/user create+update branches now call `SetTeamID` from `invite.TeamID`
- After saving the user record, re-fetches with `WithTeam()` so `mapEntUserToUser` captures `TeamName` — this means `TeamName` is correct in the JWT issued immediately on first login, without requiring a second login

#### `web/src/services/superAdminService.ts`
Added `team_id?: string` to `CreateLeadershipInvitePayload` interface.

#### `web/src/pages/admin/SuperAdminInvites.tsx`
- Added `TEAM_SCOPED_ROLES = ['team_lead', 'steward', 'member']` constant
- Added `team_lead` and `steward` to the leadership roles list
- New `formTeamId` state
- Loads teams list on mount alongside branches (parallel fetch)
- Team selector UI appears only when a team-scoped role is selected
- Validates that a team is selected before submit for team-scoped roles
- Sends `team_id` in the payload

---

## 5. Role vs Current Stage Differentiation

### Problem
The frontend had no concept of `current_stage` (the member's discipleship journey position). `role` (permission level) and `current_stage` (spiritual journey stage) were conflated — `role` was being used to imply both. The sidebar footer only showed `role`, giving workers no visibility into their journey stage.

### Design Principle Enforced
| Field | Lives on | Purpose | Controls |
|-------|----------|---------|---------|
| `role` / `roles` | `users` table | Permission level | What pages/APIs a user can access |
| `current_stage` | `members` table | Journey stage | Discipleship pipeline tracking only — never used for access control |

### Changes

#### `internal/contracts/auth.go`
Added `CurrentStage string \`json:"currentStage"\`` to `AuthedUser` struct, with a doc comment clarifying it is separate from permission roles.

#### `internal/modules/auth/repository.go`
New method `FindMemberStageByEmail(ctx, email) string` — queries the `members` table for `current_stage` by email, returns empty string if not found (handles users who have a `users` record but no `members` record, e.g. super admins).

#### `internal/modules/auth/handler.go`
`/auth/me` endpoint now calls `FindMemberStageByEmail` and includes `CurrentStage` in the response JSON, with an inline comment: *"CurrentStage is a discipleship journey tracker, not a permission concept."*

#### `web/src/store/authStore.ts`
Added `current_stage?: string` to the `User` interface, with doc comment distinguishing it from `role`.

#### `web/src/contexts/AuthContext.tsx`
- Added `currentStage?: string` to the exported `User` interface with the same doc comment
- `fetchCurrentUser` maps `data.currentStage` → `current_stage` in the store
- `mappedUser` maps `storeUser.current_stage` → `currentStage` in the context user object

#### `web/src/components/layout/AppSidebar.tsx`
Sidebar footer now shows both fields with distinct labels:
```
John Adeyemi
Role: steward          ← permission level (always shown)
Stage: sunday school module 2  ← journey progress (shown only when set, in primary colour)
```

---

## Summary of All New/Modified Files

### New Files
| File | Purpose |
|------|---------|
| `church-backend/internal/platform/middleware/teams.go` | `RequireTeamAccess` backend middleware |
| `web/src/components/auth/TeamRouteGate.tsx` | Frontend route-level team guard |
| `web/src/pages/Forbidden.tsx` | 403 page for denied team access |

### Modified Files
| File | What Changed |
|------|-------------|
| `church-backend/internal/contracts/teams.go` | Team name constants added |
| `church-backend/internal/contracts/auth.go` | `CurrentStage` added to `AuthedUser` |
| `church-backend/internal/contracts/admin.go` | `TeamID` added to invite DTO |
| `church-backend/internal/ent/schema/otpinvites.go` | `team_id` field + edge |
| `church-backend/internal/ent/schema/team.go` | Reverse `otp_invites` edge |
| `church-backend/internal/ent/` *(generated)* | Ent codegen output for schema changes |
| `church-backend/app/app.go` | Routes wired with `RequireTeamAccess` |
| `church-backend/internal/modules/admin/repository.go` | Team propagation in invite/sync flow |
| `church-backend/internal/modules/auth/handler.go` | `/me` returns `currentStage` |
| `church-backend/internal/modules/auth/repository.go` | `FindMemberStageByEmail` + team in onboarding |
| `web/src/App.tsx` | 15 routes wrapped with `TeamRouteGate`, `/403` added |
| `web/src/components/layout/AppSidebar.tsx` | Sidebar isolation fix + Role/Stage footer |
| `web/src/contexts/AuthContext.tsx` | `currentStage` added to user type + mapping |
| `web/src/store/authStore.ts` | `current_stage` added to persisted user |
| `web/src/pages/admin/SuperAdminInvites.tsx` | Team selector in invite form |
| `web/src/services/superAdminService.ts` | `team_id` in invite payload type |

---

## What Remains (Next Priorities)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | Security PIN Engine | High | Backend: `/auth/pin/set`, `/auth/pin/verify`, `/auth/pin/reset-request`. Frontend: numeric keypad overlay, lockout UI |
| 2 | Magic Link Onboarding Wizard | High | Current `/claim-account` is a single step. Needs 5-step wizard: verify → photo → PIN setup → Google link → done |
| 3 | Books & Merchandise Module | Medium | Zero implementation — needs full backend module + IC frontend pages |
| 4 | Announcements Hub | Medium | Zero implementation — needs backend module + IC + Member Dashboard widget |
| 5 | Inter-Branch Transfers verification | High | Page exists; needs backend atomic transfer logic confirmed end-to-end |
