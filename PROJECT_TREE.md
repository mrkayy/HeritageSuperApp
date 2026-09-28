# Heritage SuperApp — Project Folder Tree

> Generated: 2026-09-22  
> Branch: `feat/email-templates-and-notification-workflows`

---

## Root

```
HeritageSuperApp/
├── .github/
│   └── workflows/
│       └── staging-to-main.yml          # CI/CD: vet + build (Go + npm), promotes staging → main
├── .claude/
│   └── settings.local.json
├── AGENTS.md
├── BACKLOG.md
├── CLAUDE.md                            # Project instructions for Claude Code
├── GEMINI.md
├── Makefile                             # Orchestrates: make dev / make backend / make frontend / make build
├── PROJECT_TREE.md                      # This file
├── GHERKIN_STORIES.md                   # Feature specifications
├── product-analysis.md
├── skills-lock.json
├── workdone.md
├── church-backend/                      # Go backend (Gin + Ent + PostgreSQL 16)
└── web/                                 # React SPA (Vite + shadcn/ui + Tailwind)
```

---

## Backend — `church-backend/`

```
church-backend/
├── .air.toml                            # Air hot-reload config
├── .env                                 # Local environment variables (V2 configuration)
├── .env.example                         # Example environment variables
├── .golangci.yml                        # Lint rules
├── docker-compose.yml                   # PostgreSQL 16 isolated container (port 5433)
├── go.mod
├── go.sum
├── Makefile                             # Targets: make up, migrate, seed, run, dev, test, check
├── README.md                            # V2 backend setup and execution guide
│
├── api_docs/
│   └── v2/
│       └── openapi.yaml                 # V2 OpenAPI specification
│
├── cmd/
│   ├── server/                          # Canonical API HTTP server entry point (V2 runtime, port 8081)
│   │   └── main.go
│   ├── migrate/                         # Forward/backward migration CLI with checksums
│   │   └── main.go
│   └── seed/                            # Synthetic fixture seeder
│       └── main.go
│
├── scripts/
│   ├── check-v2-boundaries.py           # Import boundary & fixture leakage verification
│   ├── init-v2-dbs.sql                  # PostgreSQL initialization (roles: hof_v2_user, hof_v2_runtime)
│   ├── test-v2.sh                       # Disposable container integration test harness
│   └── smoke-v2.sh                      # Read-only boot, migration, seeding, and health smoke test
│
└── internal/
    └── v2/                              # V2 Modular Domain Architecture
        ├── api/                         # HTTP routing, middleware, request/response models
        │   ├── middleware.go
        │   ├── router.go
        │   └── api_test.go
        ├── authorization/               # Capability, ScopeLevel, SensitivityClass multi-dimensional checks
        ├── ent/                         # Ent ORM entity definitions and client
        │   └── schema/                  # Domain schemas (Person, Account, Affiliation, Grant, etc.)
        ├── fixtures/                    # Deterministic synthetic test fixtures
        ├── idempotency/                 # Request idempotency and conflict store
        ├── identity/                    # Session management, token hashing, auth contexts
        ├── migration/                   # Migration runner with SHA-256 integrity and advisory locking
        ├── migrations/                  # Versioned SQL migrations (000001 to 000003)
        ├── outbox/                      # Transactional outbox pattern & worker leasing
        ├── platform/                    # Shared clock, config, database, logging, UID utilities
        ├── testutil/                    # Test container and database helpers
        ├── uow/                         # Unit of Work transactional boundaries
        └── visitor/                     # Visitor intake, follow-up work item creation, account claim service
```

---

## Frontend — `web/`

```
web/
├── .env
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts                       # @/ alias → src/, @repo/dto → src/dto/index.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── components.json                      # shadcn/ui config (base color: slate, CSS vars)
├── eslint.config.js
│
└── src/
    ├── main.tsx                         # React entry point → renders <App /> into #root
    ├── App.tsx                          # Full route tree + provider stack
    ├── index.css                        # Global styles + Tailwind directives
    │
    ├── contexts/
    │   ├── AuthContext.tsx              # JWT + user state React context
    │   └── FeatureFlagContext.tsx       # Feature flags React context
    │
    ├── store/
    │   ├── authStore.ts                 # Zustand persisted auth (key: auth-storage)
    │   └── loadingState.ts             # Zustand loading state
    │
    ├── lib/
    │   ├── api.ts                       # Axios client with JWT interceptor
    │   ├── constants.ts                 # Shared constants
    │   ├── utils.ts                     # Utility functions (cn, etc.)
    │   └── schemas/                     # Zod validation schemas
    │       ├── index.ts
    │       ├── admin.ts
    │       ├── auth.ts
    │       ├── followup.ts
    │       ├── infocenter.ts
    │       ├── member.ts
    │       ├── soul.ts
    │       └── transport.ts
    │
    ├── hooks/
    │   ├── use-mobile.tsx
    │   ├── use-toast.ts
    │   ├── useCsvImport.ts
    │   ├── useInvites.ts
    │   ├── useMemberCRM.ts
    │   ├── useMemberDirectory.ts
    │   ├── useRegistrationData.ts
    │   ├── useSouls.ts
    │   ├── useVisitorCsvImport.ts
    │   └── useZodForm.tsx
    │
    ├── integrations/
    │   └── type_def.ts                  # Shared TypeScript type definitions
    │
    ├── dto/
    │   └── index.ts                     # Shared DTOs (aliased as @repo/dto)
    │
    ├── services/                         # API service classes (one per domain)
    │   ├── AuthenticationService.ts     # Login, register, Google OAuth, magic link, OTP claim
    │   ├── AdminBackOfficeServices.ts   # Admin panel: roles, user management
    │   ├── churchService.ts             # Church CRUD
    │   ├── featureFlagService.ts        # Feature flag read/toggle
    │   ├── followUpService.ts           # Follow-up records
    │   ├── generalOverseerService.ts    # General Overseer dossier data
    │   ├── infoCenterService.ts         # Info Center member directory + visitors
    │   ├── InviteService.ts             # OTP/leadership invite management
    │   ├── membershipService.ts         # Membership team CRM, bulk upload
    │   ├── profilingService.ts          # Visitor/member profiling queue
    │   ├── sectorService.ts             # Sector CRUD
    │   ├── soulService.ts               # Soul registration + journal
    │   ├── superAdminService.ts         # Super-admin: churches, settings, audit logs
    │   ├── systemSettingsService.ts     # Feature flags management
    │   ├── transportService.ts          # Transport requests
    │   └── UserService.ts               # User profile fetch/update
    │
    ├── pages/
    │   ├── Index.tsx                    # Root redirect
    │   ├── Forbidden.tsx
    │   ├── NotFound.tsx
    │   │
    │   ├── auth/
    │   │   ├── Login.tsx                # Standard login (email + password)
    │   │   ├── AdminLogin.tsx           # Admin-only login
    │   │   ├── Register.tsx             # New user registration
    │   │   ├── MagicLogin.tsx           # Magic link token handler
    │   │   └── ClaimAccount.tsx         # OTP account claim (unused/commented)
    │   │
    │   ├── Dashboard.tsx                # Main dashboard — aggregate stats
    │   ├── SoulRegistration.tsx         # New-convert registration form
    │   ├── SoulJournal.tsx              # Soul follow-up journal entries
    │   ├── FollowUp.tsx                 # Follow-up management (team leads)
    │   ├── MapView.tsx                  # Member/soul map (Leaflet, authenticated)
    │   ├── Transport.tsx                # Transport request tracker
    │   ├── Leaderboard.tsx              # Gamified outreach leaderboard
    │   ├── PublicMap.tsx                # Unauthenticated map view
    │   │
    │   ├── admin/
    │   │   ├── Admin.tsx                # Admin panel home
    │   │   ├── AdminManagement.tsx      # User role management
    │   │   ├── MemberInvites.tsx        # Invite management
    │   │   ├── FollowUpManagement.tsx   # Admin follow-up view
    │   │   ├── MemberAssignment.tsx     # Assign follow-up members
    │   │   ├── SuperAdmin.tsx           # Super-admin hub
    │   │   ├── SuperAdminChurches.tsx   # Church management
    │   │   ├── SuperAdminInvites.tsx    # Leadership invites
    │   │   ├── SuperAdminSettings.tsx   # Feature flag toggles
    │   │   ├── SuperAdminAuditLogs.tsx  # System audit logs
    │   │   ├── SuperAdminGuide.tsx      # Super-admin help guide
    │   │   ├── SuperAdminDenominations.tsx  # Denomination management (referenced, not routed)
    │   │   ├── GeneralOverseerDossier.tsx   # GO-level analytics dossier
    │   │   └── ExecutiveAnalytics.tsx       # Executive analytics dashboard
    │   │
    │   ├── teams/
    │   │   ├── MembershipDashboard.tsx      # Membership team home
    │   │   ├── MembershipTeamCRM.tsx        # Member directory CRM table
    │   │   ├── BirthdayTracker.tsx          # Birthday celebrations tracker
    │   │   ├── AnniversaryTracker.tsx       # Anniversary tracker
    │   │   ├── MemberJourney.tsx            # Member lifecycle/stage view
    │   │   ├── ProfilingQueue.tsx           # Profiling queue
    │   │   ├── MembershipTeamGuide.tsx      # Membership team help guide
    │   │   ├── InfoCenterDashboard.tsx      # Info Center home
    │   │   ├── InfoCenterMembers.tsx        # IC member directory
    │   │   ├── VisitorIntake.tsx            # New visitor registration form
    │   │   ├── AttendanceTracking.tsx       # Attendance sheet
    │   │   ├── FoundationCandidates.tsx     # Foundation class candidates
    │   │   └── InfoCenterGuide.tsx          # IC help guide
    │   │
    │   ├── membership/                      # Membership Suite (gated: allowedTeam="membership")
    │   │   ├── MakerCheckerQueue.tsx        # Approval workflow
    │   │   ├── FirstTimerCRM.tsx            # First-timer follow-up CRM
    │   │   ├── DiscipleshipAcademy.tsx      # Academy cohort management
    │   │   ├── VolunteerIntake.tsx          # Volunteer applications
    │   │   ├── CelebrationsLandmarks.tsx    # Member milestones/celebrations
    │   │   ├── SitRepPastoralLog.tsx        # Pastoral situation reports
    │   │   ├── VisitorProfilingQueue.tsx    # Visitor profiling
    │   │   └── InterBranchTransfers.tsx     # Member transfers between branches
    │   │
    │   └── legal/
    │       ├── TermsOfService.tsx
    │       └── PrivacyPolicy.tsx
    │
    └── components/
        │
        ├── auth/
        │   ├── ProtectedRoute.tsx           # Wraps routes requiring authentication
        │   ├── PublicRoute.tsx              # Redirects authenticated users away
        │   ├── FeatureFlagGate.tsx          # Renders children only if flag is ON
        │   ├── TeamRouteGate.tsx            # Renders children only if user is on allowed team
        │   ├── GuestRegistrationForm.tsx    # Guest/visitor self-registration form
        │   ├── MemberRegistrationForm.tsx   # Full member registration form
        │   ├── PhotoUpload.tsx              # Profile photo upload widget
        │   └── PinKeypad.tsx                # PIN entry keypad (magic login)
        │
        ├── admin/
        │   ├── CreateChurch.tsx
        │   ├── CreateSector.tsx
        │   ├── CreateTeam.tsx
        │   ├── InviteFormDialog.tsx
        │   ├── InviteTable.tsx
        │   ├── MemberDirectoryTable.tsx
        │   ├── MemberProfileDialog.tsx
        │   ├── RoleEditDialog.tsx
        │   └── UserRolesTable.tsx
        │
        ├── layout/
        │   ├── AppLayout.tsx                # Shell: sidebar + <Outlet />
        │   ├── AppSidebar.tsx               # Full navigation sidebar
        │   ├── CsvPreviewModal.tsx          # Member CSV preview modal
        │   ├── VisitorCsvPreviewModal.tsx   # Visitor CSV preview modal
        │   └── csv/
        │       ├── CsvPreviewTable.tsx
        │       ├── CsvResultSummary.tsx
        │       └── CsvUploadStep.tsx
        │
        ├── map/
        │   └── LeafletMap.tsx               # Interactive Leaflet map component
        │
        ├── souls/
        │   ├── SoulDetailsModal.tsx
        │   ├── SoulRegistrationForm.tsx
        │   └── SoulsList.tsx
        │
        ├── teams/
        │   ├── MemberCRMTable.tsx
        │   └── MemberFormDialog.tsx
        │
        ├── members/
        │   └── GuardianRelationshipModal.tsx
        │
        └── ui/                              # shadcn/ui primitives (Radix + Tailwind)
            ├── accordion.tsx
            ├── alert.tsx
            ├── avatar.tsx
            ├── badge.tsx
            ├── breadcrumb.tsx
            ├── button.tsx
            ├── calendar.tsx
            ├── card.tsx
            ├── carousel.tsx
            ├── chart.tsx
            ├── checkbox.tsx
            ├── collapsible.tsx
            ├── command.tsx
            ├── context-menu.tsx
            ├── dialog.tsx
            ├── drawer.tsx
            ├── dropdown-menu.tsx
            ├── form.tsx
            ├── hover-card.tsx
            ├── input-otp.tsx
            ├── input.tsx
            ├── label.tsx
            ├── menubar.tsx
            ├── navigation-menu.tsx
            ├── pagination.tsx
            ├── popover.tsx
            ├── progress.tsx
            ├── radio-group.tsx
            ├── resizable.tsx
            ├── scroll-area.tsx
            ├── select.tsx
            ├── separator.tsx
            ├── sheet.tsx
            ├── sidebar.tsx
            ├── skeleton.tsx
            ├── slider.tsx
            ├── sonner.tsx
            ├── switch.tsx
            ├── table.tsx
            ├── tabs.tsx
            ├── textarea.tsx
            ├── toast.tsx
            ├── toaster.tsx
            ├── toggle.tsx
            ├── toggle-group.tsx
            ├── tooltip.tsx
            └── use-toast.ts
```

---

## Role Hierarchy (highest → lowest)

| Role | Description |
|------|-------------|
| `super_admin` | Full system access, manages flags and churches |
| `church_admin` | Manages a specific church |
| `team_lead` | Leads a functional team |
| `resident_pastor` | Pastoral oversight |
| `steward` | Senior member with stewardship duties |
| `member` | Regular registered member |
| `first_timer` | First-time visitor who has been processed |
| `guest` | Unregistered / walk-in visitor |

## Feature Flags

| Flag Key | Gates |
|----------|-------|
| `feature_souls` | Soul registration + list |
| `feature_soul_journal` | Soul journal entries |
| `feature_followup` | Follow-up management |
| `feature_transport` | Transport requests |
| `feature_leaderboard` | Outreach leaderboard |
| `feature_admin_panel` | Admin panel |
| `feature_membership_team` | Membership team CRM |
| `feature_info_center` | Information Center |
