# Heritage V2 — Master Gherkin Stories

Version: 1.0 • Prepared: 2026-09-22 • Status: target acceptance specification.

Companion: [Master Architecture](master-architecture.md). This file determines what is built. The architecture defines ownership, persistence, APIs, permissions, UI structure, jobs and release gates. Both use HOF feature IDs. No scenario is claimed implemented or passing solely because it appears here.

## Reading and maintaining this specification

All V2 features begin **planned**. A scenario becomes verified only with current-commit backend and frontend evidence, including asynchronous behavior where relevant. Tags identify feature, phase and scenario. Scenario Outline examples are independent acceptance cases. Feature blocks can be extracted into executable `.feature` files; step definitions and fixtures must exercise real domain behavior, not merely assert that a mocked screen renders.

Source precedence follows `clarity.md` and the companion architecture. The original backlog, Gherkin, system specification, project tree and product analysis supply coverage but their conflicting completion labels are not inherited. P01–P09 in architecture §3 mark remaining policy gates. Scenarios depending on those choices are conditional on an approved policy; they must not be silently skipped to claim release readiness.

### Implementation Milestones & Foundation Status (2026-09-22)
The **Backend Foundation Milestone** has been implemented and verified in `internal/v2` against an isolated PostgreSQL 16 container (`hof_postgres_v2` on port 5433). This delivers:
- **Isolated V2 Runtime & Database**: `cmd/server-v2` listening on port `8081`, strictly using `V2_DATABASE_URL` with zero startup database mutation.
- **Migration & Constraint Engine**: Forward/backward migrations with SHA-256 checksums and advisory locks; single active affiliation partial index; shared non-unique phone support; trigger-enforced immutable audit trail.
- **Core Identity & Scoped Authorization**: Token hashing, session expiration/revocation, suspended account rejection; multi-dimensional grant evaluation `(Capability, ScopeLevel, SensitivityClass)` and instantaneous delegation invalidation upon parent revocation.
- **Transactional Reliability & Idempotency**: `UnitOfWork` atomic commits/rollbacks; Outbox leasing (`FOR UPDATE SKIP LOCKED`) and consumer receipts; Idempotency store with SHA-256 payload conflict detection.
- **API & Health**: `/health/live`, `/health/ready` (checking database connectivity and migration state), and authenticated `/api/v2/me/context`.

*Verification Notice*: In strict accordance with the verification policy, business feature rows (HOF-001 through HOF-048) remain marked `planned` until their full vertical slice delivery (including business logic, outbound worker dispatch, and frontend UI integration) is implemented and verified in subsequent milestones.

The next V2 milestone is now scaffolded: visitor capture and controlled account-claim persistence/API contracts. HOF-002 and HOF-013 remain `planned` until their complete end-to-end acceptance scenarios pass.


## Universal acceptance rules

Apply these to every feature below, in addition to its concrete scenarios:

- Authentication and authorization are enforced by the API, including guessed IDs, pagination totals, search, downloads, exports and background jobs. A menu guard is not sufficient.
- Organization, branch, assignment and sensitivity are evaluated together. A disabled feature is unavailable even to a user with its capability unless an explicit maintenance policy says otherwise.
- Writes validate inputs, retain domain/audit provenance, reject stale versions and handle retries without duplicate outcomes. Failed atomic commands leave no partial domain result.
- Each UI has loading, empty, no-results, denied, validation, conflict, network-failure and success states; errors preserve recoverable input. No fake success while persistence is unconfirmed.
- Current permissions are rechecked after revocation. Confidential values are absent from unauthorized API payloads, logs, notifications and cached prior-workspace views.
- Test fixtures use synthetic people and fake outbound providers. Tests never send real messages or alter authoritative production records.

## Coverage index

| ID | Feature | Phase | Status |
|---|---|---|---|
| HOF-001 | Sign-in, sessions and logout | 1 | planned |
| HOF-002 | Controlled claims, magic links and onboarding | 1 | planned |
| HOF-003 | Google sign-in and authentication-method linking | 1 | planned |
| HOF-004 | PIN unlock and optional device biometrics | 2 | planned |
| HOF-005 | Recovery, mistaken claims, suspension and replacement | 1 | planned |
| HOF-006 | Organization, branches, districts, sectors and teams | 1/3 | planned |
| HOF-007 | Leadership invitations and reassignment | 2 | planned |
| HOF-008 | Scoped assignments, capability matrix and delegation | 1/2 | planned |
| HOF-009 | Workspace navigation and context switching | 1 | planned |
| HOF-010 | Canonical Person, contacts and affiliation | 1 | planned |
| HOF-011 | Duplicate suggestions, merge and correction | 1 | planned |
| HOF-012 | Directory search and bulk CSV import | 1/2 | planned |
| HOF-013 | Information Center visitor intake | 1 | planned |
| HOF-014 | Service attendance, history and absence | 1 | planned |
| HOF-015 | Foundation eligibility, recommendation and handoff | 1 | planned |
| HOF-016 | Follow-up allocation, calls, history and weekly collation | 1 | planned |
| HOF-017 | Profile enrichment, maker-checker and verification | 1 | planned |
| HOF-018 | Membership standing, journey history and overrides | 2 | planned |
| HOF-019 | Programs, modules, cohorts and teaching assignments | 2 | planned |
| HOF-020 | Continuous assessment, makeup, graduation and retakes | 2 | planned |
| HOF-021 | Volunteer preferences, probation and placement | 2 | planned |
| HOF-022 | Birthdays, anniversaries and life landmarks | 2 | planned |
| HOF-023 | Pastoral cases, urgent alerts and amendments | 2 | planned |
| HOF-024 | Inter-branch transfer and achievement recognition | 3 | planned |
| HOF-025 | Soul Bank outreach capture and spiritual decisions | 3 | planned |
| HOF-026 | Soul journals, decisions and assigned outreach follow-up | 3 | planned |
| HOF-027 | Scoped maps and approved public aggregates | 3 | planned |
| HOF-028 | Outreach targets, reports and leaderboard | 3 | planned |
| HOF-029 | Transport requests, dispatch, capacity and completion | 3 | planned |
| HOF-030 | Households, relationships and guardian authority | 3 | planned |
| HOF-031 | Kids profiles, check-in and secure pickup | 3 | planned |
| HOF-032 | Books, merchandise, stock and transfer sales | 4 | planned |
| HOF-033 | Announcements, presenter bulletin and expiry | 4 | planned |
| HOF-034 | Events, registration, reminders and attendance | 4 | planned |
| HOF-035 | Email, SMS, templates, inbox and delivery status | 1–4 | planned |
| HOF-036 | Personal, departmental and executive dashboards and dossiers | 2–4 | planned |
| HOF-037 | Analytics, executive PDF and CSV exports | 4 | planned |
| HOF-038 | Feature flags, settings, localization and governance | 1–4 | planned |
| HOF-039 | Audit trail, diagnostics and failed-job operations | 1 | planned |
| HOF-040 | Work queues and durable cross-domain coordination | 1 | planned |
| HOF-041 | Personal profile, member experience, guides and legal pages | 1–4 | planned |
| HOF-042 | V3 public QR visitor intake | V3 | planned |
| HOF-043 | Restricted files, privacy preferences and retention | 1–4 | planned |
| HOF-044 | Migration, reconciliation and cutover | 0–4 | planned |
| HOF-045 | Cross-cutting quality, accessibility and release | Every phase | planned |
| HOF-046 | External donation record and receipt compatibility | 4 | planned |
| HOF-047 | Generic ministry roster, duty schedules and team work | 3 | planned |
| HOF-048 | Sector leadership and cell ministry | 3 | planned |

## Acceptance scenarios

### HOF-001 — Sign-in, sessions and logout

Sources: Gherkin Epic 1; specification Domain 1. Architecture: feature catalog HOF-001 and shared contracts. Phase: 1.

```gherkin
@HOF-001
Feature: Sign-in, sessions and logout
  @HOF-001-S01
  Scenario: Eligible account signs in
    Given an active account with a verified Person link and a valid password
    When the user submits the login form
    Then the API establishes a secure cookie session and returns permitted workspaces
    And the browser opens the personal dashboard without storing a bearer token in localStorage
  @HOF-001-S02
  Scenario: Invalid credentials and unknown accounts do not disclose directory membership
    Given an incorrect password or an unknown authentication identifier
    When a login request is submitted
    Then the API returns the same generic authentication failure
    And the form remains usable with an accessible error and no session
  @HOF-001-S03
  Scenario: Logout revokes server access
    Given an authenticated browser session
    When the user signs out
    Then the server revokes that session and the browser clears scoped cached data
    And replaying the old session cannot access a protected API
  @HOF-001-S04
  Scenario: Suspension and session expiry are enforced
    Given a session whose account is suspended or whose expiry has passed
    When a protected API is requested
    Then it returns 401 without protected data
    And the UI requests authentication without treating unsaved work as saved
```

### HOF-002 — Controlled claims, magic links and onboarding

Sources: Backlog Global 1; specification 1.3–1.4; clarity 13. Architecture: feature catalog HOF-002 and shared contracts. Phase: 1.

```gherkin
@HOF-002
Feature: Controlled claims, magic links and onboarding
  @HOF-002-S01
  Scenario: Verified person claims an account
    Given a verified Person with an eligible independent authentication method and a current claim invitation
    When the claimant proves channel control, confirms identity and completes required setup
    Then token consumption, Person linkage and account activation commit atomically
    And the wizard offers member photo, PIN setup and optional Google linking before completion
    And the new account has personal baseline permissions but no inferred ministry appointment
  @HOF-002-S02
  Scenario: Public registration cannot create a trusted identity
    Given a person without a verified claim invitation
    When they submit legacy public registration or try to claim an unknown identifier
    Then no active Account or ministry assignment is created
    And the UI gives non-enumerating guidance to contact Information Center or Membership
  @HOF-002-S03
  Scenario Outline: Unusable claim token
    Given a claim token that is <condition>
    When the claimant submits onboarding
    Then activation is rejected with no partial account changes
    And the UI explains how to request appropriate assistance
    Examples:
      | condition |
      | expired |
      | revoked |
      | already consumed |
      | for a different organization |
      | for a login rather than a claim |
  @HOF-002-S04
  Scenario: Link scanners and simultaneous submission cannot consume twice
    Given a valid claim link
    When a mail scanner performs a GET and two activation POST requests later race
    Then the GET does not consume the token
    And exactly one account activation succeeds while the other returns an already-used result
  @HOF-002-S05
  Scenario: Existing member requests passwordless login
    Given an active linked account eligible for magic login
    When a requested login link is explicitly exchanged
    Then it creates a session without re-running membership verification or creating another Person
    And a claim token cannot substitute for an unrelated login purpose
  @HOF-002-S06
  Scenario: Legacy OTP claim respects the canonical invitation boundary
    Given a migrated legacy OTP invitation linked to a verified Person
    When the recipient submits the correct unexpired purpose-bound code within attempt limits
    Then the same atomic invitation-consumption and account-linking rules apply
    And an invalid or expired OTP creates neither an account nor a role
```

### HOF-003 — Google sign-in and authentication-method linking

Sources: Gherkin Epic 1; specification 1.2; clarity 13. Architecture: feature catalog HOF-003 and shared contracts. Phase: 1.

```gherkin
@HOF-003
Feature: Google sign-in and authentication-method linking
  @HOF-003-S01
  Scenario: Linked provider signs in
    Given a Google issuer and subject already linked to an active account
    When a callback passes state, provider and redirect validation
    Then the API establishes a secure session
    And redirects without a reusable bearer token in the URL
  @HOF-003-S02
  Scenario: Matching contact email is not automatic account linkage
    Given a provider email matching a shared Person contact but no verified provider link
    When Google authentication completes
    Then the system requires the authorized claim or account-linking flow
    And does not choose a Person by email equality or create a trusted member automatically
  @HOF-003-S03
  Scenario: Invalid callback has no side effect
    Given an expired or mismatched OAuth state
    When the callback is received
    Then it is rejected without creating an account or session
    And the login page offers a fresh attempt
  @HOF-003-S04
  Scenario: Unlinking preserves a usable account
    Given an authenticated account with a linked Google method
    When the user requests unlinking after required reauthentication
    Then the method is removed only if another usable method remains
    And removing the final method is refused with recovery guidance
```

### HOF-004 — PIN unlock and optional device biometrics

Sources: Backlog Global 2; specification 1.5. Architecture: feature catalog HOF-004 and shared contracts. Phase: 2.

```gherkin
@HOF-004
Feature: PIN unlock and optional device biometrics
  @HOF-004-S01
  Scenario: Enrolled device unlocks with PIN
    Given a valid enrolled device context and a configured PIN hash
    When the correct PIN is submitted
    Then the API rotates or unlocks the permitted session
    And the keypad closes without granting additional capabilities
  @HOF-004-S02
  Scenario: PIN attempts lock temporarily
    Given four failed PIN attempts under a five-attempt policy
    When the fifth invalid attempt is submitted
    Then verification is blocked for fifteen minutes and an alert is queued
    And retries during lockout cannot bypass the restriction by refreshing the page
  @HOF-004-S03
  Scenario: PIN is not a standalone public login
    Given no enrolled device or eligible session context
    When a caller submits an account identifier and PIN
    Then the API refuses authentication even if the PIN is correct
  @HOF-004-S04
  Scenario: Optional biometric authentication has an accessible fallback
    Given an enrolled platform authenticator or an unsupported device
    When the user chooses biometric unlock
    Then a supported device verifies a server challenge before unlocking
    And cancellation or unsupported capability offers an accessible fallback without collecting biometric data
```

### HOF-005 — Recovery, mistaken claims, suspension and replacement

Sources: clarity 13; Backlog PIN reset. Architecture: feature catalog HOF-005 and shared contracts. Phase: 1.

```gherkin
@HOF-005
Feature: Recovery, mistaken claims, suspension and replacement
  @HOF-005-S01
  Scenario: Lost-contact recovery requires identity review
    Given a member who no longer controls their authentication channel
    When a recovery case is opened
    Then authorized staff review Person linkage evidence rather than trusting a stale contact alone
    And approval links a verified replacement method and revokes superseded sessions
  @HOF-005-S02
  Scenario: A claimant reports the wrong person
    Given an invitation showing an identity the claimant does not recognize
    When they select This is not me
    Then activation stops and a restricted correction case is created
    And the UI does not permit editing the invitation into another Person
  @HOF-005-S03
  Scenario: Suspending an account preserves ministry records
    Given an authorized account administrator
    When they suspend an account with a reason
    Then sessions and pending activation rights are revoked
    And the Person, affiliations and history remain intact
  @HOF-005-S04
  Scenario: Replacing an account preserves canonical identity
    Given an approved recovery case for a Person with a prior account
    When a replacement account is activated
    Then the former account is historical and unusable
    And the new account references the same Person without inheriting revoked assignments
  @HOF-005-S05
  Scenario: PIN reset uses a purpose-bound recovery token
    Given a valid recovery challenge for an eligible account
    When a new PIN is confirmed
    Then the PIN hash is replaced and the reset token is consumed once
    And failed or expired reset requests do not alter credentials
```

### HOF-006 — Organization, branches, districts, sectors and teams

Sources: Backlog Administration; specification 2.1; Gherkin Epic 8. Architecture: feature catalog HOF-006 and shared contracts. Phase: 1/3.

```gherkin
@HOF-006
Feature: Organization, branches, districts, sectors and teams
  @HOF-006-S01
  Scenario: Provision a branch
    Given an administrator with organization branch-provisioning authority
    When they submit a unique branch slug, location and timezone
    Then the branch and default settings are created together
    And the branch directory displays it with no fabricated members
  @HOF-006-S02
  Scenario: Reject mismatched organizational references
    Given a sector in branch A and a team in branch B
    When an operator tries to attach them as if both belong to branch A
    Then the API rejects the inconsistent context
    And the editor highlights the invalid relationship without partial writes
  @HOF-006-S03
  Scenario: Archive preserves history and unrelated access
    Given a person with valid assignments in two branches
    When an authorized administrator archives one branch
    Then new operations and assignments in that branch are blocked
    And historical records remain while the other branch workspace remains available
  @HOF-006-S04
  Scenario: Manage geographic and ministry structure
    Given an authorized branch administrator
    When they create or edit a sector and a team within that branch
    Then the scoped catalogs and assignment pickers update
    And referenced units can be archived but cannot be silently deleted with their history
```

### HOF-007 — Leadership invitations and reassignment

Sources: Backlog Super Admin 1–2; specification 2.2. Architecture: feature catalog HOF-007 and shared contracts. Phase: 2.

```gherkin
@HOF-007
Feature: Leadership invitations and reassignment
  @HOF-007-S01
  Scenario: Invite a branch leader
    Given an administrator permitted to appoint a Resident Pastor in a branch
    When they issue an invitation with person evidence, destination and assignment
    Then a purpose-bound expiring token and pending appointment are recorded
    And the directory displays pending delivery separately from accepted leadership
  @HOF-007-S02
  Scenario: Resend and revoke invalidate old links
    Given a pending leadership invitation
    When the administrator resends it and later revokes it
    Then the prior token is invalidated by resend and the new token by revocation
    And neither token can activate an appointment
  @HOF-007-S03
  Scenario: Reassign leadership atomically
    Given an active branch leadership appointment and an authorized replacement
    When reassignment is confirmed
    Then the old appointment ends and the new appointment begins in one transaction
    And both histories remain with an audit record and refreshed workspaces
  @HOF-007-S04
  Scenario: Invitation cannot elevate its issuer
    Given an inviter without permission to appoint platform administrators
    When they submit a platform-administrator role in an invitation payload
    Then the API rejects the elevation regardless of what the UI exposes
```

### HOF-008 — Scoped assignments, capability matrix and delegation

Sources: clarity 5; Backlog Global 3; specification Domain 9. Architecture: feature catalog HOF-008 and shared contracts. Phase: 1/2.

```gherkin
@HOF-008
Feature: Scoped assignments, capability matrix and delegation
  @HOF-008-S01
  Scenario: Multiple assignments retain independent scopes
    Given Ada is Choir Team Lead and Membership Caller assigned to one visitor
    When Ada queries the Membership follow-up API for another caller's visitor
    Then the API denies access despite Ada's Choir team-wide scope
    And her Choir roster remains accessible under the Choir assignment
  @HOF-008-S02
  Scenario: Delegate only a permitted subset
    Given a lead with delegable profile approval and call-allocation grants
    When they grant an assistant profile approval but not transfer approval
    Then the assistant can approve eligible profiles but cannot approve transfers
    And a crafted request for greater scope or expiry than the lead's grant is rejected
  @HOF-008-S03
  Scenario: Revocation affects live sessions and descendants
    Given an assistant with a delegated grant and an active session
    When the parent assignment is revoked
    Then the next authorization check rejects the delegated capability
    And stale browser navigation cannot restore access
  @HOF-008-S04
  Scenario: Role-template edits are versioned
    Given an authorized governance editor
    When a role capability package is changed
    Then the new policy version and affected grants are recorded and caches invalidated
    And no grant gains a broader organizational scope merely from the template edit
```

### HOF-009 — Workspace navigation and context switching

Sources: Backlog Global 3; specification 9.1/9.3. Architecture: feature catalog HOF-009 and shared contracts. Phase: 1.

```gherkin
@HOF-009
Feature: Workspace navigation and context switching
  @HOF-009-S01
  Scenario: Switch between authorized workspaces
    Given a user with Choir and Membership assignments
    When they switch from Choir to Membership
    Then the shell loads Membership menus and data for its assignment
    And cancels old requests and removes Choir data from the active view
  @HOF-009-S02
  Scenario: Direct route access does not bypass permissions
    Given a Membership worker without Information Center authority
    When they enter the intake route manually and call its API directly
    Then the UI displays access denied and the API refuses the operation
  @HOF-009-S03
  Scenario: No-workspace and revoked-context states are usable
    Given a signed-in member with no ministry appointment or a newly revoked appointment
    When available workspaces are loaded
    Then the personal workspace remains if its baseline grant is valid
    And unavailable departments are not shown as empty authorized directories
```

### HOF-010 — Canonical Person, contacts and affiliation

Sources: clarity 1–3, 6; V2 reports. Architecture: feature catalog HOF-010 and shared contracts. Phase: 1.

```gherkin
@HOF-010
Feature: Canonical Person, contacts and affiliation
  @HOF-010-S01
  Scenario: Person exists without an account
    Given a captured visitor who does not use the app
    When their directory record is saved
    Then a Person and branch relationship exist without authentication credentials
    And directory verification does not automatically confer member standing
  @HOF-010-S02
  Scenario: Shared contact does not force shared identity
    Given two family members using the same phone number
    When authorized staff record both people with distinct evidence
    Then both ContactPoints may retain the same normalized value
    And no automatic merge or account sharing occurs
  @HOF-010-S03
  Scenario: Organization identity does not imply universal discovery
    Given a Person known only in another branch
    When an ordinary branch worker searches by their contact
    Then the API does not disclose the hidden profile or its branch
    And cross-branch review remains available to an authorized identity reviewer
  @HOF-010-S04
  Scenario: Partial dates and contact history remain truthful
    Given a birthday known only by day and month and an old contact later replaced
    When the profile is updated through its approved workflow
    Then no birth year is invented and the contact validity history is retained
```

### HOF-011 — Duplicate suggestions, merge and correction

Sources: clarity 2, 15. Architecture: feature catalog HOF-011 and shared contracts. Phase: 1.

```gherkin
@HOF-011
Feature: Duplicate suggestions, merge and correction
  @HOF-011-S01
  Scenario: Review a possible duplicate
    Given two visible provisional records with a matching normalized phone
    When staff open the duplicate suggestion
    Then they see the match reason and permitted comparison fields
    And can choose the existing Person or document that these are different people
  @HOF-011-S02
  Scenario: Merge preserves provenance
    Given an organization reviewer has verified two records are the same Person
    When a merge with field selections is submitted
    Then the system preserves source IDs, snapshots and reference movement history
    And old authorized links resolve to the canonical Person without losing visits
  @HOF-011-S03
  Scenario: Account conflicts block automatic merge
    Given two duplicate candidates each linked to an active Account
    When a merge is requested
    Then no automatic account combination occurs
    And a restricted identity recovery case explains the unresolved conflict
  @HOF-011-S04
  Scenario: Unmerge does not guess ownership of new facts
    Given a completed merge with later records of ambiguous ownership
    When an authorized reviewer requests unmerge
    Then safely attributable references can be restored using provenance
    And ambiguous facts remain in a correction case without arbitrary reassignment
  @HOF-011-S05
  Scenario: Central review does not leak hidden candidates
    Given a possible duplicate spanning branches and a worker with branch-only visibility
    When central review is queued
    Then the worker receives a review-pending result without hidden personal details
```

### HOF-012 — Directory search and bulk CSV import

Sources: Gherkin Epics 5–6; legacy CSV hooks. Architecture: feature catalog HOF-012 and shared contracts. Phase: 1/2.

```gherkin
@HOF-012
Feature: Directory search and bulk CSV import
  @HOF-012-S01
  Scenario: Search with server-enforced scope
    Given people across two branches with different sensitivity categories
    When a branch worker searches and paginates by name, phone, area or stage
    Then rows, total counts and detail projections contain only authorized records
    And changing filters never expands the worker's scope
  @HOF-012-S02
  Scenario: Preview does not create records
    Given a CSV with valid, malformed and possible-duplicate rows
    When it is uploaded and edited in preview
    Then normalized values, row errors and duplicate warnings are displayed
    And no Person or Account is created before commit
  @HOF-012-S03
  Scenario: Commit is row-idempotent
    Given an approved CSV preview and current import permissions
    When a commit succeeds but its response is lost and the same job is retried
    Then each accepted row is applied once
    And successful, failed and review-required rows are reported separately
  @HOF-012-S04
  Scenario: Import cannot bypass identity or approval rules
    Given a row matching an existing contact or proposing verified-profile changes
    When import is committed
    Then it creates a review candidate or change proposal rather than silently overwriting the master
    And downloadable error reports include only authorized rows with formula-safe cells
```

### HOF-013 — Information Center visitor intake

Sources: Backlog IC 1; specification 4.1. Architecture: feature catalog HOF-013 and shared contracts. Phase: 1.

```gherkin
@HOF-013
Feature: Information Center visitor intake
  @HOF-013-S01
  Scenario: Capture a first visit and immediate welcome work
    Given an Information Center worker in an active branch service
    When they submit name, contact details, inviter and permitted intake fields
    Then Person linkage, branch relationship and one attendance record commit together
    And a durable welcome-follow-up trigger is recorded without waiting for Foundation eligibility
    And the tablet form shows success and offers the next capture
  @HOF-013-S02
  Scenario: Record a returning person rather than another identity
    Given an existing Person confirmed by the worker from a permitted candidate
    When the worker records their visit to the current service
    Then the existing Person receives the visit with no second master record
  @HOF-013-S03
  Scenario: Visitor without a personal contact remains recordable
    Given a visitor with no personal phone or email
    When the worker records a missing-contact reason and available identifying information
    Then a provisional Person can be saved for assisted follow-up
    And no trusted digital account is provisioned
  @HOF-013-S04
  Scenario: Prayer notes are separately classified
    Given an intake form containing an optional prayer request
    When the form is submitted
    Then the prayer note is stored with its sensitive category
    And ordinary directory or caller responses omit it unless explicitly permitted
  @HOF-013-S05
  Scenario: Failed submission preserves the visitor slip
    Given a completed intake form and a network failure
    When submission fails
    Then the UI retains entered fields and reports that saving is unconfirmed
    And a retry reuses the idempotency key to avoid a second visit
```

### HOF-014 — Service attendance, history and absence

Sources: Backlog IC 2; Gherkin Epic 5. Architecture: feature catalog HOF-014 and shared contracts. Phase: 1.

```gherkin
@HOF-014
Feature: Service attendance, history and absence
  @HOF-014-S01
  Scenario: Mark attendance exactly once per occurrence
    Given a Person and a service occurrence
    When two workers mark that Person present concurrently
    Then exactly one attendance record counts for the occurrence
    And both UIs display the authoritative attendance result
  @HOF-014-S02
  Scenario: Two services on the same day are distinct
    Given morning and evening service occurrences on the same date
    When a Person attends both
    Then attendance is recorded for each occurrence
    And eligibility counts follow the versioned qualifying-visit policy
  @HOF-014-S03
  Scenario: Correct attendance with provenance
    Given an incorrectly marked attendance record
    When an authorized worker submits a correction reason
    Then an audited correction updates derived counts and eligibility
    And previously issued achievements are not silently deleted
  @HOF-014-S04
  Scenario: Identify repeated absence in context
    Given a configured sequence of qualifying services and authorized attendance history
    When a worker applies an absence filter
    Then results show missing qualifying occurrences within that scope
    And unavailable or cancelled services are excluded from the denominator
```

### HOF-015 — Foundation eligibility, recommendation and handoff

Sources: Backlog IC 3; clarity 8–10. Architecture: feature catalog HOF-015 and shared contracts. Phase: 1.

```gherkin
@HOF-015
Feature: Foundation eligibility, recommendation and handoff
  @HOF-015-S01
  Scenario: Threshold produces eligibility only
    Given a branch rule requiring two qualifying visits
    When a visitor's second qualifying visit commits
    Then Foundation eligibility is recorded against that rule version
    And no enrollment, account or completed Foundation achievement is created
  @HOF-015-S02
  Scenario: Recommend and deliver the Membership task once
    Given an eligible visitor and an authorized IC worker
    When the worker submits a Foundation recommendation with a note
    Then a recommendation and durable event commit together
    And one Foundation task appears in Membership even if the event is replayed
    And IC shows handoff status without gaining Membership workspace authority
  @HOF-015-S03
  Scenario: Changed evidence is handled before action
    Given eligibility based on attendance that is later corrected
    When a worker attempts a recommendation against stale eligibility
    Then the domain reevaluates the evidence and refuses or requests an authorized exemption
    And the UI displays the reason rather than advancing the journey
```

### HOF-016 — Follow-up allocation, calls, history and weekly collation

Sources: Backlog Membership 2; Gherkin Epics 4/6. Architecture: feature catalog HOF-016 and shared contracts. Phase: 1.

```gherkin
@HOF-016
Feature: Follow-up allocation, calls, history and weekly collation
  @HOF-016-S01
  Scenario: Lead assigns first-time visitors to callers
    Given unassigned welcome tasks in a branch
    When a lead selects visitors and an active eligible caller
    Then assignments and due dates are persisted with assignment history
    And the caller sees only those permitted visitor projections in My Follow-ups
  @HOF-016-S02
  Scenario: Record a failed contact attempt honestly
    Given an assigned visitor who cannot be reached
    When the caller logs Unreachable and a next-contact date
    Then the attempt is recorded without labeling the visitor successfully contacted
    And the next action remains visible in the work queue
  @HOF-016-S03
  Scenario: Reassignment removes live access
    Given a caller whose visitor is reassigned to another worker
    When the first caller opens the old record
    Then live contact and progress access follows current grants
    And permitted historical work remains redacted rather than deleted
  @HOF-016-S04
  Scenario: Weekly pastoral digest is scoped and repeatable
    Given call outcomes for a branch-local reporting week
    When the Monday digest job runs twice
    Then one digest for that branch and period summarizes authorized outcomes and intervention flags
    And the pastor sees its period, timezone and restricted-detail links
  @HOF-016-S05
  Scenario: SMS action uses the communication service
    Given a permitted caller and a contact allowing the selected message purpose
    When the caller previews and submits a welcome SMS
    Then a delivery job is queued with the caller and template version
    And the UI shows delivery state rather than assuming the recipient received it
```

### HOF-017 — Profile enrichment, maker-checker and verification

Sources: Backlog Membership 1/7; clarity 13–14. Architecture: feature catalog HOF-017 and shared contracts. Phase: 1.

```gherkin
@HOF-017
Feature: Profile enrichment, maker-checker and verification
  @HOF-017-S01
  Scenario: Incomplete profile work is actionable
    Given a profile missing fields required by the active profiling policy
    When Membership opens Incomplete Profiles
    Then the task names the missing fields and opens the relevant form
    And unknown optional dates or absent digital contact do not fabricate values
  @HOF-017-S02
  Scenario: Proposal does not mutate the live record
    Given a worker edits a verified member's address
    When they submit the change
    Then a typed proposal stores the old version and proposed value
    And the live address remains unchanged until approval
  @HOF-017-S03
  Scenario: Different checker approves the current version
    Given a pending proposal and a different authorized checker
    When the checker approves an unchanged base version
    Then the profile update, approval and audit commit together
    And rejection instead preserves the profile and returns feedback to the maker
  @HOF-017-S04
  Scenario: Self-approval or stale approval is rejected
    Given a maker using another assignment or a proposal whose base profile changed
    When approval is submitted
    Then the API rejects self-approval or returns a version conflict
    And the UI requires a fresh diff review before a valid approval
  @HOF-017-S05
  Scenario: Verification and account eligibility do not imply membership
    Given an authorized worker verifies a Person's profile and supporting evidence
    When they complete verification and optionally request a claim invitation
    Then verification is recorded separately from membership standing
    And invitation issuance still requires an eligible verified authentication method
```

### HOF-018 — Membership standing, journey history and overrides

Sources: clarity 6–8; specification 1.2C. Architecture: feature catalog HOF-018 and shared contracts. Phase: 2.

```gherkin
@HOF-018
Feature: Membership standing, journey history and overrides
  @HOF-018-S01
  Scenario: Standing, journey and appointment remain independent
    Given an active visitor affiliation and a returning-visitor journey
    When staff verify the profile
    Then the Person remains a visitor until an authorized standing change
    And no operational grant is inferred from verification or journey stage
  @HOF-018-S02
  Scenario: View why a transition occurred
    Given a recorded journey transition
    When an authorized user opens its timeline detail
    Then the view shows original branch, actor, evidence, rule version and reason
    And personal viewers receive only the permitted evidence projection
  @HOF-018-S03
  Scenario: Manual override preserves the original decision
    Given an unmet prerequisite and a leader authorized for journey overrides
    When the leader records the override reason and supporting evidence
    Then the override and transition are audited together
    And future reviewers can distinguish it from automatic progression
  @HOF-018-S04
  Scenario: Published rule change is prospective
    Given a completed achievement under an older rule version
    When a new rule version is published
    Then the original achievement retains its evidence and rule version
    And no retrospective revocation occurs without an explicit correction workflow
```

### HOF-019 — Programs, modules, cohorts and teaching assignments

Sources: Backlog Membership 3; Gherkin Academy. Architecture: feature catalog HOF-019 and shared contracts. Phase: 2.

```gherkin
@HOF-019
Feature: Programs, modules, cohorts and teaching assignments
  @HOF-019-S01
  Scenario: Coordinator schedules a cohort
    Given an approved module and rule version
    When a coordinator creates a cohort, six sessions and teacher assignments
    Then the schedule, pinned rules and roster are available in the Academy workspace
    And only assigned teachers receive grading access
  @HOF-019-S02
  Scenario: Enrollment enforces prerequisites
    Given a candidate without the required prior achievement or approved exemption
    When enrollment in the next module is attempted
    Then the API returns the missing prerequisite and creates no enrollment
    And the UI offers the permitted review path
  @HOF-019-S03
  Scenario: Concurrent programs and withdrawals preserve history
    Given a Person enrolled in separate permitted programs
    When one enrollment is withdrawn
    Then the other program remains active
    And the withdrawn attempt and attendance remain historically visible
  @HOF-019-S04
  Scenario: Student views own class information
    Given an enrolled member with personal access
    When they open My Classes
    Then they see their schedule, progress and permitted assessment feedback
    And cannot read another student's record by changing the enrollment ID
```

### HOF-020 — Continuous assessment, makeup, graduation and retakes

Sources: Backlog Membership 3; specification 5.4. Architecture: feature catalog HOF-020 and shared contracts. Phase: 2.

```gherkin
@HOF-020
Feature: Continuous assessment, makeup, graduation and retakes
  @HOF-020-S01
  Scenario: Grade the six-part rubric
    Given an assigned teacher and enrollment pinned to the default rubric
    When scores 18, 16, 17, 18, 8 and 8.3 are recorded
    Then the server computes a total of 85.3 out of 100
    And the gradebook displays the server result and rejects out-of-range component values
  @HOF-020-S02
  Scenario Outline: Attendance gates graduation
    Given a student with total score at least 50 and <sessions> credited sessions out of six
    When graduation eligibility is evaluated
    Then the result is <result>
    Examples:
      | sessions | result |
      | 2 | retake_required |
      | 3 | retake_required |
      | 4 | coordinator_makeup_decision_required |
      | 5 | coordinator_makeup_decision_required |
      | 6 | eligible |
  @HOF-020-S03
  Scenario: Graduate once after all requirements are resolved
    Given a passing score, sufficient attendance and resolved makeup requirements
    When an authorized graduation command is retried
    Then one achievement and next-stage eligibility are recorded
    And the UI does not show automatic enrollment in a new cohort
  @HOF-020-S04
  Scenario: Retake and regrade preserve prior evidence
    Given a failed enrollment or a published assessment later found incorrect
    When an authorized retake or correction is recorded
    Then a new attempt or assessment revision is created
    And dependent achievements are reviewed explicitly rather than erased silently
```

### HOF-021 — Volunteer preferences, probation and placement

Sources: Backlog Membership 4; specification 5.5. Architecture: feature catalog HOF-021 and shared contracts. Phase: 2.

```gherkin
@HOF-021
Feature: Volunteer preferences, probation and placement
  @HOF-021-S01
  Scenario: Module 2 completion opens volunteer preferences
    Given a recognized Module 2 achievement
    When its event is processed repeatedly
    Then one volunteer-selection task appears on the member dashboard
    And the member can rank two departments and enter skills and availability
  @HOF-021-S02
  Scenario: Membership places a probationary volunteer
    Given an eligible application and a permitted placement reviewer
    When Choir placement is approved
    Then probationary roster membership is recorded and the Choir lead is notified
    And the volunteer receives only explicitly granted operational capabilities
  @HOF-021-S03
  Scenario: Membership graduation updates service standing
    Given a placed volunteer who completes Membership Class
    When the completion policy is applied
    Then full-steward standing is recorded once
    And any appointment change is independently auditable rather than an unrestricted role elevation
```

### HOF-022 — Birthdays, anniversaries and life landmarks

Sources: Backlog Membership 5; specification 5.6–5.7. Architecture: feature catalog HOF-022 and shared contracts. Phase: 2.

```gherkin
@HOF-022
Feature: Birthdays, anniversaries and life landmarks
  @HOF-022-S01
  Scenario: Three-day celebration reminder crosses a year boundary
    Given a birthday on January 2 and branch-local date December 30
    When the daily scheduler runs twice
    Then one reminder appears for the upcoming birthday
    And no birth year is required or invented
  @HOF-022-S02
  Scenario: Leap-day and timezone policy is explicit
    Given a February 29 birthday and a configured non-leap-year observation policy
    When the scheduler evaluates the relevant local date
    Then the reminder follows that policy once in that branch timezone
  @HOF-022-S03
  Scenario: Landmark publication is separate from recording
    Given a member's graduation or family milestone
    When it is recorded in the profile
    Then it appears to authorized viewers
    And it enters the public bulletin only after the required publication preference and approval
  @HOF-022-S04
  Scenario: Celebration contact is recorded
    Given an authorized worker viewing an upcoming anniversary
    When they log a call or submit an allowed greeting
    Then the communication outcome is linked to the celebration
    And repeated clicks do not create duplicate deliveries
```

### HOF-023 — Pastoral cases, urgent alerts and amendments

Sources: Backlog Membership 6; specification 5.8; clarity 11/14. Architecture: feature catalog HOF-023 and shared contracts. Phase: 2.

```gherkin
@HOF-023
Feature: Pastoral cases, urgent alerts and amendments
  @HOF-023-S01
  Scenario: Create a classified SitRep
    Given a worker authorized to file a care report for a Person
    When they record category, notes, action and urgency
    Then the report stores original branch, actor, time and sensitivity
    And unauthorized directory viewers cannot read the report body
  @HOF-023-S02
  Scenario: Urgent alert is reliable and minimal
    Given a newly committed urgent SitRep
    When the source request ends before the notification worker runs
    Then the durable event still queues an alert to an authorized branch pastor
    And the message contains a minimal alert and authenticated link rather than full sensitive notes
  @HOF-023-S03
  Scenario: Track acknowledgment and resolution
    Given an urgent case awaiting attention
    When the pastor acknowledges it, assigns a care action and later resolves it
    Then action and acknowledgment history remain visible to permitted reviewers
    And an overdue unacknowledged case escalates according to configured policy
  @HOF-023-S04
  Scenario: Amend without rewriting history
    Given a care note containing an error
    When an authorized amendment is submitted with a reason
    Then the correction references the original report
    And ordinary editing cannot erase its origin or audit history
```

### HOF-024 — Inter-branch transfer and achievement recognition

Sources: Backlog Membership 8; clarity 7/14. Architecture: feature catalog HOF-024 and shared contracts. Phase: 3.

```gherkin
@HOF-024
Feature: Inter-branch transfer and achievement recognition
  @HOF-024-S01
  Scenario: Initiate a transfer with limited inbound preview
    Given an active primary affiliation at Port Harcourt
    When its authorized lead initiates transfer to Lekki
    Then the source affiliation remains effective pending acceptance
    And the receiving reviewer sees only the approved transfer projection
  @HOF-024-S02
  Scenario: Accept atomically without rewriting history
    Given a current pending transfer and authorized receiving reviewer
    When the reviewer accepts and assigns a valid destination sector
    Then source affiliation closes, destination affiliation opens and source appointments end atomically
    And attendance, SitReps and achievements retain their original branch context
    And the journey is not reset
  @HOF-024-S03
  Scenario: Reject, clarify or cancel without moving the person
    Given a pending transfer
    When an authorized party rejects, requests clarification or cancels it
    Then the corresponding transfer state and reason are recorded
    And current affiliation does not change
  @HOF-024-S04
  Scenario: Concurrent transfers cannot create two primary affiliations
    Given two competing acceptance requests for the same Person
    When both are processed
    Then only one valid primary-affiliation transition commits
    And the other returns a conflict with no partial reassignment
  @HOF-024-S05
  Scenario: Receiving branch recognizes earlier learning
    Given an origin achievement under another curriculum version
    When an authorized reviewer records accepted, equivalent or supplementary-required recognition
    Then the recognition references the achievement and receiving branch
    And the original completion is retained even when supplementary learning is required
```

### HOF-025 — Soul Bank outreach capture and spiritual decisions

Sources: specification 6.1; Backlog universal evangelism. Architecture: feature catalog HOF-025 and shared contracts. Phase: 3.

```gherkin
@HOF-025
Feature: Soul Bank outreach capture and spiritual decisions
  @HOF-025-S01
  Scenario: A member records outreach without departmental appointment
    Given an active member with a personal outreach grant
    When they record a contact, outreach date, location and spiritual decision
    Then an OutreachActivity references a provisional or confirmed Person
    And the UI uses Soul terminology without creating a second permanent human identity type
  @HOF-025-S02
  Scenario: GPS denial has a truthful fallback
    Given a mobile device where location permission is denied or unavailable
    When the member records a manual area or approximate map location
    Then the record preserves source and precision rather than pretending GPS verification
    And outreach capture can finish without unrelated ministry access
  @HOF-025-S03
  Scenario: Outreach person later attends church
    Given a reviewed Person link to an existing Soul Bank contact
    When Information Center records a visit
    Then the Person gains visit history without losing outreach attribution
    And the evangelist does not automatically gain access to membership or pastoral records
  @HOF-025-S04
  Scenario: Requested transport is created once
    Given an outreach capture requesting transport
    When the durable event is replayed after a worker restart
    Then one linked transport request is created
    And the capture view distinguishes request creation from a confirmed pickup
```

### HOF-026 — Soul journals, decisions and assigned outreach follow-up

Sources: specification 6.2; Gherkin Epics 3–4. Architecture: feature catalog HOF-026 and shared contracts. Phase: 3.

```gherkin
@HOF-026
Feature: Soul journals, decisions and assigned outreach follow-up
  @HOF-026-S01
  Scenario: Log a spiritual decision and journal entry
    Given an evangelist authorized for a contact
    When they record a baptism-related decision and a permitted journal note
    Then both retain author, occurrence time and Person linkage
    And the timeline shows them without automatically graduating an academy module
  @HOF-026-S02
  Scenario: Assign outreach follow-up within scope
    Given a lead permitted to allocate outreach work
    When they assign a contact to an eligible worker with a due date
    Then the worker sees the permitted contact projection and next action
    And a worker outside the assignment cannot retrieve the journal by ID
  @HOF-026-S03
  Scenario: Correct or close follow-up with history
    Given a completed outreach call containing an error
    When an authorized correction or next action is recorded
    Then the original outcome remains traceable
    And closing a task never fabricates a salvation decision or membership transition
```

### HOF-027 — Scoped maps and approved public aggregates

Sources: specification 6.3; Gherkin Epic 10; clarity 11. Architecture: feature catalog HOF-027 and shared contracts. Phase: 3.

```gherkin
@HOF-027
Feature: Scoped maps and approved public aggregates
  @HOF-027-S01
  Scenario: Authenticated map respects scope
    Given outreach records in multiple branches
    When a branch worker opens the map and its accessible list alternative
    Then only authorized locations and permitted popup fields are returned by the API
    And zooming or changing bounding boxes cannot bypass scope
  @HOF-027-S02
  Scenario: Missing location does not fabricate a pin
    Given a Person with no usable location
    When the map loads
    Then no coordinate is invented for that Person
    And the authorized list can identify that location is unavailable
  @HOF-027-S03
  Scenario: Public map never exposes individual contacts
    Given an approved public aggregate policy with a minimum group size
    When an unauthenticated visitor opens the published map
    Then it shows only qualifying coarse aggregate areas
    And no individual coordinates, names, contact details or restricted dates appear in responses or popups
  @HOF-027-S04
  Scenario: Unapproved public policy keeps publication disabled
    Given no approved public map policy
    When the public map API is requested
    Then no outreach dataset is published
    And the page shows a neutral unavailable state
```

### HOF-028 — Outreach targets, reports and leaderboard

Sources: specification 6.4; Gherkin Epics 2/16. Architecture: feature catalog HOF-028 and shared contracts. Phase: 3.

```gherkin
@HOF-028
Feature: Outreach targets, reports and leaderboard
  @HOF-028-S01
  Scenario: Set a scoped outreach target
    Given an authorized team lead
    When they create a monthly target for their team
    Then the target stores period, scope and metric definition
    And workers see their own or permitted team progress without cross-team totals
  @HOF-028-S02
  Scenario: Report activities without inflating unique people
    Given two outreach activities involving the same confirmed Person
    When an outreach report is submitted and verified
    Then activity count and unique-person count remain separate
    And the leaderboard uses its configured verified metric rather than duplicate captures
  @HOF-028-S03
  Scenario: View ranking with current filters
    Given verified outreach data and an enabled leaderboard
    When a member selects a period
    Then the UI shows authorized ranking, their own position and metric definition
    And disabling the flag hides the view and denies its API
```

### HOF-029 — Transport requests, dispatch, capacity and completion

Sources: specification Domain 7; Gherkin Epic 7. Architecture: feature catalog HOF-029 and shared contracts. Phase: 3.

```gherkin
@HOF-029
Feature: Transport requests, dispatch, capacity and completion
  @HOF-029-S01
  Scenario: Request transport and track status
    Given a member or authorized worker requesting transport for a service
    When pickup area, destination and passenger count are submitted
    Then a pending request appears in the requester's view and the branch dispatch queue
    And it is not shown as scheduled until allocation succeeds
  @HOF-029-S02
  Scenario: Allocate available capacity atomically
    Given a trip with two remaining seats
    When concurrent requests each attempt to allocate two seats
    Then at most one allocation succeeds
    And the dispatcher sees a conflict for the other without overselling capacity
  @HOF-029-S03
  Scenario: Driver sees operational passenger details only
    Given a driver assigned to a trip
    When they open the pickup roster
    Then they see necessary passenger contact and pickup details
    And no unrelated pastoral, academy or child records are returned
  @HOF-029-S04
  Scenario: Cancellation and no-show are distinct
    Given a scheduled request
    When it is cancelled before departure or recorded as no-show after departure
    Then its correct status and audit history are retained
    And cancellation releases capacity while completion is never inferred from notification delivery
  @HOF-029-S05
  Scenario: Dispatch notification failure is visible
    Given a scheduled pickup whose SMS provider fails
    When delivery retries are exhausted
    Then the trip remains scheduled and a communication failure is visible to dispatch
    And the system does not duplicate the allocation while retrying the message
```

### HOF-030 — Households, relationships and guardian authority

Sources: clarity 12; Gherkin Epic 13. Architecture: feature catalog HOF-030 and shared contracts. Phase: 3.

```gherkin
@HOF-030
Feature: Households, relationships and guardian authority
  @HOF-030-S01
  Scenario: Record kinship without granting access
    Given two People in the same organization
    When an authorized worker records a parent-child relationship
    Then relationship history is saved
    And it does not grant login, confidential record, consent or pickup authority
  @HOF-030-S02
  Scenario: Verify scoped guardian authority
    Given reviewed evidence for an adult to act for a child
    When an authorized reviewer records authority type and validity dates
    Then only the named actions become available for that child
    And the dependent view excludes fields outside that authority
  @HOF-030-S03
  Scenario: Revoke authority immediately
    Given an adult with active pickup authority
    When an authorized reviewer revokes it
    Then the next pickup or dependent-access request is denied
    And the historical relationship and prior authorized actions remain traceable
  @HOF-030-S04
  Scenario: Organize a household independently of accounts
    Given family members with and without app accounts
    When a household is created with their Person references
    Then the directory groups them without creating shared credentials
```

### HOF-031 — Kids profiles, check-in and secure pickup

Sources: specification Domain 8; Gherkin Epic 14; clarity 11–12. Architecture: feature catalog HOF-031 and shared contracts. Phase: 3.

```gherkin
@HOF-031
Feature: Kids profiles, check-in and secure pickup
  @HOF-031-S01
  Scenario: Check in a child for a specific session
    Given an authorized kids worker and a child with reviewed profile details
    When the child is checked into a session
    Then one active check-in and an expiring session-bound pickup credential are created
    And the roster shows only necessary child and allergy information
  @HOF-031-S02
  Scenario: Release only to currently authorized adult
    Given an active check-in and a valid unused pickup credential
    When the worker verifies the presenting adult's current pickup authority
    Then the release is recorded once with child, adult, worker and time
    And subsequent use reports already released without another pickup event
  @HOF-031-S03
  Scenario Outline: Unsafe pickup is refused
    Given a pickup request with <condition>
    When verification is attempted
    Then release is refused and the incident or failed attempt is recorded appropriately
    And the UI offers only the authorized escalation path
    Examples:
      | condition |
      | expired code |
      | code from another session |
      | revoked guardian authority |
      | kinship but no pickup authority |
      | too many failed attempts |
  @HOF-031-S04
  Scenario: Safeguarding projection is field-specific
    Given a worker permitted to see allergy precautions but not other confidential care notes
    When the child roster is loaded
    Then the response includes the necessary allergy projection only
    And hidden fields are not sent to the browser
```

### HOF-032 — Books, merchandise, stock and transfer sales

Sources: Backlog IC 4; specification 4.4. Architecture: feature catalog HOF-032 and shared contracts. Phase: 4.

```gherkin
@HOF-032
Feature: Books, merchandise, stock and transfer sales
  @HOF-032-S01
  Scenario: Maintain branch catalog and stock
    Given an authorized inventory worker
    When they add an item variant, price, currency and initial quantity
    Then a branch item and stock movement are created
    And the catalog shows availability and configurable low-stock warnings
  @HOF-032-S02
  Scenario: Record a bank-transfer sale
    Given fifteen books priced at 350000 minor units each
    When a worker sells two with transfer reference evidence
    Then a sale for 700000 minor units and stock decrement to thirteen commit together
    And the receipt distinguishes recorded evidence from independently verified bank payment
  @HOF-032-S03
  Scenario: Concurrent sales cannot oversell
    Given one remaining item
    When two workers each submit a sale for one item
    Then only one sale succeeds
    And the other UI shows insufficient stock without a partial sale record
  @HOF-032-S04
  Scenario: Reverse a sale with an audit trail
    Given a recorded sale and an authorized reversal reason
    When a valid quantity is reversed
    Then compensating stock and sale records are appended
    And cumulative reversed quantity cannot exceed the original sale
  @HOF-032-S05
  Scenario: Payment evidence is restricted
    Given an uploaded proof-of-transfer image
    When an unauthorized person guesses its attachment ID
    Then neither metadata nor file contents are returned
```

### HOF-033 — Announcements, presenter bulletin and expiry

Sources: Backlog IC 5; specification 4.5. Architecture: feature catalog HOF-033 and shared contracts. Phase: 4.

```gherkin
@HOF-033
Feature: Announcements, presenter bulletin and expiry
  @HOF-033-S01
  Scenario: Publish to a scoped audience
    Given an authorized editor and a draft announcement with branch, audience and schedule
    When it is published
    Then matching members and the permitted service bulletin see it during its active interval
    And members in another branch or outside its audience do not receive it
  @HOF-033-S02
  Scenario: Expiration does not depend on cron timing
    Given an announcement whose expiration time has passed
    When a member loads the dashboard before the archival worker runs
    Then the API excludes the expired announcement
    And the management view can still show it in history
  @HOF-033-S03
  Scenario: Archive or revise with provenance
    Given a published announcement
    When an authorized editor archives or revises it
    Then the version history and publication actor remain recorded
    And cached member feeds stop showing withdrawn content
```

### HOF-034 — Events, registration, reminders and attendance

Sources: Gherkin Epic 15; source ChurchEvent model. Architecture: feature catalog HOF-034 and shared contracts. Phase: 4.

```gherkin
@HOF-034
Feature: Events, registration, reminders and attendance
  @HOF-034-S01
  Scenario: Create an event and register
    Given an authorized branch event organizer
    When they publish an event with timezone, occurrences and registration policy
    Then eligible members can view it and register once
    And configured capacity or waitlist rules are enforced by the server
  @HOF-034-S02
  Scenario: Reschedule without sending obsolete reminders
    Given registrations and a queued event reminder
    When the organizer reschedules the event
    Then the new version and affected reminder schedule are recorded
    And obsolete reminders are cancelled or reconciled before dispatch
  @HOF-034-S03
  Scenario: Cancel while preserving attendance history
    Given an event with past attendance and future occurrences
    When it is cancelled
    Then future registrations and notifications reflect cancellation
    And historical attendance remains linked to its original occurrence
```

### HOF-035 — Email, SMS, templates, inbox and delivery status

Sources: specification Domain 10; Gherkin Epic 11. Architecture: feature catalog HOF-035 and shared contracts. Phase: 1–4.

```gherkin
@HOF-035
Feature: Email, SMS, templates, inbox and delivery status
  @HOF-035-S01
  Scenario: Preview and send an authorized message
    Given an allowed template, scoped recipients and permitted message purpose
    When an authorized worker previews and submits delivery
    Then a durable job records template version, recipient decision and actor
    And the UI distinguishes queued, provider-accepted, delivered and failed states
  @HOF-035-S02
  Scenario: Provider timeout does not cause uncontrolled duplicate sends
    Given a send attempt with an ambiguous provider response
    When the worker retries processing
    Then the logical delivery key is reused and provider reconciliation is attempted
    And an unresolved result remains unknown rather than being reported delivered
  @HOF-035-S03
  Scenario: Contact preferences and current access are rechecked
    Given a queued optional greeting and a recipient who withdraws that preference
    When the worker processes the job
    Then the optional delivery is cancelled
    And sensitive-link recipients must still have current record access
  @HOF-035-S04
  Scenario: All existing template purposes are supported
    Given configured templates for magic link, OTP, new member, visitor welcome, birthday, anniversary, team assignment, pastoral alert, event reminder and donation receipt
    When each purpose is previewed with valid test data
    Then the renderer provides a correctly branded accessible message
    And template existence alone does not mark its trigger or delivery integration complete
  @HOF-035-S05
  Scenario: Development and automated tests do not contact real people
    Given a development or test environment
    When a message is triggered
    Then a fake or restricted sink captures redacted delivery evidence
    And credentials, claim tokens and confidential content are not written to ordinary logs
  @HOF-035-S06
  Scenario: Notification inbox is scoped
    Given unread notifications for several recipients
    When one member opens and acknowledges their inbox
    Then only their authorized notifications change read state
    And acknowledging an alert does not itself close its domain case
```

### HOF-036 — Personal, departmental and executive dashboards and dossiers

Sources: specification Domain 3; Gherkin Epic 2. Architecture: feature catalog HOF-036 and shared contracts. Phase: 2–4.

```gherkin
@HOF-036
Feature: Personal, departmental and executive dashboards and dossiers
  @HOF-036-S01
  Scenario: Personal dashboard shows actionable own data
    Given a member with classes, teams, outreach and follow-up permissions
    When Home is opened
    Then permitted personal progress, upcoming items and announcements are displayed
    And missing data is shown as empty rather than replaced with demo totals
  @HOF-036-S02
  Scenario: Branch pastor views scoped operational health
    Given a pastor with branch oversight grants
    When they open departmental summaries
    Then metrics are limited to the authorized branch and permitted categories
    And cross-team oversight does not automatically reveal confidential case bodies
  @HOF-036-S03
  Scenario: Organization dossier preserves branch origins
    Given an executive with organization discovery permission and a transferred Person
    When the dossier is opened
    Then permitted journey, service and outreach records show original branches and dates
    And confidential sections require additional explicit grants
  @HOF-036-S04
  Scenario: Technical administrator has no implicit dossier clearance
    Given a platform administrator without ministry-sensitive grants
    When they request pastoral dossier data
    Then the API denies that section
    And the UI continues to expose only their authorized technical functions
```

### HOF-037 — Analytics, executive PDF and CSV exports

Sources: Backlog Executive 5; specification 3.2. Architecture: feature catalog HOF-037 and shared contracts. Phase: 4.

```gherkin
@HOF-037
Feature: Analytics, executive PDF and CSV exports
  @HOF-037-S01
  Scenario: Report metrics with defined denominators
    Given visits, confirmed people, transfers and outreach activities in a reporting window
    When an authorized executive requests conversion and retention metrics
    Then each metric uses its documented cohort, period and distinct-count rule
    And branch transfers do not count as new organization membership
    And the view states filters, timezone and data freshness
  @HOF-037-S02
  Scenario: Generate a scoped PDF or CSV asynchronously
    Given an authorized report filter and export capability
    When the user requests an export
    Then a job captures filter and policy context and returns progress
    And a completed PDF or formula-safe CSV matches the permitted report projection
  @HOF-037-S03
  Scenario: Revoked access prevents later export download
    Given an export requested before the user's access is revoked
    When it executes or the user later attempts download
    Then current authorization is checked again
    And the expired or unauthorized file is not disclosed
  @HOF-037-S04
  Scenario: Empty and failed exports are distinguishable
    Given no matching rows or a failed rendering worker
    When export status is displayed
    Then the UI differentiates a valid empty report from generation failure
    And retry does not silently change the selected date range or scope
```

### HOF-038 — Feature flags, settings, localization and governance

Sources: Backlog Super Admin 3/7; specification 2.3–2.4. Architecture: feature catalog HOF-038 and shared contracts. Phase: 1–4.

```gherkin
@HOF-038
Feature: Feature flags, settings, localization and governance
  @HOF-038-S01
  Scenario: Disable a branch module
    Given Transport enabled globally and in a branch
    When an authorized administrator disables that branch's override
    Then its navigation and API become unavailable in that branch
    And disabling a module does not erase its history or alter another branch
  @HOF-038-S02
  Scenario: Enabling a feature does not grant permission
    Given a member without inventory capabilities
    When inventory is enabled for their branch
    Then the member still cannot operate inventory APIs or management screens
  @HOF-038-S03
  Scenario: Edit settings with validation and history
    Given an authorized configuration editor
    When they change timezone, attendance threshold or notification configuration
    Then the API validates values, records a settings version and refreshes affected caches
    And invalid values preserve the previous configuration
  @HOF-038-S04
  Scenario: Governance cannot grant unrestricted sensitive access accidentally
    Given a role-template change for platform administration
    When the role matrix is saved
    Then sensitivity grants and organizational scopes remain separately controlled
    And the audit records what changed without including stored secret values
  @HOF-038-S05
  Scenario: Maintenance mode preserves controlled recovery access
    Given a scheduled maintenance window
    When maintenance mode is activated
    Then ordinary writes receive a clear temporary-unavailable response
    And authorized diagnostics and recovery procedures remain usable
```

### HOF-039 — Audit trail, diagnostics and failed-job operations

Sources: Backlog Super Admin 6/7; specification 2.5. Architecture: feature catalog HOF-039 and shared contracts. Phase: 1.

```gherkin
@HOF-039
Feature: Audit trail, diagnostics and failed-job operations
  @HOF-039-S01
  Scenario: Audit a sensitive action
    Given an authorized approval, merge, appointment, transfer or sensitive export
    When the operation commits
    Then its audit records actor, assignment, scope, resource, outcome and correlation ID
    And confidential payloads or credentials are not copied into generic audit metadata
  @HOF-039-S02
  Scenario: Filter audit events without modifying them
    Given an auditor with permitted organizational scope
    When they filter by actor, action, branch and date
    Then only authorized immutable events are returned
    And application update/delete requests against those events are rejected
  @HOF-039-S03
  Scenario: Diagnostics separate public readiness from private detail
    Given a public health probe and an authenticated platform diagnostic user
    When each requests status
    Then the public probe receives minimal liveness/readiness information
    And only the administrator can see redacted dependency and queue diagnostics
  @HOF-039-S04
  Scenario: Replay failed jobs safely
    Given a failed event visible to an authorized operator
    When the operator retries it after fixing the cause
    Then consumer idempotency prevents duplicate domain outcomes
    And replay attempts and final outcome are recorded
  @HOF-039-S05
  Scenario: Audit storage resists application mutation and detects tampering
    Given application database credentials and an exported signed audit checkpoint
    When an update or deletion is attempted through those credentials
    Then the database rejects it independently of the UI
    And integrity verification detects missing or altered checkpointed events
```

### HOF-040 — Work queues and durable cross-domain coordination

Sources: clarity 9–10; Backlog team todos. Architecture: feature catalog HOF-040 and shared contracts. Phase: 1.

```gherkin
@HOF-040
Feature: Work queues and durable cross-domain coordination
  @HOF-040-S01
  Scenario: Domain operation completes its task
    Given a work item requesting profile review
    When its assignee performs the authorized domain approval
    Then the approved profile result is linked to task completion
    And the task cannot declare approval merely by changing its status field
  @HOF-040-S02
  Scenario: Crash after commit does not lose handoff
    Given a visitor transaction with an outbox event
    When the API process stops after database commit but before worker delivery
    Then the restarted worker delivers the event
    And one welcome task appears without repeating the visitor capture
  @HOF-040-S03
  Scenario: Replayed or out-of-order events preserve correctness
    Given a consumer with an already processed event and a later aggregate-version gap
    When those events arrive
    Then the duplicate produces no repeated action and the gap is deferred or reconciled
    And failed work becomes visible rather than being silently dropped
  @HOF-040-S04
  Scenario: Due, blocked and cancelled work remain distinct
    Given a team queue with assigned and overdue work
    When a lead reassigns, blocks or cancels an item with a reason
    Then the queue and assignee view show the new coordination state
    And no completed domain fact is reversed by reopening the task
```

### HOF-041 — Personal profile, member experience, guides and legal pages

Sources: Gherkin Epics 9/12/17; V2 workspace proposals. Architecture: feature catalog HOF-041 and shared contracts. Phase: 1–4.

```gherkin
@HOF-041
Feature: Personal profile, member experience, guides and legal pages
  @HOF-041-S01
  Scenario: Update personal information through proper authority
    Given a signed-in member
    When they upload their own photo or propose a governed name/contact change
    Then the photo is validated under self-service rules and governed fields enter review
    And they cannot change membership standing or operational roles through the profile payload
  @HOF-041-S02
  Scenario: View personal journey, classes and teams
    Given a member with recorded achievements, enrollments and roster memberships
    When they open My Journey, My Classes or My Teams
    Then each view uses the same Person identity and appropriate history
    And no membership in a team implies access to that team's administrative functions
  @HOF-041-S03
  Scenario: Contextual help and public legal pages work
    Given a visitor or authorized workspace user
    When they open legal pages or the guide for their workspace
    Then legal information is publicly readable and operational help is context appropriate
    And unknown routes and forbidden routes have distinct usable views
  @HOF-041-S04
  Scenario: Profile errors remain accessible
    Given an invalid photo or required-field error
    When the form is submitted
    Then the UI identifies the failing field and preserves other input
    And keyboard and screen-reader users can reach the error and retry
```

### HOF-042 — V3 public QR visitor intake

Sources: Backlog IC 6; specification 4.6. Architecture: feature catalog HOF-042 and shared contracts. Phase: V3.

```gherkin
@HOF-042
Feature: V3 public QR visitor intake
  @HOF-042-S01
  Scenario: Submit a public visitor slip without an account
    Given an active branch with approved QR intake enabled
    When a visitor scans its code and submits the mobile form
    Then a provisional capture enters that branch's intake queue
    And the receipt does not create trusted credentials or reveal existing directory matches
  @HOF-042-S02
  Scenario: Abuse controls protect public intake
    Given a disabled branch, expired intake context or excessive submissions
    When a public submission is attempted
    Then the system rejects or throttles it without revealing private records
    And repeated valid submissions with the same idempotency key do not create duplicate visits
  @HOF-042-S03
  Scenario: Staff review reuses the canonical identity workflow
    Given a queued QR capture that may match an existing Person
    When authorized staff review it
    Then the same candidate-review and separate-person rules apply as assisted intake
    And QR capture does not bypass profile verification or account claiming
```

### HOF-043 — Restricted files, privacy preferences and retention

Sources: clarity 11–15; source attachments and legal pages. Architecture: feature catalog HOF-043 and shared contracts. Phase: 1–4.

```gherkin
@HOF-043
Feature: Restricted files, privacy preferences and retention
  @HOF-043-S01
  Scenario: Upload and access a restricted attachment
    Given an authorized user attaching a permitted file type within size limits
    When upload validation succeeds
    Then the file is stored privately with organization, subject and sensitivity metadata
    And download authorization is checked independently of possession of its URL
  @HOF-043-S02
  Scenario: Reject unsafe upload without losing the form
    Given an unsupported, oversized or invalid attachment
    When upload is attempted
    Then no public file is published
    And the UI provides a recoverable error while preserving the rest of the form
  @HOF-043-S03
  Scenario: Record a correction or access request
    Given a person seeking correction of their information
    When an authorized request is recorded
    Then a scoped review case is created with identity verification requirements
    And completion applies approved amendments without silently erasing audit history
  @HOF-043-S04
  Scenario: Retention respects policy and holds
    Given records reaching an approved retention threshold
    When a scheduled retention job runs
    Then it processes only eligible records without active holds
    And deletion, anonymization or preservation outcomes are audited without retaining prohibited content in logs
```

### HOF-044 — Migration, reconciliation and cutover

Sources: clarity 15; all legacy schemas. Architecture: feature catalog HOF-044 and shared contracts. Phase: 0–4.

```gherkin
@HOF-044
Feature: Migration, reconciliation and cutover
  @HOF-044-S01
  Scenario: Dry-run all legacy entity mappings
    Given immutable source snapshots and an approved migration map
    When a migration dry-run executes
    Then every source row maps to a target representation or explicit quarantine reason
    And legacy IDs remain traceable without phone/email-only automatic merges
  @HOF-044-S02
  Scenario: Reconcile branch history and identities
    Given merged candidates, accounts, visits, assessments, SitReps and transfers
    When reconciliation runs
    Then it checks represented people, account links, affiliations, origins and domain totals
    And differences are explained by reviewed mappings rather than hidden by aggregate totals
  @HOF-044-S03
  Scenario: Cutover requires evidence
    Given unresolved orphaned accounts or a failed backup restore rehearsal
    When production activation is requested
    Then the cutover gate refuses activation
    And the operator sees the specific unresolved checks
  @HOF-044-S04
  Scenario: Rollback preserves post-cutover work
    Given V2 writes accepted during the rollback window
    When rollback is required
    Then the approved change-journal reconciliation procedure preserves those writes
    And restoring an older snapshot alone is not reported as a successful rollback
  @HOF-044-S05
  Scenario: Retired routes cannot bypass V2 rules
    Given a migrated domain with a legacy API route still reachable
    When a caller attempts a legacy write
    Then it is rejected or handled through a reviewed V2 adapter with the same authorization
```

### HOF-045 — Cross-cutting quality, accessibility and release

Sources: product-analysis risk themes; repository workflow. Architecture: feature catalog HOF-045 and shared contracts. Phase: Every phase.

```gherkin
@HOF-045
Feature: Cross-cutting quality, accessibility and release
  @HOF-045-S01
  Scenario: Every protected feature has backend and frontend evidence
    Given a feature proposed as verified
    When its acceptance record is reviewed
    Then it includes schema, API, authorization, worker where applicable and browser evidence
    And a page, template, schema or green build alone cannot satisfy completion
  @HOF-045-S02
  Scenario: Mobile and keyboard workflows remain usable
    Given a 360px mobile viewport, tablet or desktop with keyboard-only navigation
    When intake, calling, claim and operational forms are used
    Then required controls, labels, errors and focus order remain usable
    And map-dependent information also has an accessible text representation
  @HOF-045-S03
  Scenario: Production configuration fails closed
    Given missing production secrets or default administrative credentials
    When the application starts
    Then startup fails with redacted actionable diagnostics
    And no insecure fallback account or signing secret is activated
  @HOF-045-S04
  Scenario: Continuous integration enforces the release path
    Given a feature branch with changes
    When a pull request targets dev
    Then backend tests/build/vet, boundary checks, frontend lint/build and configured acceptance tests run
    And deployment promotion follows dev to staging and staging to main
  @HOF-045-S05
  Scenario: Performance is measured against declared conditions
    Given agreed dataset size, concurrency, hardware and network conditions
    When read, write, mobile-load and urgent-dispatch budgets are tested
    Then measured percentiles and failures are recorded with those conditions
    And missed budgets remain visible instead of being described as verified performance
  @HOF-045-S06
  Scenario: Unauthorized cross-origin mutation is rejected
    Given cookie authentication and a missing or invalid CSRF token or disallowed origin
    When a state-changing request is submitted
    Then it is rejected without a domain mutation
    And production CORS does not reflect arbitrary origins
  @HOF-045-S07
  Scenario: Sensitive inputs never appear in ordinary logs
    Given login, claim and pastoral operations with synthetic secret markers
    When requests and responses are processed
    Then logs contain correlation and outcome metadata without those secret markers
    And public errors contain no database query, stack trace or private payload
  @HOF-045-S08
  Scenario: Authentication throttling is enforced across workers
    Given repeated failed authentication requests distributed across API instances
    When the shared attempt limit is reached
    Then further requests are throttled consistently
    And retry guidance does not disclose whether a Person exists
```

### HOF-046 — External donation record and receipt compatibility

Sources: Gherkin Epic 11; donation_receipt template. Architecture: feature catalog HOF-046 and shared contracts. Phase: 4.

```gherkin
@HOF-046
Feature: External donation record and receipt compatibility
  @HOF-046-S01
  Scenario: Issue a receipt for an externally recorded donation
    Given an authorized worker with an external donation reference, amount, currency and donor linkage
    When they preview and issue the receipt
    Then a receipt record and delivery job are created once
    And the UI does not imply that Heritage processed a payment or verified tax deductibility
  @HOF-046-S02
  Scenario: Correct a receipt through reversal
    Given a receipt with an incorrect amount
    When an authorized reviewer reverses and replaces it with a reason
    Then the original remains traceable and the replacement references it
    And repeated delivery does not create another donation record
  @HOF-046-S03
  Scenario: Receipt access is limited
    Given a donor with an authorized personal account
    When they open their receipt history
    Then only their permitted receipts are visible
    And another member cannot download a receipt by changing its ID
```

### HOF-047 — Generic ministry roster, duty schedules and team work

Sources: V2 report team workspace; Backlog Global 3. Architecture: feature catalog HOF-047 and shared contracts. Phase: 3.

```gherkin
@HOF-047
Feature: Generic ministry roster, duty schedules and team work
  @HOF-047-S01
  Scenario: Manage a team roster independently from permissions
    Given a Choir, Ushering, Media, Protocol or other team lead with roster authority
    When they add a member to the roster or end roster membership
    Then dated roster history is retained
    And operational grants change only through explicit assignment commands
  @HOF-047-S02
  Scenario: Schedule duty and record attendance
    Given a service occurrence and available team workers
    When the lead schedules duty and records who served
    Then the schedule and duty attendance are linked to that team and occurrence
    And a worker sees their own duty without gaining roster-management authority
  @HOF-047-S03
  Scenario: Team tasks and reports stay within department
    Given department tasks, attendance and a team lead
    When the lead assigns work or opens a team report
    Then results remain within the lead's grant scope
    And ordinary workers see only their permitted assignments and summaries
```

### HOF-048 — Sector leadership and cell ministry

Sources: Backlog Global 3; legacy Sector/UserSector. Architecture: feature catalog HOF-048 and shared contracts. Phase: 3.

```gherkin
@HOF-048
Feature: Sector leadership and cell ministry
  @HOF-048-S01
  Scenario: Sector leader views their geographic roster
    Given a lead appointed to one sector
    When they open My Sector
    Then the server returns only permitted members of that sector
    And neighboring sectors do not become accessible by changing filters
  @HOF-048-S02
  Scenario: Record a cell meeting and attendance
    Given an authorized sector leader and a scheduled cell meeting
    When attendance is recorded
    Then records retain sector, branch, occurrence and actor
    And duplicates do not inflate attendance or church-service eligibility
  @HOF-048-S03
  Scenario: Sector pastoral action respects sensitivity
    Given a sector member needing care
    When the lead records a permitted SitRep or escalates it
    Then category-specific access and notification rules apply
    And sector leadership does not automatically reveal the member's entire pastoral history
```

## Source coverage and disposition

Every numbered backlog feature, original Gherkin feature and numbered system-specification feature is mapped below. Mapping proves requirements accounting, not application implementation. Conflicting behaviors are superseded by the decisions in the architecture; notably self-registration, historical foreign-key migration, broad executive bypass and individual public map disclosure.

### BACKLOG.md

| Source feature (line) | V2 feature IDs |
|---|---|
| 1. Visitor / First-Timer Intake & Profile Capture (64) | HOF-013, HOF-010, HOF-011 |
| 2. Visitor Attendance & Service Presence Tracking (116) | HOF-014 |
| 3. Foundation Class Recommendation & Membership Handoff (153) | HOF-015 |
| 4. Books & Merchandise Inventory & Transfer Sales Tracker (193) | HOF-032 |
| 5. Local Church Announcements Hub & Expiration Manager (239) | HOF-033 |
| 6. (Future Version 3) Self-Service QR Visitor Intake Kiosk (278) | HOF-042 |
| 1. Member Profile Enrichment & Maker-Checker Approval Queue (307) | HOF-017 |
| 2. First-Timer Follow-Up CRM, Manual Delegation & Weekly Pastor Collation (359) | HOF-016, HOF-035 |
| 3. Discipleship Academy Pipeline & Continuous Assessment Engine (407) | HOF-019, HOF-020 |
| 4. Pseudo-Team Volunteering Intake & Assignment (Post-Module 2) (466) | HOF-021 |
| 5. Milestone Celebrations & Proactive 3-Day Alert Engine (505) | HOF-022 |
| 6. Situation Reports (SitRep) & Longitudinal Pastoral Care Log (542) | HOF-023 |
| 7. First-Timer Intake-to-Member Formal Profiling Pipeline (Gatekeeper Flow) (586) | HOF-017, HOF-002 |
| 8. Inter-Branch Member Transfer & Longitudinal History Migration (629) | HOF-024 |
| 1. Local Church Branch Provisioning, Archival & Leadership Assignment (701) | HOF-006, HOF-007 |
| 2. Executive Leadership Magic Link Invitation & Management Engine (745) | HOF-007 |
| 3. Granular Branch & Global Feature Flag Management (781) | HOF-038 |
| 4. General Overseer 360° Universal Member Intelligence Dossier & Cross-Branch Search (819) | HOF-036 |
| 5. Cross-Branch Executive Analytics & Report Generator (PDF/CSV) (860) | HOF-037 |
| 6. Platform Security Center & Immutable Audit Trail (905) | HOF-039 |
| 7. Comprehensive Platform System Settings, Governance & Role Matrix Engine (938) | HOF-038, HOF-039 |
| 1. Pre-Profiled Magic Link Onboarding & Welcome Activation Wizard (988) | HOF-002 |
| 2. Security PIN & Biometric Quick-Login Engine (1038) | HOF-004, HOF-005 |
| 3. Multi-Role Management, Team Lead Permission Delegation & Sector Leadership Engine (1077) | HOF-008, HOF-009, HOF-047, HOF-048 |

### GHERKIN_STORIES.md

| Source feature (line) | V2 feature IDs |
|---|---|
| Standard Email/Password Login (11) | HOF-001 |
| Google OAuth Login (43) | HOF-003 |
| Magic Link Login (66) | HOF-002 |
| OTP Invite & Account Claim (102) | HOF-002, HOF-007 |
| User Registration (144) | HOF-002, HOF-042 |
| Main Dashboard (171) | HOF-036 |
| Executive Analytics (199) | HOF-036, HOF-037 |
| Outreach Leaderboard (222) | HOF-028 |
| Soul Registration (247) | HOF-025 |
| Soul Journal (285) | HOF-026 |
| Follow-Up Tracking (312) | HOF-016, HOF-026 |
| Visitor Intake (358) | HOF-012, HOF-013 |
| IC Member Directory (396) | HOF-012 |
| Attendance Tracking (424) | HOF-014 |
| Foundation Class Candidates (454) | HOF-015 |
| Member Profile Management (479) | HOF-010, HOF-012, HOF-017, HOF-041 |
| Maker-Checker Approval Queue (529) | HOF-017 |
| Member Journey & Stage Tracking (560) | HOF-018 |
| Birthday & Anniversary Trackers (589) | HOF-022 |
| Inter-Branch Transfers (621) | HOF-024 |
| Discipleship Academy (649) | HOF-019, HOF-020 |
| Volunteer Intake (683) | HOF-021 |
| Pastoral Situation Reports (712) | HOF-023 |
| First-Timer CRM (741) | HOF-016 |
| Visitor Profiling Queue (768) | HOF-017, HOF-002 |
| Transport Request Management (793) | HOF-029 |
| Local Church Management (832) | HOF-006 |
| Sector Management (860) | HOF-006, HOF-048 |
| Team Management (882) | HOF-006, HOF-008, HOF-040, HOF-047 |
| Feature Flag Management (916) | HOF-038 |
| User Role Management (950) | HOF-008 |
| Audit Log (977) | HOF-039 |
| Super Admin Guide (999) | HOF-041 |
| Geographic Member Map (1027) | HOF-027 |
| Transactional Email System (1062) | HOF-035, HOF-046 |
| User Profile (1132) | HOF-041 |
| Guardian/Family Relationships (1165) | HOF-030 |
| Kids Ministry Profile (1190) | HOF-031 |
| Church Events (1213) | HOF-034 |
| Outreach Reports & Targets (1241) | HOF-028 |
| Legal Pages (1269) | HOF-041, HOF-043 |
| Route Protection (1292) | HOF-001, HOF-008, HOF-009, HOF-045 |

### heritage_superapp_system_specification.md

| Source feature (line) | V2 feature IDs |
|---|---|
| 1.1: Standard Email & Password Authentication [Completed] (399) | HOF-001 |
| 1.2: Pre-Profiled Google OAuth Authentication [Completed] (425) | HOF-003 |
| 1.3: Pre-Profiled Account Claiming & Magic Link Request [Completed] (448) | HOF-002 |
| 1.4: 5-Step Magic Link Onboarding Activation Wizard [Completed] (470) | HOF-002 |
| 1.5: Security PIN Verification & Lockout Engine [Completed] (491) | HOF-004, HOF-005 |
| 2.1: Local Church Branch Provisioning & Management [Completed] (517) | HOF-006 |
| 2.2: Executive Leadership Magic Link Invitation [Completed] (542) | HOF-007 |
| 2.3: Dynamic Feature Flag & Module Matrix Engine [Completed] (564) | HOF-038 |
| 2.4: Granular Role Permissions Matrix [Completed] (579) | HOF-008, HOF-038 |
| 2.5: Immutable Security Audit Trail [Completed] (594) | HOF-039 |
| 3.1: General Overseer 360° Universal Member Dossier [Completed] (613) | HOF-036 |
| 3.2: Cross-Branch Executive Analytics & Report Generation [Completed] (633) | HOF-037 |
| 4.1: First-Timer Visitor Intake & Duplicate Detection [Completed] (651) | HOF-013, HOF-011 |
| 4.2: Returning Visitor Attendance Tracking [Completed] (674) | HOF-014 |
| 4.3: Foundation Class Recommendation & Handoff [Completed] (690) | HOF-015 |
| 4.4: Books & Merchandise Inventory & Transfer Sales Tracker [Incomplete / Planned] (707) | HOF-032 |
| 4.5: Local Church Announcements Hub & Expiration Manager [Incomplete / Planned] (730) | HOF-033 |
| 4.6: Self-Service QR Visitor Intake Kiosk (V3 Planned) [Incomplete / Planned] (746) | HOF-042 |
| 5.1: First-Timer Profiling Pipeline (Gatekeeper Flow) [Completed] (765) | HOF-017, HOF-002 |
| 5.2: Maker-Checker Profile Change Approval Queue [Completed] (783) | HOF-017 |
| 5.3: First-Timer Follow-Up CRM & Pastoral Collation [Completed] (802) | HOF-016 |
| 5.4: Discipleship Academy 6-Part Continuous Assessment Engine [Completed] (819) | HOF-019, HOF-020 |
| 5.5: Pseudo-Team Volunteering Intake & Department Placement [Completed] (847) | HOF-021 |
| 5.6: Milestone Celebrations & 3-Day Proactive Alert Engine [Completed] (864) | HOF-022 |
| 5.7: Life Landmarks & Academic Graduation Tracker [Completed] (879) | HOF-022 |
| 5.8: Longitudinal Pastoral Situation Reports (SitRep) [Completed] (893) | HOF-023 |
| 5.9: Inter-Branch Member Transfer & History Migration [Completed] (909) | HOF-024 |
| 6.1: GPS-Tagged Soul Outreach Registration [Completed] (934) | HOF-025 |
| 6.2: Personal Soul Evangelism Journal [Completed] (952) | HOF-026 |
| 6.3: Geospatial Outreach Map & Public Map View [Completed] (967) | HOF-027 |
| 6.4: Outreach Targets & Leaderboard [Completed] (981) | HOF-028 |
| 7.1: Sunday Service Transport Coordination [Completed] (998) | HOF-029 |
| 8.1: Kids Ministry Profiles & Guardian Relations [Completed] (1017) | HOF-030, HOF-031 |
| 9.1: Strict Team Route & API Isolation [Completed] (1038) | HOF-008, HOF-009 |
| 9.2: Team Lead Permission Delegation Matrix [Incomplete / Planned] (1060) | HOF-008 |
| 9.3: Multi-Role Instant Workspace Switcher [Incomplete / Planned] (1076) | HOF-009 |
| 10.1: Multi-Template Transactional Email Dispatcher [Completed] (1094) | HOF-035 |

### clarity.md invariants and remaining source evidence

| clarity invariant(s) | Acceptance coverage |
|---|---|
| 1–2 Person is not Account; account optional | HOF-010, HOF-013, HOF-017 |
| 3 Historical affiliations and primary-affiliation policy | HOF-024, architecture P02 |
| 4–5 Standing and journey are not roles | HOF-018, HOF-021 |
| 6–8 Assignments and independent scoped grants | HOF-008, HOF-009 |
| 9 Organization identity with scoped visibility | HOF-010, HOF-011, HOF-036 |
| 10–11 Matching evidence and audited correction | HOF-010, HOF-011 |
| 12–14 Transfer origins, achievements and recognition | HOF-024 |
| 15 Domain truth versus work coordination | HOF-040 |
| 16 Durable idempotent events | HOF-015, HOF-025, HOF-040 |
| 17 Sensitive records separate from directory access | HOF-023, HOF-031, HOF-036, HOF-043 |
| 18 Relationship versus authority | HOF-030, HOF-031 |
| 19 Claim channel versus Person ownership | HOF-002, HOF-003, HOF-005 |
| 20 Auditable historical corrections | HOF-014, HOF-018, HOF-020, HOF-023, HOF-039 |
| 21 Reconciled migration and rollback | HOF-044 |
| 22 First vertical slice before broad expansion | HOF-001–HOF-003, HOF-005, HOF-008–HOF-017, HOF-035, HOF-039–HOF-040; architecture phases |

`PROJECT_TREE.md` is structural evidence: identity/profile → HOF-001–HOF-005/HOF-010/HOF-041; administration/teams → HOF-006–HOF-009/HOF-038–HOF-039/HOF-047–HOF-048; IC/Membership → HOF-012–HOF-024; souls/follow-up/maps → HOF-025–HOF-028; transport → HOF-029; family/kids → HOF-030–HOF-031; dashboard/analytics → HOF-036–HOF-037; legal → HOF-041/HOF-043. The architecture migration map accounts for all 38 legacy schema files.

`product-analysis.md` supplies historical risk hypotheses, not current findings. Authentication/secrets/session risks map to HOF-001–HOF-005/HOF-045; identity drift to HOF-010–HOF-011/HOF-044; route and scope enforcement to HOF-008–HOF-009; logging/audit to HOF-039/HOF-045; layering, forms, state, type safety, testing and CI to architecture sections 4, 10 and 14 and HOF-045. Framework and dependency claims were checked against current manifests; no historical vulnerability is claimed currently exploitable without a fresh code/runtime audit.

### Acceptance evidence record

For every HOF scenario, record: status; source commit; policy version where applicable; backend test/contract evidence; browser evidence; worker and delivery evidence when applicable; fixture principal/organization/branch; failures covered; reviewer/date. Scenario outlines require evidence for each example. A policy-gated feature stays blocked for release until its policy is resolved, even if a restricted default implementation passes tests.

Documentation coverage review is complete for the supplied artifacts. All application features remain planned/unverified for the V2 baseline; these documents do not certify the existing app.
