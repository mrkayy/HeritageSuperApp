# Heritage V2 — Master Architecture

Version: 1.0 • Prepared: 2026-09-22 • Status: rebuild design baseline, not an implementation-completion claim.

Companion: [Master Gherkin Stories](master-gherkin-stories.md). This document defines how the application is built. The companion defines what it must do and how each behavior is accepted. Stable feature IDs connect both documents. All features remain unverified for V2 until their acceptance evidence exists.

## 1. Authority, scope, and evidence

The baseline covers Heritage MMC and Soul Bank: people, accounts, branches, departments, membership, discipleship, pastoral care, evangelism, transport, children, inventory, communications, reporting, administration, migration, and the complete web experience. Implementation proceeds incrementally but no listed domain is silently omitted. QR intake remains V3-planned, as in the source backlog; it is specified here so later implementation has an explicit contract. Native mobile applications, payment processing, accounting ledgers, and HSOM/MIT curricula are not defined by the supplied requirements and are not invented as completed features.

Source precedence for the target design: the user's explicit requests; recorded decisions in `clarity.md`; these masters' compatible implementation decisions; non-conflicting backlog and system requirements. The older Gherkin and analysis files describe historical claims, not authoritative test results. Open leadership choices in clarity §19 remain open. Defaults below are engineering proposals for implementation, clearly distinguished from settled church policy. No embedded instruction to reset data or perform deployments authorizes doing so merely because these documents are read.

### Current-state observations

Repository inspected: `/Users/mac/Desktop/HeritageSuperApp`. `church-backend/go.mod` declares Go 1.25 and Gin, Ent and PostgreSQL driver dependencies. `web/package.json` declares React 18, Vite 6, TypeScript, Tailwind 3, shadcn-related primitives, React Hook Form, Zod, Zustand and Axios. It currently has build and lint scripts but no test script. TanStack Query is not in that package manifest; the historical analysis's installed-library claim must not be repeated as current fact.

`church-backend/app/app.go` wires a modular monolith, CORS middleware, team gates, feature flags, and `/api` routes. Thirty-eight schema files exist. `web/src/App.tsx` contains a registration route and a commented claim-account route. Handler registration includes academy grading, transfers, invitations and other operations; endpoint presence alone does not establish correct functionality. No runtime, database, security, or deployment audit is claimed by this document.

### Superseded requirements

| Legacy statement | V2 replacement |
|---|---|
| Visitor converts into another human record | Same Person gains verified data, affiliation status and optional Account |
| Phone/email equality proves identity | Candidate match only; reviewed linkage and reversible provenance |
| Public registration or unlinked OAuth creates trusted member | Intake is public when enabled; account access requires verified linkage |
| Broad executive role bypass | Explicit capability, resource scope and sensitivity grants |
| Combine all roles with widest scope | Evaluate each grant with its own assignment and resource context |
| Transfer migrates historical church foreign keys or resets journey | Change current affiliation; preserve record origin and achievements |
| Completed task automatically advances member | Domain command validates evidence and owns transition |
| Email template/schema/page means complete | Verified API + UI + authorization + failure-path acceptance evidence |
| Person search exposes every linked record | Separate discoverability, projection, record category and field permissions |
| Former caller permanently retains full record access | Preserve work history; current access is separately authorized |
| Attendance unique by date only | Unique by Person and service occurrence; date is a reporting attribute |

## 2. Product invariants and glossary

1. Person is organization-scoped and may have no Account. Provisional duplicates are permitted; careless automatic merges are not.
2. Contact points are not globally unique human identifiers. Account authentication identifiers have separate constraints.
3. Membership status and journey achievements never directly grant operational permissions.
4. Each grant retains capability, scope, originating assignment, validity and sensitivity policy. Unrelated scopes cannot widen one another.
5. Branch visibility is explicit even though identity is shared across an organization. Every operational record preserves its originating context.
6. Transfers never rewrite historical church, original actor or original time. Amendments retain provenance.
7. Journey survives branch transfer. Recognition supplements history without erasing achievements.
8. Domain records own outcomes. Tasks, notifications, dashboards and exports are derived views or coordination records.
9. Durable events are committed with source changes; consumers tolerate replay.
10. Family relationships do not imply account control, consent or pickup authority.
11. Permission to discover a Person does not grant access to pastoral, child, security or other restricted data.
12. Account claiming requires verified Person linkage plus authentication-channel control. Recovery and replacement preserve Person identity.
13. Authoritative data migration requires mapping, reconciliation and rehearsed rollback. Temporary development-reset freedom does not extend to production data.
14. A feature flag enables availability, never authority. An enabled feature still requires a valid grant.
15. Every screen, API, export, background job and notification uses the same authorization semantics.

| Term | Meaning and owner |
|---|---|
| Person | Human record inside one Organization; People owns identity and merge provenance |
| Account | Authentication principal linked to a Person; Identity owns credentials and sessions |
| ContactPoint | Phone/email with type, normalized value, verification, shared flag and validity; People |
| Affiliation | Dated relationship with a Branch, independent of account and appointment; People |
| MembershipStatus | Recognized standing attached to affiliation; Membership |
| Journey | Organization-level progression for a Person under a pipeline; Journey |
| Achievement | Versioned evidence of completion, with origin branch; Journey |
| Assignment | Dated operational appointment to organization/branch/team/sector/cohort; Access |
| Role | Named template for capability grants, not a universal hierarchy; Access |
| Capability | Specific operation, such as `membership.profile.approve`; Access |
| Scope | Resource predicate tied to a grant: SELF, ASSIGNED, TEAM, SECTOR, CHURCH, ORGANIZATION, PLATFORM |
| Team | Branch operational unit (Choir, Membership, Information Center, etc.); Organization |
| Ministry | Optional organizational classification of teams/programs, not an additional permission shortcut |
| Sector | Geographic pastoral grouping within a branch; Organization |
| District | Optional grouping of branches retained from legacy data; no implicit access inheritance |
| Program / Module | Versioned teaching curriculum and unit; Academy |
| Cohort / Session | Scheduled delivery of a module and individual class occurrence; Academy |
| Enrollment | Person's attempt in a cohort; supports retakes without overwriting earlier results |
| WorkItem | Assigned action referencing a domain subject and action contract; Work |
| Event | Versioned occurrence published by a domain; not a replacement for its records |
| SensitiveRecord | Record with independently enforced category/field policy |
| GuardianAuthority | Verified, scoped permission to act for another Person, separate from kinship |

## 3. Decisions, defaults, and release gates

### Settled through clarity.md

Organization-level identity; provisional capture; scoped assignments; separate membership standing; organization-level journey; durable events; category-based sensitivity; explicit guardian authority; controlled claims; migration before destructive replacement; visitor-to-claim first slice.

### Proposed engineering defaults

- ContactPoint is the source of truth; a Person's primary contact is a reference, not a second mutable copy.
- At most one active human Account per Person per organization for initial V2; replacement accounts remain historical. Multiple verified login methods attach to that Account. Initial onboarding PIN configuration is delivered in phase 1 with claims; quick-unlock/device biometrics are phase 2. Service principals are separate and cannot masquerade as members.
- One active primary affiliation per Person per organization initially. Secondary active affiliations remain disabled pending leadership policy, while visits to another branch do not require a transfer.
- Member baseline grants authorize self-service profile requests, own journey, classes, announcements, own outreach and transport. These are explicit SELF grants attached to an active account/affiliation policy, not ministry assignments. Operational grants still require appointments.
- Membership status starts with `visitor`, `attendee`, `candidate`, `member`, `steward`, `inactive_member`, as a configurable catalog. Publication of the final catalog needs leadership acceptance; no code assumes enum ordering.
- Unknown sensitive-data permissions deny access. An organization executive or technical administrator does not automatically receive pastoral content.
- Authenticated outreach maps use scoped records; public maps use approved coarse aggregates with no individual pins or names. Public map publication stays disabled until its disclosure policy is accepted.
- Urgent pastoral notifications carry a minimal alert and authenticated link, not full clinical or counseling notes.
- Maker and checker must be different human actors, even if one actor holds multiple assignments.
- Former callers can retain a redacted history of their own work while active in an authorized role; live progress and contact access require an explicit continuing grant.

### Policy gate register

| Gate | Unresolved choice | Implementation treatment |
|---|---|---|
| P01 | Final membership vocabulary | Configurable catalog; no automatic standing change from profiling |
| P02 | Exceptional concurrent affiliations | Single-primary constraint; reject enabling exceptions until approved |
| P03 | GO pastoral-confidential visibility | No default confidential grant; explicit policy required |
| P04 | Super Admin member-sensitive visibility | Technical administration only by default |
| P05 | Child field-level policy and pickup exceptions | Restricted projections; no launch of unsupported exception path |
| P06 | Cross-branch curriculum equivalence | Manual authorized recognition; no inferred equivalence |
| P07 | Production datasets and cutover window | Inventory and rehearsal required before production migration |
| P08 | Public map granularity and minimum group size | Publication disabled until configured and accepted |
| P09 | Retention, outreach contact preferences, bulletin publication and continuing caller access | Conservative access; configure named owner and approved rules before release |

Engineering choices such as queue library and exact outbox implementation do not require new product decisions. Policy gates block affected release paths, not documentation or independent implementation. Changing a default requires a dated decision and changes to both masters.

## 4. Runtime and code organization

Use the existing Go/Gin modular monolith, Ent and PostgreSQL. Keep the React/Vite web application. Avoid a framework rewrite or microservices as a prerequisite. Use explicit migrations, not uncontrolled production startup schema mutation.

```text
church-backend/
  app/                         composition root, routes and dependency wiring
  cmd/server/                  HTTP process
  cmd/worker/                  durable jobs/outbox/schedulers
  internal/contracts/          narrow domain interfaces and event contracts
  internal/modules/
    identity/ access/ organization/ people/ membership/ journey/
    academy/ care/ outreach/ transport/ kids/ inventory/ communications/
    work/ reporting/ governance/
      handler.go               HTTP parsing and response translation
      service.go               authorization, business rules, transactions
      repository.go            context-scoped persistence
      events.go                published/consumed contracts where needed
  internal/platform/           database, clock, IDs, jobs, files, telemetry
  internal/ent/schema/          persistence schemas; ownership follows domain
web/src/
  app/                         router, providers, workspace shell
  features/<domain>/           screens, forms, hooks, service adapters
  components/ui/               accessible reusable primitives
  api/                         generated API types/client and error mapping
  access/                      capability manifest and UI guards
```

Move existing modules incrementally; these are target boundaries, not a demand to rename everything before delivering behavior. Contracts must not expose Ent entities. Handlers never reach through services to raw database clients. Repository scope is mandatory, including joins, counts and aggregates. Cross-domain commands use interfaces wired at the composition root. A shared PostgreSQL transaction may cover tightly coupled invariants through a UnitOfWork contract; eventual work uses the outbox. No module may write another module's tables through ad hoc queries.

HTTP and worker deployments share versioned code but run independently. A serverless HTTP entry point must not host an in-process scheduler whose lifetime cannot be guaranteed. Local development can run API and worker together under an explicit command.

## 5. Persistence contract and domain boundaries

All mutable records have UUID IDs, timestamps, a row version and lifecycle state. Every tenant-owned row has `organization_id`; branch operations also have `church_id`. Enforce matching organization IDs across references using composite constraints or transactional validation where Ent cannot express the constraint. UTC timestamps represent instants; Branch stores an IANA timezone for service dates, reminders and reports. Money uses integer minor units plus currency. Partial birthdays store month/day without fabricating a birth year.

| Domain | Core records and required constraints |
|---|---|
| Organization | Organization, District, Branch, Sector, Team, Ministry, BranchSettings; unique slug in organization; every team/sector belongs to its branch; archive preserves history |
| Identity | Account, AuthMethod, Session, Invitation, RecoveryCase; active Account uniqueness per Person default; provider issuer+subject unique; hashed single-use purpose-bound tokens; atomic claim consumption |
| Access | Assignment, RoleTemplate, CapabilityGrant, Delegation, BaselineGrant, PolicyVersion; grants cannot exceed delegator scope/expiry; revoke invalidates descendants |
| People | Person, ContactPoint, Address, IdentityEvidence, PotentialDuplicate, MergeOperation, LegacyRecordMap, PersonRelationship, Household, Affiliation; cross-org merge forbidden; no merge cycles; one primary affiliation default |
| Membership | ProfileChangeRequest, ProfileVerification, StandingChange, FollowUpAssignment, CallLog, Landmark; maker differs from checker; approved changes bind base row version; note category enforced |
| Journey | Journey, PipelineVersion, Stage, RuleVersion, Eligibility, Recommendation, Achievement, Transition, Recognition, Override; unique organization/person/pipeline journey; evidence and rule version required |
| Academy | Program, Module, Cohort, Session, Enrollment, Attendance, AssessmentRevision; unique active enrollment per person/cohort; numeric bounds; preserve multiple attempts |
| Care | CareCase/SituationReport, CareAction, Escalation, Amendment; confidential category and explicit recipient access; urgency is not an access override |
| Outreach | OutreachContact, OutreachActivity, SpiritualDecision, JournalEntry, OutreachTarget, OutreachReport; references Person; activity counts differ from unique people reached |
| Transport | TransportRequest, Trip, Vehicle, DriverAssignment, PassengerAllocation; valid transitions and capacity constraints; no double allocation of same request |
| Kids | ChildProfile, GuardianAuthority, CheckIn, PickupAuthorization, PickupEvent; active authority and occurrence-specific code; one open check-in per child/session |
| Inventory | Item, StockMovement, Sale, SaleLine, PaymentEvidence, Reversal; non-negative available stock; snapshots of price/currency; reference upload is evidence, not bank verification |
| Communications | Announcement, BulletinSubmission, TemplateVersion, Notification, DeliveryAttempt, ContactPreference; audience scope; expiry; logical-send uniqueness |
| Work | WorkItem, AssignmentHistory, DomainOutbox, ConsumerReceipt, ScheduledJob; unique logical task key; leased jobs; per-consumer event uniqueness |
| Reporting | ProjectionCheckpoint, ExportJob, ReportSnapshot; scope and policy version recorded; exports have expiry and authorization at download |
| Governance | FeatureFlag, BranchFlagOverride, SettingsVersion, AuditEvent, RetentionJob, MigrationRun; revisioned changes and restricted audit metadata |

### Identity resolution and merge

Normalize phone with explicit country context; preserve original input. Normalize emails conservatively; do not assume provider-specific equivalence. Matching signals produce a candidate explanation, never a final identity assertion. Shared contacts and uncertain dates lower confidence. Branch workers see local candidates only. A central reviewer with `identity.duplicate.review` at organization scope sees cross-branch candidates; the local worker receives a generic review-pending response, not hidden identity details.

Merge is a transaction locking both identities in stable order. Check organization, account conflicts, affiliation conflicts and contradictory evidence. Save source snapshots, reference movement ledger, field selection and actor/reason. Redirect old IDs to the canonical Person for authorized callers; preserve original-subject provenance on historical records. Do not automatically merge two active Accounts. Account conflict requires a recovery review. Unmerge uses the ledger; newly created downstream facts with ambiguous ownership create a correction case rather than arbitrary reassignment. Replaying a merge request cannot move records twice.

### Account and contact distinction

A shared email/phone may belong to multiple ContactPoints but cannot silently choose among Accounts. Initial V2 requires an independently verified login method for each independently controlled Account; a shared notification contact remains valid. Staff can complete directory verification without activating digital access. No-email and shared-contact users remain supported as People. Invitations bind organization, Person, purpose, destination, invitation version, expiry and proposed assignment when applicable. Legacy OTP invitation entry, if retained during migration, verifies the same purpose-bound Invitation through an attempt-limited challenge; OTP possession alone cannot bypass verified Person linkage. New invitations use the canonical magic-link flow. Resend revokes previous claim tokens. Acceptance consumes the token and links the Account in one transaction. Leadership appointment is independently audited and cannot be inferred from an invitation URL.

## 6. Authorization, sessions and sensitive data

API request context contains authenticated account, Person, organization, chosen workspace/assignment, policy version and correlation ID. Browser-provided church/team IDs are requested context, never proof of access. Resolve current assignments server-side on each request or through a short-lived, version-invalidated cache. Revocation must take effect on the next authorization check, including an existing session. For writes, persist the assignment/grant used. Read aggregation may use a union of independently valid grants, never a capability from one with the scope of another. A workspace switch changes UI context; it cannot mint authority.

Decision: active Account and session AND feature availability AND one applicable grant AND matching organization/resource scope AND sensitivity/field policy AND domain rules. Default deny. Unrelated out-of-scope resource IDs return a non-enumerating 404; an in-scope denied action returns 403. Bulk requests validate every row, and atomic commands do not partially mutate on authorization failure.

| Actor/context | Allowed baseline | Explicit boundary |
|---|---|---|
| Ordinary member | SELF profile change request/photo, journey, enrollment view, own outreach, own transport | No department authority from standing |
| Information Center worker | Branch visitor capture, scoped directory projection, service attendance, recommendations | No Membership approval or pastoral history |
| Membership caller | Assigned follow-up contacts and permitted notes | No team-wide directory or hidden prayer notes by default |
| Membership lead | Team queue, allocation, profile approvals | Cannot approve own edits; transfer approval separate |
| Choir lead + Membership caller | Choir roster under Choir assignment; assigned calls under Membership assignment | Choir scope never expands Membership access |
| Academy teacher | Assigned cohort students, attendance and assessments | No general member medical notes |
| Sector lead | Assigned sector roster, cell attendance, permitted care actions | No other sector by title alone |
| Resident Pastor | Explicit branch oversight/read grants, authorized care | No other branch or unrestricted platform control |
| Church Admin | Branch configuration and operational appointments | No implicit confidential care access |
| General Overseer | Organization search, approved reporting projections | P03 controls confidential records |
| Super Admin | Platform/organization provisioning, technical governance | P04 controls ministry-sensitive records |
| Inbound transfer reviewer | Transfer-specific approved preview | No unrestricted source-branch history |
| Guardian | Subject/action-specific verified authority | Kinship alone grants nothing |
| Worker process | Narrow service-principal command permissions | Cannot use technical status to bypass sensitivity |

Sensitivity classes are GENERAL, MINISTRY_INTERNAL, PASTORAL_CONFIDENTIAL, CHILD_SAFEGUARDING, EXECUTIVE_RESTRICTED, SECURITY_RESTRICTED. They are categories, not a simple ordinal clearance ladder. Define policy per category/action/projection. Data classification also applies to free-text notes, CSVs, emails, map popups, audit diffs, search snippets and exports. GENERAL is still authenticated unless explicitly published. Sensitive reads, exports and overrides are audited without copying confidential bodies to generic audit logs.

### Authentication mechanics

Use secure HttpOnly session cookies for the web application; do not persist bearer credentials in localStorage. Store only non-secret UI preferences there. Server stores session identifiers hashed, supports idle and absolute expiry, rotation and revocation. Cookie-authenticated mutations require CSRF validation and origin checks. Production CORS uses an explicit allowlist; no arbitrary origin reflection. Password authentication for existing eligible accounts remains supported; hashes use a reviewed adaptive password-hashing implementation. Login, claim, PIN and recovery endpoints have shared-store throttling and non-enumerating public responses.

OAuth verifies state, nonce where applicable, redirect allowlist, issuer and provider subject; provider email equality alone does not relink a Person. A pre-profiled user must finish the authorized claim/linking process. Never return a reusable access token in a redirect URL. Magic links contain only short-lived, purpose-bound single-use tokens; GET renders a confirmation page, POST consumes the token so mail scanners do not activate accounts. Remove token-bearing URLs from history after exchange and exclude them from logs/referrers.

PIN is a quick unlock bound to an already enrolled device/session, not an independent remote login or substitute for stronger verification on high-impact account changes. Default lockout: five failures, fifteen minutes. Recovery revokes compromised sessions and tokens. Optional biometrics use platform authenticator/WebAuthn verification; no raw biometric templates are collected. Unsupported devices have an accessible fallback. Production secrets are external configuration, no default admin password or fallback signing key, and startup fails on missing required secrets.

## 7. API conventions and first-slice contract

Target API prefix: `/api/v2`. Existing `/api` routes are legacy and must be explicitly mapped or retired during rollout. Organization paths begin `/organizations/{org}` and branch paths add `/churches/{church}`. The feature catalog below gives suffixes relative to those prefixes; `/auth`, `/me` and `/platform` are explicitly root-relative.

JSON uses snake_case, UTC ISO timestamps, stable enums/catalog keys and cursor pagination (`limit`, `cursor`, bounded filters and sort). Standard errors: `{code, message, field_errors, request_id}`; no raw SQL or stack traces. Statuses: 201 create, 200 read/command result, 202 durable asynchronous work, 400 malformed, 401 unauthenticated, 403 denied, 404 unavailable, 409 stale version/state conflict/idempotency mismatch, 422 domain validation, 429 throttled. Mutations accept `Idempotency-Key` for retriable creation and command operations, and `If-Match`/expected version for updates. Reused keys with a changed body return 409. OpenAPI is generated/versioned alongside handlers and generates TypeScript request/response types.

| First-slice operation | Contract and transaction | Frontend outcome |
|---|---|---|
| POST branch `/visitor-captures` | name/contact or missing-contact reason, service_occurrence_id, optional inviter, separated restricted prayer note, source; returns person_id, visit_id, verification state, version; Person+affiliation+visit+outbox atomic | Mobile/tablet intake success then explicit next-visitor action; save failures preserve input |
| GET branch `/identity-candidates` | Normalized match query; returns only authorized masked candidate summaries and match reasons; rate-limited | Candidate review, existing-person selection or justified separate-person capture |
| POST branch `/service-occurrences/{id}/attendance` | person_id, capture source; unique occurrence/person, idempotent | Already-present message on retry; no counter inflation |
| GET branch `/membership/followups` | Paginated server-scoped unassigned/team/my queue | Distinguish first-visit welcome and Foundation recommendation |
| POST branch `/membership/followup-assignments` | subject IDs, assignee assignment, due_at, expected versions; validate branch and workload eligibility | Lead allocation; caller receives only permitted projection |
| POST branch `/membership/followups/{id}/outcomes` | contacted/unreachable/declined/rescheduled, category-filtered notes, next_action_at | Record attempt without falsely claiming successful contact |
| POST branch `/profile-change-requests` | person_id, base_version, typed proposed changes | Diff review; no live master update |
| POST branch `/profile-change-requests/{id}/approve` | Distinct checker, current grant, unchanged base version | Conflict returns new diff; approved update audited |
| POST branch `/people/{id}/verifications` | evidence references and verification scope; records authorized verification independently from membership standing | Profile verified badge; optional invite action |
| POST branch `/people/{id}/claim-invitations` | verified Person, eligible unique authentication method, purpose, policy expiry | Invitation status; delivery pending is not claim success |
| POST root `/auth/claims/complete` | token, channel challenge where required, identity confirmation, credential setup; consume+link+activate atomically | Photo/PIN/provider setup progress then personal dashboard |

Initial capture emits welcome-follow-up work immediately. Repeated attendance evaluates Foundation eligibility separately; an authorized recommendation creates distinct Foundation work. The first slice does not require a completed academy implementation. Caller completion records a domain outcome; enrollment or transition cannot be fabricated by closing a task.

## 8. Journey and academy rules

A Person has a Journey per organization/pipeline. Default membership pipeline: first_timer → returning_visitor → foundation_class → sunday_school_module_1 → sunday_school_module_2 → sunday_school_module_3 → membership_class → steward → leadership. The last two are milestone/standing labels, never permissions; reaching leadership requires an explicit church-defined milestone/override, not a team-lead appointment. The journey UI separately shows eligible-next-stage, enrolled stage, completed milestones and membership standing; it must not imply enrollment merely because a prerequisite passed.

| Transition | Evidence and decision maker | Execution |
|---|---|---|
| First to returning visitor | Second distinct qualifying service occurrence | Automatic evidence-based update under branch counting policy |
| Foundation eligibility | Default two qualifying visits; versioned branch override | Eligibility only; no enrollment or account creation |
| Foundation recommendation | Eligible visitor; authorized IC worker note | Recommendation + Membership task |
| Start Foundation | Accepted recommendation or recorded exemption; cohort enrollment | Academy command with Journey validation |
| Complete each module | Final assessment and required attendance/makeup evidence | Teacher records; authorized graduation command certifies and unlocks next stage |
| Module 2 completion | Recognized achievement | Create volunteer preference work once |
| Membership Class completion | Recognized completion | Record Steward milestone/standing under approved policy; full-service appointment changes separately audited |
| Leadership | Approved church milestone criteria or reasoned authorized override | Never inferred from a UI role selection |

Six assessment components: assignment 20, verbal 20, participation 20, discipler report 20, proof of notes 10, attendance 10; pass total ≥50. Six scheduled sessions; attendance at ≤3 requires retake. At 4–5 sessions, coordinator records whether makeup is required and resolves it before graduation. Attendance component proposal: round-half-up to one decimal of `10 * credited_sessions / 6`; final total uses stored decimal arithmetic, not frontend floating point. Credited makeup is explicit evidence, cannot double-count a session and cannot erase a retake-required decision without an authorized override. This resolves the legacy “<50% (≤3/6)” inconsistency by following its explicit count rule.

Retakes create new enrollments. Regrades create revisions and may require an audited correction of dependent achievements; no silent cascade deletion. Concurrent programs have separate enrollment/achievement state. Published rule versions are immutable; cohorts pin a rule version. Later rule changes do not retroactively fail completed students. Receiving branches record accepted/equivalent/supplementary/disputed recognition without replacing origin achievements. HSOM/MIT remain external-program references until curricula are supplied.

## 9. Full backend-to-frontend feature catalog

Each row maps directly to a Gherkin feature ID. “P” means organization scope, “B” branch scope and “R” root API. Command endpoints listed here define the required API surface; ordinary list/detail endpoints use the same resource names. Every endpoint inherits sections 5–7; every screen inherits section 10. Names are target contracts, not claims that they already exist.

| ID / feature | Owner, data and backend/API contract | Frontend workflow | Phase |
|---|---|---|---|
| HOF-001 Sign-in/session | Identity; R POST `/auth/login`, `/auth/logout`, GET `/auth/session`, DELETE `/auth/sessions/{id}`; password and revocation rules | Login/admin entry, session expiry, device/session list | 1 |
| HOF-002 Claim/onboarding | Identity/People; B invitations; R POST `/auth/claims/complete`, `/auth/magic-links/request`, `/auth/magic-links/exchange`; purpose-bound tokens | Claim, welcome, identity confirmation, photo, PIN, optional provider link, completion | 1 |
| HOF-003 OAuth | Identity; R GET `/auth/oauth/google/start`, `/callback`; POST `/auth/methods/link`, DELETE method | Google sign-in/link/unlink, unprofiled guidance, collision error | 1 |
| HOF-004 PIN/device | Identity; R POST `/auth/device-enrollments`, `/auth/pin/verify`, `/auth/webauthn/challenge`, `/verify` | Lock overlay, attempts feedback, biometric fallback | 2 |
| HOF-005 Recovery/suspension | Identity; R POST `/auth/recovery-requests`; P recovery-case review, account suspend/replace | Recovery status, mistaken-claim report, admin review without exposed credentials | 1 |
| HOF-006 Branch structure | Organization; P districts/branches CRUD/archive, B sectors/teams/ministry catalogs, settings | Branch directory, create/edit/archive, geographic sectors and ministry structure | 1/3 |
| HOF-007 Leadership appointments | Access/Identity; P leadership-invitations create/resend/revoke; assignment reassignment transaction | Leadership directory, branch appointments, pending invitations | 2 |
| HOF-008 Grants/delegation | Access; P role-templates, B assignments, delegations, revoke; no scope escalation | Permission matrix, assistant toggles, expiry, audit | 1/2 |
| HOF-009 Workspace shell | Access; R GET `/me/workspaces`, POST `/me/workspace-context` | Personal, IC, Membership, Academy, Team, Sector, Pastoral, Transport, Executive, Platform workspaces | 1 |
| HOF-010 Canonical identity | People; B visitor-captures; P people/detail, evidence, contacts/addresses/households | Person dossier with scoped tabs, provisional/verified states | 1 |
| HOF-011 Duplicate resolution | People; B identity-candidates, P duplicate-cases review/merge/unmerge | Masked suggestions, separate-person option, reviewer diff, correction case | 1 |
| HOF-012 Directory/import | People; B people list; import-jobs upload/preview/commit/results; P limited cross-branch search | Search/filter/pagination, CSV preview edit, errors download, result counts | 1/2 |
| HOF-013 Visitor intake | People/Membership; B visitor-captures, invite-source references, initial work | Intake wizard, optional email, missing-contact path, restricted prayer note | 1 |
| HOF-014 Service attendance | People/Organization; B service-occurrences and attendance commands/history/corrections | Current service, mark present, repeat visits, absence filters | 1 |
| HOF-015 Foundation handoff | Journey; B eligibility query, recommendations create/withdraw, linked work | Eligible list, note, recommend, handoff status visible to both teams via projections | 1 |
| HOF-016 Follow-up CRM | Membership; B followup-assignments, outcomes, reassignment, weekly-digests | Lead allocation, my calls, outcome forms, SMS action, overdue/history and pastor summary | 1 |
| HOF-017 Profile governance | Membership; B profile-change-requests, approve/reject, verifications, incomplete-profile queue | Missing-field work, diff, conflict feedback, verified profile and invite action | 1 |
| HOF-018 Membership/journey | Membership/Journey; B standing-changes, P journeys/history/overrides | Separate standing and journey, evidence timeline, override reason form | 2 |
| HOF-019 Programs/cohorts | Academy; B programs/modules/cohorts/sessions/enrollments and teacher assignments | Cohort list, timetable, roster, enroll/withdraw, teacher and student views | 2 |
| HOF-020 Assessments/graduation | Academy/Journey; B assessment revisions, attendance, makeup, graduate, retake | Six-part gradebook, totals, attendance warnings, graduation preview/result | 2 |
| HOF-021 Volunteer placement | Membership/Access; B volunteer-applications, placements, probation review | Own ranked preferences, placement queue, receiving lead notification | 2 |
| HOF-022 Celebrations/landmarks | Membership/Communications; B celebrations, landmarks, publication requests | Day/month birthdays, anniversary calendar, three-day alerts, milestones, celebrate/log contact | 2 |
| HOF-023 Pastoral care | Care; B care-cases, actions, escalation/acknowledge, amendments | Confidential timeline, categorized SitRep, urgent alert, follow-up closure | 2 |
| HOF-024 Branch transfers | People/Journey/Access; B transfers initiate/inbound/review/accept/cancel; P recognition | Origin request, minimal inbound preview, clarification/reject/accept, sector selection, history | 3 |
| HOF-025 Outreach capture | Outreach/People; B outreach-contacts/activities/decisions, optional transport request | Soul registration on mobile, GPS/manual location, decisions and own list | 3 |
| HOF-026 Soul journals/follow-up | Outreach; B outreach-journals, followup-assignments/outcomes | Journal timeline, spiritual decisions, next-contact tasks, personal history | 3 |
| HOF-027 Maps | Reporting/Outreach; B `/maps/outreach`; R `/public/organizations/{slug}/map` approved aggregate only | Scoped map, filters, accessible list alternative, published coarse map | 3 |
| HOF-028 Outreach targets/reports | Outreach/Reporting; B outreach-targets, outreach-reports, leaderboard | Goals, reports, verification state, personal/team rank and date filters | 3 |
| HOF-029 Transport | Transport; B requests/trips/vehicles/driver-assignments/allocations and state commands | Own request/status; coordinator queue, capacity/route planning, pickup roster, completion | 3 |
| HOF-030 Family/guardians | People/Kids; B relationships, households, guardian-authorities verify/revoke | Relationship editor, authority evidence, expiry, permitted dependent view | 3 |
| HOF-031 Kids check-in/pickup | Kids; B child-profiles, sessions, checkins, pickup-authorizations/verify | Restricted roster, allergy projection, check-in code, verified release, incident workflow | 3 |
| HOF-032 Inventory/sales | Inventory; B items, stock-movements, sales, payment-evidence, reversals | Catalog/variants, stock alerts, transfer-only sale, evidence upload, history | 4 |
| HOF-033 Announcements | Communications; B announcements draft/publish/archive, R `/me/announcements` | Editor, audience/schedule, presenter bulletin, member carousel/list | 4 |
| HOF-034 Events | Organization/Communications; B events, registrations, occurrences, reminders | Event list/calendar, signup, capacity/waitlist where configured, attendance and cancellation | 4 |
| HOF-035 Communications | Communications; B messages/notification-jobs, P templates, delivery-status; R `/me/preferences` | Email/SMS preview, recipients, delivery status, notification inbox, preferences | 1–4 |
| HOF-036 Dashboards/dossier | Reporting; R `/me/dashboard`, B dashboards, P dossiers with projections | Personal/team/pastor/executive views, scoped lifetime tabs and freshness indicator | 2–4 |
| HOF-037 Analytics/exports | Reporting; B/P analytics, export-jobs/status/download | Date/branch filters, conversion/retention, PDF/CSV export history and expiry | 4 |
| HOF-038 Flags/settings | Governance; P feature-flags/overrides/settings/role-templates; B settings | Global/branch matrix, localization, rule defaults, security/channel configuration | 1–4 |
| HOF-039 Audit/diagnostics | Governance; P audit-events, R `/platform/health` restricted detail, failed-jobs | Filtered audit viewer, health/queue status, redacted metadata, retries | 1 |
| HOF-040 Work/notifications | Work; B work-items list/assign/action; R `/me/notifications` read/ack | Today, due/overdue queues, domain-linked actions, deduplicated alerts | 1 |
| HOF-041 Personal/help | People/Identity; R `/me/profile`, photo upload, profile requests, help content | Profile, my journey/classes/teams/souls, accessible guides, legal pages, 403/404 | 1–4 |
| HOF-042 QR intake | People; R `/public/welcome/{branch_slug}` and intake submissions; abuse controls | Public mobile questionnaire, branch confirmation, submission receipt | V3 |
| HOF-043 Privacy/files | Governance/Files; P access/retention requests, controlled attachment upload/download | Preferences, access/correction request, restricted attachment previews | 1–4 |
| HOF-044 Migration/cutover | Governance; CLI migration inventory/plan/dry-run/reconcile/activate/rollback | Restricted run report and unresolved mapping queue; maintenance notice | 0–4 |
| HOF-045 Quality/release | Platform; CI, health/readiness, configuration validation, monitoring | Responsive/accessibility states, release verification across all workspaces | Every phase |
| HOF-046 Donation receipt compatibility | Communications; B receipt-records create/reverse/send with external reference | Authorized external-donation receipt preview/history; own receipt view | 4 |
| HOF-047 Generic team operations | Organization/Access/Work; B teams/{id}/roster, duty-schedules, duty-attendance, tasks and reports | Reusable Choir/Ushers/Media/Protocol roster, schedule, duty attendance and team tasks | 3 |
| HOF-048 Sector/cell ministry | Organization/Care; B sectors/{id}/roster, cell-meetings, attendance and care-actions | Geographic member directory, cell meeting attendance, scoped pastoral view | 3 |

Donation receipts are included because the source explicitly contains that notification scenario/template. This is a record-and-receipt boundary only: no giving checkout, payment collection, tax treatment, general ledger, or inferred “My Giving” product. Future finance requirements require a separate decision.

## 10. Frontend implementation contract

Use React Router with lazy feature routes and a shared workspace shell. Keep capability evaluation authoritative in the backend; the frontend receives an allowed-actions projection to hide unavailable navigation and explain denied actions. Fetch scoped data only after workspace resolution. Switching workspace cancels in-flight requests and clears/invalidate caches keyed by organization, branch, assignment, sensitivity projection and entity. Do not briefly show prior workspace data.

Use a typed server-state query layer (adding TanStack Query is a proposed dependency change, not an existing fact). Zustand is limited to non-secret UI state. Forms use React Hook Form + Zod mirroring server constraints; server validation remains authoritative. One toast/notification system. Shared components include PersonPicker with scope, ServicePicker, EvidenceTimeline, ChangeDiff, PermissionMatrix, WorkQueue, FileUploader, DateRange and responsive tables.

Every screen must implement loading, empty, no-results, validation, conflict, denied, expired-session, network-failure and success states. Mutation failures preserve entered data; retries reuse idempotency keys. No optimistic success for approvals, claims, transfers, graduation, stock sales or child pickup. A disconnected device may retain an in-memory form but must not claim server persistence; offline synchronization is not part of V2 without a separate design.

Keyboard navigation, focus restoration after dialogs, labeled fields, readable errors, non-color-only statuses and screen-reader announcements are required. Validate intake and field outreach at 360px mobile width, tablet and desktop; tables have usable compact views. Child/pastoral screens avoid confidential content in browser titles and notifications. Photos are member-controlled by default; authorized child-specific workflows follow guardian policy. Lazy map code must offer a text list and graceful location-permission denial.

Personal navigation: Home, Journey, Classes, Teams, Souls, Transport, Announcements, Profile. Operational workspaces expose only permitted work: IC capture/attendance/recommendations; Membership inflow/calls/profiles/placements/celebrations; Academy cohorts/gradebook; Team roster/duty/tasks; Sector cell attendance/care; Pastoral cases; Transport dispatch; Executive reports; Platform settings/audit. Generic ministry scheduling uses service/event occurrences and team assignments, avoiding one bespoke schema per department.

## 11. Events, tasks, communications and reporting

Outbox row and source mutation commit together. Envelope: event_id, type, schema_version, organization_id, church_id if applicable, aggregate_id/version, occurred_at, correlation_id, causation_id and minimal payload. Do not broadcast confidential free text. Consumers record `(consumer_name,event_id)` in the same transaction as derived changes. Ordering-sensitive consumers check aggregate versions and defer gaps. Workers use expiring leases, bounded exponential retry, failure queues, alerts and replay tooling. At-least-once delivery is assumed. External-provider sends use a logical delivery key; ambiguous provider responses enter reconciliation, not blind unlimited resend.

| Event | Consumers and durable consequences |
|---|---|
| VisitorCaptured | Membership welcome task; reporting inflow projection |
| AttendanceRecorded/Corrected | Journey eligibility reevaluation; reporting correction |
| FoundationRecommended | Membership Foundation task and in-app notification |
| ProfileChangeApproved / PersonVerified | Queue resolution; claim eligibility projection |
| ClaimInvitationIssued / AccountClaimed | Email delivery; activation audit and personal setup |
| FollowUpOutcomeRecorded | Next-contact scheduling and weekly pastor digest |
| EnrollmentGraduated | Journey achievement; next eligibility; Module 2 placement work |
| AssignmentChanged/Revoked | Permission cache invalidation, workspace update, delegated grant revocation |
| SitRepEscalated | Minimal urgent recipient notification and acknowledgment task |
| TransferAccepted | Affiliation change already atomic; recognition work and projections |
| OutreachContactCaptured | Optional transport request coordination with duplicate protection |
| BirthdayUpcoming / AnnouncementPublished | Scoped reminder/feed updates using local-date keys |
| SaleRecorded/Reversed | Stock already updated atomically; reporting and optional receipt |

WorkItem states: open, assigned, in_progress, blocked, completed, cancelled. A task's action invokes its owning domain command; completion records domain result reference. Domain completion and work update are atomic when in the same transaction, or reconciled through a durable event. Reopening an item does not undo a domain outcome. A logical key prevents duplicate tasks for the same trigger and purpose.

Communications separate requested, queued, provider_accepted, delivered, failed, cancelled and unknown states. Provider acceptance is not delivery. Store template version, authorized audience snapshot, actor, contact preference decision and provider reference. Recheck recipient validity and permissions before sending sensitive links. Cancel pending work when an invitation is revoked or its context is invalidated. Automatic celebrations, weekly digests and event reminders use branch timezones, stable local-period keys, leap-day policy and end-of-year-safe date arithmetic. No real outbound delivery in tests.

Reporting uses documented metrics: unique people vs visits vs outreach activities are separate counts; visitor conversion uses a named cohort and date window; transfers must not be counted as new organization growth; attendance denominator uses qualifying occurrences; active membership uses approved standing/affiliation predicates. Reports disclose filters, timezone, rule version and freshness. Historical reports use event origin, not current branch. Exports reauthorize at execution and download, sanitize spreadsheet-formula cells, redact restricted fields, expire signed file access and audit the export. No hardcoded or demo KPI totals in production views.

## 12. Feature-specific transactional rules

- Branch archive blocks new operations in that branch and revokes branch assignments, but does not disable a Person's unrelated valid workspace. Reactivation is audited.
- Assignment delegation is a subset of the grantor's delegable capabilities, scope and expiry. No self-escalation; restricted capabilities remain non-delegable. Appointments and roster membership are distinct.
- Transfers lock the Person's current affiliation and pending transfer. Accept closes the source affiliation, opens the destination affiliation, revokes source operational assignments and creates a recognition task atomically. Rejection/cancellation preserves original affiliation. Source historical access remains policy-driven; acceptance does not copy confidential notes into an unrestricted destination directory.
- CSV imports use staged immutable row IDs and source hashes; preview is not a write. Commit revalidates authorization, duplicates and versions. Valid rows commit with per-row results; retries use row idempotency keys. No silent overwrites by email. Error downloads expose only authorized source rows.
- Inventory sale locks required stock rows in stable order, checks availability, records immutable price snapshots and decrements stock atomically. Reversal appends compensating stock movements and cannot exceed sold quantity. Transfer evidence alone never sets a bank-confirmed status.
- Kids pickup checks current verified authority, session-bound code, expiry and unused check-in state at the moment of release. Codes are hashed and attempt-limited. Duplicate pickup returns already released; exceptional release requires separately authorized incident evidence. Allergy visibility is need-specific.
- Transport allocation validates trip capacity and driver/vehicle availability in one transaction. Cancellation releases capacity; driver views reveal only trip-required passenger information, not pastoral notes. Completion and no-show are distinct outcomes.
- Announcements are active only in `[starts_at,expires_at)` and for the authorized audience. Read-time filtering guarantees expiry even if the archival worker is delayed. Publication of personal milestones requires a separate permission/preference decision.
- Event cancellation cancels future reminders and marks affected registrations; past attendance remains. Reminder delivery keys distinguish rescheduled event versions while avoiding duplicate sends.

### Audit storage and operations

Use an append-only audit table with an application database role denied UPDATE/DELETE. Record audit facts transactionally with sensitive writes. Export periodic sequenced, signed checkpoints to separately controlled retention storage; verification detects alteration, deletion or sequence gaps. Do not describe a read-only UI as proof of tamper evidence. Database-owner access remains a privileged operational risk and must be separately monitored. Audit policy applies retention/redaction to private fields without silently rewriting protected decision provenance.

Personal photo ownership is retained from the backlog; staff cannot edit a member photo through generic profile APIs. Child profile images use explicit guardian/child policy. Templates for OTP remain available for legacy invitation compatibility, but credentials and raw OTPs never enter ordinary application logs.

## 13. Migration map and release strategy

Treat current database contents as unknown until inspected. Never infer empty or disposable data from local development instructions. Inventory each environment separately. Preserve source IDs and immutable snapshots. Prohibit automatic phone/email-only merge. Use source namespace + entity + ID + migration run in LegacyRecordMap.

| Legacy schema | V2 target / disposition |
|---|---|
| user | Split Account, AuthMethod, baseline grants and scoped Assignments; link Person by reviewed evidence |
| member | Transform Person + Affiliation + MembershipStatus + contacts; reconcile User links |
| visitor | Transform provisional Person + visit/capture provenance; reviewed link to existing identity |
| soul | Person linkage + OutreachContact/Activity/Decision; retain evangelist attribution |
| souljournal | Outreach JournalEntry with category and origin |
| followup | Domain FollowUp + referenced WorkItem |
| firsttimerassignment | FollowUpAssignment + assignment history |
| calllog | CallLog and classified notes |
| localchurch | Branch under Organization |
| districts | District grouping; retain original branch mapping |
| sector | Branch Sector |
| team | Team definition with branch instances where legacy templates were shared |
| churchteams | Team/branch association mapping |
| memberteam | Roster membership + operational Assignment only where justified |
| userteam | Reconcile roster/Assignment with memberteam; no automatic duplicate grants |
| usersector | Sector affiliation/Assignment distinguished by original purpose |
| teamvolunteers | Placement and probation records |
| volunteerapplication | VolunteerApplication with ranked preferences |
| membershipstagehistory | JourneyTransition with legacy evidence/rule marker; no invented dates |
| academycohort | Cohort and module mapping |
| cohortenrollment | Enrollment attempt |
| continuousassessment | AssessmentRevision; preserve scores and unknown evidence flags |
| attendancerecord | Service/class occurrence attendance; flag ambiguous dates/occurrences |
| membertransfer | Transfer history + affiliation intervals; flag unknown origin history |
| memberlandmark | Landmark with publication preference unset unless evidenced |
| profilechangerequest | Versioned proposal with reviewer provenance; stale pending requests re-reviewed |
| situationreport | Classified CareCase/SitRep and amendments |
| guardianrelationship | PersonRelationship; do not infer verified GuardianAuthority |
| kidsministryprofile | ChildProfile; ambiguous parent links require review |
| churchevent | Event + occurrence |
| transportrequest | TransportRequest and state mapping |
| outreachreport | OutreachReport with counted-event provenance |
| outreachtargets | OutreachTarget period and scope |
| teamtodo | WorkItem referencing validated domain subjects; orphan queue |
| otpinvites | Invitation history; outstanding secrets revoked/reissued at cutover |
| featureflag | FeatureFlag and branch overrides where evidenced |
| churchsetting | Versioned BranchSettings |
| auditlog | Immutable legacy audit partition, preserving origin and redaction policy |

Migration steps: (1) inventory and source snapshot; (2) stage normalized records; (3) resolve account/identity conflicts; (4) dry-run mappings and constraints; (5) reconcile counts and representative histories; (6) rehearse rollback; (7) enter approved write freeze, import delta and revalidate; (8) switch feature/branch routing; (9) accept or rollback within a defined window. Avoid uncontrolled dual writes. If coexistence is required, designate one writer per domain and use explicit adapters; V1 cannot bypass V2 permissions through an old route.

Reconcile source rows to target representations, not naive equal Person counts after merges. Check accounts, affiliations, assignments, attendance, care, cohorts, assessments, transfers, stage histories, unmatched records and duplicate candidates. Compare financial/stock sums where present. Invalid records remain in a visible quarantine queue. Rollback restores the snapshot and routing before V2 writes; after V2 writes it requires a captured change journal and verified replay/reconciliation plan, never dropping newer activity. Test backup restore before cutover.

## 14. Delivery order, tests and completion evidence

| Phase | Scope and required exit evidence |
|---|---|
| 0 | Source inventory, policy gates, migration map, API conventions, test harness and no-default-secret configuration; no destructive production work |
| 1 | Full visitor → repeat visit → follow-up → verification → account claim slice, including identity review, scoped grants, basic workspaces, outbox, notifications and audit |
| 2 | Membership standing, journey, academy, placements, care, celebrations, delegation and PIN/device workflows |
| 3 | Transfers, generic teams/sectors, Soul Bank, maps, targets, transport, guardians and kids |
| 4 | Inventory, announcements/events, full reporting/export/governance, receipt compatibility and production migration/release |
| V3 | QR public intake, using the same identity and queue rules; remains explicitly planned |

Each feature is a vertical delivery unit: schema/migration → domain rules → API/OpenAPI → authorization/transactions → jobs/events → frontend → acceptance evidence. Do not mark backend-only endpoints or mock screens done. Track status per ID as planned, in_progress, implemented_unverified, verified, or blocked_by_policy. Initially every ID is planned for V2.

Required tests: domain rule tests; PostgreSQL integration tests for tenant scoping, transactions, uniqueness and concurrency; contract checks against OpenAPI; component tests for validation/accessibility; browser journeys for each principal/workspace and critical failures; worker replay/crash tests; migration reconciliation and restore rehearsal. Backend-only tests cannot prove frontend completion. UI guards cannot prove backend authorization.

Priority adversarial cases: Choir lead/Membership caller scope composition; cross-branch guessed IDs; stale revoked assignment; self-approval; two simultaneous claims; two overlapping transfers; shared-contact duplicates; double attendance; event replay; parallel stock sale; pickup code reuse; confidential export after access revocation; retry after provider timeout. Use fake clocks for expiry, timezone, leap-day and weekly schedule tests.

Repository checks to retain: Go test/build/vet and boundary lint; frontend lint and TypeScript/Vite build. Add actual frontend/component/E2E test scripts and make CI invoke them before calling them gates. A green build is not functional acceptance. PRs follow repository AGENTS.md: feature/fix → dev, dev → staging, staging → main. Deployment requires configured environments, migrations, backups, secrets, readiness, outbox health, alert ownership and a rollback path.

Proposed performance budgets, to validate against real volumes: ordinary paginated reads p95 ≤500ms server time, normal transactional writes ≤1s excluding providers, first interactive mobile workspace ≤3s on agreed test conditions, urgent job queued in the source transaction and healthy-worker dispatch attempt within 60s. Load-test with realistic tenant distributions; publish dataset/hardware/concurrency with results rather than treating these numbers as measured facts.

Feature acceptance record must include feature/scenario IDs, source commit, migration version, API/worker/UI evidence, principal and tenant fixtures, failure-path results, policy decisions, reviewer and date. These masters are complete as specifications only when the source coverage matrix is complete; the app is complete only when every in-scope release feature has implementation evidence. No test was run against the application merely by writing these documents.

## 15. Implementation Evidence & Milestone Audit Log

### Milestone: Backend Foundation (V2 Foundation & Infrastructure)
- **Status**: Implemented & Verified against isolated PostgreSQL 16 (`hof_postgres_v2` on port 5433).
- **Verified Date**: 2026-09-22
- **Components Delivered & Verified**:
  1. **Runtime Isolation**: `cmd/server-v2` listening on port `8081` with zero startup database schema mutations or seeding; strict `V2_DATABASE_URL` enforcement without V1 fallback.
  2. **Migration Engine**: `internal/v2/migration` with SHA-256 checksum verification, PostgreSQL advisory locking, and transactionally applied DDL (`000001_foundation_schema.up.sql` and down migration).
  3. **Relational Constraints**: Verified single active primary affiliation index, single active account index, shared non-unique phone support across households, and PostgreSQL trigger blocking updates/deletions on `audit_events`.
  4. **Synthetic Fixtures**: Deterministic data (`internal/v2/fixtures`) with well-known UUIDs (Heritage MMC Org, Lekki and Ikeja branches, teams, sectors, and Ada Okafor with overlapping Choir Lead + Membership Caller assignments).
  5. **Identity & Session Management**: Cryptographic tokens, SHA-256 hash lookup, session expiration, explicit revocation, and suspended account rejection (`internal/v2/identity`).
  6. **Scoped Authorization**: Authorizer evaluating `(Capability, ScopeLevel, SensitivityClass)` including `SELF`, `ASSIGNED`, `TEAM`, `SECTOR`, `CHURCH`, `ORGANIZATION`, and delegation inheritance invalidated immediately upon parent assignment revocation (`internal/v2/authorization`).
  7. **Reliable Transactions & Outbox**: `UnitOfWork` ensuring atomic rollback of domain, audit, and outbox changes; Outbox dispatcher leasing batches via `FOR UPDATE SKIP LOCKED` and consumer receipts preventing duplicate execution (`internal/v2/uow`, `internal/v2/outbox`).
  8. **Idempotency**: Store checking SHA-256 payload hashes, replaying cached responses on key match, and returning `ErrIdempotencyConflict` on payload mismatch (`internal/v2/idempotency`).
  9. **API Router & Endpoints**: `/health/live`, `/health/ready` (with live DB ping and migration readiness verification), and `/api/v2/me/context` (returning authenticated identity, baseline grants, and active assignments) with standardized error envelopes.
  10. **Test Coverage**: 100% pass across all packages via `go test -p 1 -count=1 ./internal/v2/...` and clean `go vet ./internal/v2/...`.

### Milestone: Visitor Capture and Controlled Account Claim (V2 Slice 2)
- **Status**: Foundation scaffold implemented; acceptance hardening remains. HOF-002 and HOF-013 are not marked complete by this persistence layer alone.
- **Evidence**: migration `000003_visitor_claim_slice`, `internal/v2/visitor`, atomic visitor capture with Person + affiliation + occurrence + welcome work + audit + outbox, profile-gated single-use claim invitations, concurrent claim consumption, and versioned API contracts in `api_docs/v2/openapi.yaml`.
- **Pending**: identity-candidate review, attendance command and deduplication, follow-up assignment/outcomes, real notification delivery, channel challenges, PIN/photo setup, rate limits, and final role-policy acceptance.
