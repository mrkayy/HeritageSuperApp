# Heritage SuperApp Jira-Style Backlog

This backlog is the tracking view for [`master-gherkin-stories.md`](master-gherkin-stories.md). The master file remains the acceptance specification; this file records implementation status and links each work item back to its feature and scenario IDs.

Status values: `DONE` means current repository evidence and automated verification exist. `TODO` means the story remains pending. `PARTIAL` means foundation work exists but the complete vertical slice is not finished.

## Completed implementation tasks

- [x] `HOF-FOUND-001` — Isolated V2 runtime, PostgreSQL 16 development/test databases, explicit `V2_DATABASE_URL`, port 8081, graceful shutdown. Evidence: `cmd/server-v2`, `docker-compose.v2.yml`. Related release stories: [HOF-045](master-gherkin-stories.md#hof-045--cross-cutting-quality-accessibility-and-release), [HOF-048](master-gherkin-stories.md#hof-048--sector-leadership-and-cell-ministry).
- [x] `HOF-FOUND-002` — Versioned SQL migrations, checksums, advisory locking, repeat migration and disposable PostgreSQL integration test harness. Evidence: `internal/v2/migration`, `scripts/test-v2.sh`. Related story: [HOF-044](master-gherkin-stories.md#hof-044--migration-reconciliation-and-cutover).
- [x] `HOF-FOUND-003` — Organization-scoped identity and authorization foundation, hashed sessions, revocation, expiry, sensitivity checks, delegation bounds and restricted runtime database role. Related stories: [HOF-001](master-gherkin-stories.md#hof-001--sign-in-sessions-and-logout), [HOF-008](master-gherkin-stories.md#hof-008--scoped-assignments-capability-matrix-and-delegation), [HOF-010](master-gherkin-stories.md#hof-010--canonical-person-contacts-and-affiliation).
- [x] `HOF-FOUND-004` — Atomic unit of work, audit/outbox persistence, worker leasing and fencing, bounded retries, consumer receipts and idempotency conflict handling. Related stories: [HOF-039](master-gherkin-stories.md#hof-039--audit-trail-diagnostics-and-failed-job-operations), [HOF-040](master-gherkin-stories.md#hof-040--work-queues-and-durable-cross-domain-coordination).
- [x] `HOF-FOUND-005` — Foundation endpoints and versioned OpenAPI: liveness, readiness and authenticated context. Related stories: [HOF-001](master-gherkin-stories.md#hof-001--sign-in-sessions-and-logout), [HOF-045](master-gherkin-stories.md#hof-045--cross-cutting-quality-accessibility-and-release).
- [x] `HOF-FOUND-006` — Visitor/claim persistence scaffold: visitor capture, occurrence link, welcome work, profile verification, hashed claim invitations and atomic claim completion. Related stories: [HOF-002](master-gherkin-stories.md#hof-002--controlled-claims-magic-links-and-onboarding), [HOF-013](master-gherkin-stories.md#hof-013--information-center-visitor-intake), [HOF-017](master-gherkin-stories.md#hof-017--profile-enrichment-maker-checker-and-verification).

## Gherkin coverage index

Every row is a Jira-style epic/story tracking item. Scenario IDs are the acceptance tasks for that feature and link to the corresponding section in the master Gherkin specification.

| Key | Type | Summary | Phase | Status | Acceptance story links |
|---|---|---|---|---|---|
| HOF-001 | Epic | Sign-in, sessions and logout | 1 | TODO | [S01](master-gherkin-stories.md#hof-001--sign-in-sessions-and-logout) · [S02](master-gherkin-stories.md#hof-001--sign-in-sessions-and-logout) · [S03](master-gherkin-stories.md#hof-001--sign-in-sessions-and-logout) · [S04](master-gherkin-stories.md#hof-001--sign-in-sessions-and-logout) |
| HOF-002 | Epic | Controlled claims, magic links and onboarding | 1 | PARTIAL | [S01–S06](master-gherkin-stories.md#hof-002--controlled-claims-magic-links-and-onboarding) |
| HOF-003 | Epic | Google sign-in and authentication-method linking | 1 | TODO | [S01–S04](master-gherkin-stories.md#hof-003--google-sign-in-and-authentication-method-linking) |
| HOF-004 | Epic | PIN unlock and optional device biometrics | 2 | TODO | [S01–S04](master-gherkin-stories.md#hof-004--pin-unlock-and-optional-device-biometrics) |
| HOF-005 | Epic | Recovery, mistaken claims, suspension and replacement | 1 | TODO | [S01–S05](master-gherkin-stories.md#hof-005--recovery-mistaken-claims-suspension-and-replacement) |
| HOF-006 | Epic | Organization, branches, districts, sectors and teams | 1/3 | TODO | [S01–S04](master-gherkin-stories.md#hof-006--organization-branches-districts-sectors-and-teams) |
| HOF-007 | Epic | Leadership invitations and reassignment | 2 | TODO | [S01–S04](master-gherkin-stories.md#hof-007--leadership-invitations-and-reassignment) |
| HOF-008 | Epic | Scoped assignments, capability matrix and delegation | 1/2 | PARTIAL | [S01–S04](master-gherkin-stories.md#hof-008--scoped-assignments-capability-matrix-and-delegation) |
| HOF-009 | Epic | Workspace navigation and context switching | 1 | TODO | [S01–S03](master-gherkin-stories.md#hof-009--workspace-navigation-and-context-switching) |
| HOF-010 | Epic | Canonical Person, contacts and affiliation | 1 | PARTIAL | [S01–S04](master-gherkin-stories.md#hof-010--canonical-person-contacts-and-affiliation) |
| HOF-011 | Epic | Duplicate suggestions, merge and correction | 1 | TODO | [S01–S05](master-gherkin-stories.md#hof-011--duplicate-suggestions-merge-and-correction) |
| HOF-012 | Epic | Directory search and bulk CSV import | 1/2 | TODO | [S01–S04](master-gherkin-stories.md#hof-012--directory-search-and-bulk-csv-import) |
| HOF-013 | Epic | Information Center visitor intake | 1 | PARTIAL | [S01–S05](master-gherkin-stories.md#hof-013--information-center-visitor-intake) |
| HOF-014 | Epic | Service attendance, history and absence | 1 | TODO | [S01–S04](master-gherkin-stories.md#hof-014--service-attendance-history-and-absence) |
| HOF-015 | Epic | Foundation eligibility, recommendation and handoff | 1 | TODO | [S01–S03](master-gherkin-stories.md#hof-015--foundation-eligibility-recommendation-and-handoff) |
| HOF-016 | Epic | Follow-up allocation, calls, history and weekly collation | 1 | TODO | [S01–S05](master-gherkin-stories.md#hof-016--follow-up-allocation-calls-history-and-weekly-collation) |
| HOF-017 | Epic | Profile enrichment, maker-checker and verification | 1 | PARTIAL | [S01–S05](master-gherkin-stories.md#hof-017--profile-enrichment-maker-checker-and-verification) |
| HOF-018 | Epic | Membership standing, journey history and overrides | 2 | TODO | [S01–S04](master-gherkin-stories.md#hof-018--membership-standing-journey-history-and-overrides) |
| HOF-019 | Epic | Programs, modules, cohorts and teaching assignments | 2 | TODO | [S01–S04](master-gherkin-stories.md#hof-019--programs-modules-cohorts-and-teaching-assignments) |
| HOF-020 | Epic | Continuous assessment, makeup, graduation and retakes | 2 | TODO | [S01–S04](master-gherkin-stories.md#hof-020--continuous-assessment-makeup-graduation-and-retakes) |
| HOF-021 | Epic | Volunteer preferences, probation and placement | 2 | TODO | [S01–S03](master-gherkin-stories.md#hof-021--volunteer-preferences-probation-and-placement) |
| HOF-022 | Epic | Birthdays, anniversaries and life landmarks | 2 | TODO | [S01–S04](master-gherkin-stories.md#hof-022--birthdays-anniversaries-and-life-landmarks) |
| HOF-023 | Epic | Pastoral cases, urgent alerts and amendments | 2 | TODO | [S01–S04](master-gherkin-stories.md#hof-023--pastoral-cases-urgent-alerts-and-amendments) |
| HOF-024 | Epic | Inter-branch transfer and achievement recognition | 3 | TODO | [S01–S05](master-gherkin-stories.md#hof-024--inter-branch-transfer-and-achievement-recognition) |
| HOF-025 | Epic | Soul Bank outreach capture and spiritual decisions | 3 | TODO | [S01–S04](master-gherkin-stories.md#hof-025--soul-bank-outreach-capture-and-spiritual-decisions) |
| HOF-026 | Epic | Soul journals, decisions and assigned outreach follow-up | 3 | TODO | [S01–S03](master-gherkin-stories.md#hof-026--soul-journals-decisions-and-assigned-outreach-follow-up) |
| HOF-027 | Epic | Scoped maps and approved public aggregates | 3 | TODO | [S01–S04](master-gherkin-stories.md#hof-027--scoped-maps-and-approved-public-aggregates) |
| HOF-028 | Epic | Outreach targets, reports and leaderboard | 3 | TODO | [S01–S03](master-gherkin-stories.md#hof-028--outreach-targets-reports-and-leaderboard) |
| HOF-029 | Epic | Transport requests, dispatch, capacity and completion | 3 | TODO | [S01–S05](master-gherkin-stories.md#hof-029--transport-requests-dispatch-capacity-and-completion) |
| HOF-030 | Epic | Households, relationships and guardian authority | 3 | TODO | [S01–S04](master-gherkin-stories.md#hof-030--households-relationships-and-guardian-authority) |
| HOF-031 | Epic | Kids profiles, check-in and secure pickup | 3 | TODO | [S01–S04](master-gherkin-stories.md#hof-031--kids-profiles-check-in-and-secure-pickup) |
| HOF-032 | Epic | Books, merchandise, stock and transfer sales | 4 | TODO | [S01–S05](master-gherkin-stories.md#hof-032--books-merchandise-stock-and-transfer-sales) |
| HOF-033 | Epic | Announcements, presenter bulletin and expiry | 4 | TODO | [S01–S03](master-gherkin-stories.md#hof-033--announcements-presenter-bulletin-and-expiry) |
| HOF-034 | Epic | Events, registration, reminders and attendance | 4 | TODO | [S01–S03](master-gherkin-stories.md#hof-034--events-registration-reminders-and-attendance) |
| HOF-035 | Epic | Email, SMS, templates, inbox and delivery status | 1–4 | TODO | [S01–S06](master-gherkin-stories.md#hof-035--email-sms-templates-inbox-and-delivery-status) |
| HOF-036 | Epic | Personal, departmental and executive dashboards and dossiers | 2–4 | TODO | [S01–S04](master-gherkin-stories.md#hof-036--personal-departmental-and-executive-dashboards-and-dossiers) |
| HOF-037 | Epic | Analytics, executive PDF and CSV exports | 4 | TODO | [S01–S04](master-gherkin-stories.md#hof-037--analytics-executive-pdf-and-csv-exports) |
| HOF-038 | Epic | Feature flags, settings, localization and governance | 1–4 | TODO | [S01–S05](master-gherkin-stories.md#hof-038--feature-flags-settings-localization-and-governance) |
| HOF-039 | Epic | Audit trail, diagnostics and failed-job operations | 1 | PARTIAL | [S01–S05](master-gherkin-stories.md#hof-039--audit-trail-diagnostics-and-failed-job-operations) |
| HOF-040 | Epic | Work queues and durable cross-domain coordination | 1 | PARTIAL | [S01–S04](master-gherkin-stories.md#hof-040--work-queues-and-durable-cross-domain-coordination) |
| HOF-041 | Epic | Personal profile, member experience, guides and legal pages | 1–4 | TODO | [S01–S04](master-gherkin-stories.md#hof-041--personal-profile-member-experience-guides-and-legal-pages) |
| HOF-042 | Epic | V3 public QR visitor intake | V3 | TODO | [S01–S03](master-gherkin-stories.md#hof-042--v3-public-qr-visitor-intake) |
| HOF-043 | Epic | Restricted files, privacy preferences and retention | 1–4 | TODO | [S01–S04](master-gherkin-stories.md#hof-043--restricted-files-privacy-preferences-and-retention) |
| HOF-044 | Epic | Migration, reconciliation and cutover | 0–4 | PARTIAL | [S01–S05](master-gherkin-stories.md#hof-044--migration-reconciliation-and-cutover) |
| HOF-045 | Epic | Cross-cutting quality, accessibility and release | Every phase | PARTIAL | [S01–S08](master-gherkin-stories.md#hof-045--cross-cutting-quality-accessibility-and-release) |
| HOF-046 | Epic | External donation record and receipt compatibility | 4 | TODO | [S01–S03](master-gherkin-stories.md#hof-046--external-donation-record-and-receipt-compatibility) |
| HOF-047 | Epic | Generic ministry roster, duty schedules and team work | 3 | TODO | [S01–S03](master-gherkin-stories.md#hof-047--generic-ministry-roster-duty-schedules-and-team-work) |
| HOF-048 | Epic | Sector leadership and cell ministry | 3 | TODO | [S01–S03](master-gherkin-stories.md#hof-048--sector-leadership-and-cell-ministry) |

## Current next actions

- [ ] `HOF-002-S01` — Complete channel-control verification, identity confirmation, setup progression and claim completion. [Story](master-gherkin-stories.md#hof-002--controlled-claims-magic-links-and-onboarding)
- [ ] `HOF-002-S03` — Add explicit expired, revoked, consumed, wrong-organization and wrong-purpose claim tests. [Story](master-gherkin-stories.md#hof-002--controlled-claims-magic-links-and-onboarding)
- [ ] `HOF-002-S04` — Add GET-safe claim landing behavior and concurrent POST acceptance coverage. [Story](master-gherkin-stories.md#hof-002--controlled-claims-magic-links-and-onboarding)
- [ ] `HOF-013-S02` — Add identity-candidate search with masked results and a justified separate-person decision. [Story](master-gherkin-stories.md#hof-013--information-center-visitor-intake)
- [ ] `HOF-014-S01` — Add occurrence/person attendance command with idempotent duplicate handling. [Story](master-gherkin-stories.md#hof-014--service-attendance-history-and-absence)
- [ ] `HOF-015-S01` — Add evidence-based Foundation eligibility and separate recommendation work. [Story](master-gherkin-stories.md#hof-015--foundation-eligibility-recommendation-and-handoff)
- [ ] `HOF-016-S01` — Add scoped follow-up queue, assignment, outcome and pagination contracts. [Story](master-gherkin-stories.md#hof-016--follow-up-allocation-calls-history-and-weekly-collation)
- [ ] `HOF-017-S02` — Add typed maker-checker profile proposals and stale-version approval. [Story](master-gherkin-stories.md#hof-017--profile-enrichment-maker-checker-and-verification)
- [ ] `HOF-035-S01` — Add fake-provider notification dispatch with delivery state and outbox replay. [Story](master-gherkin-stories.md#hof-035--email-sms-templates-inbox-and-delivery-status)
- [ ] `HOF-045-S01` — Add frontend and API end-to-end acceptance execution before marking any business epic DONE. [Story](master-gherkin-stories.md#hof-045--cross-cutting-quality-accessibility-and-release)

## Tracking rules

1. Do not mark an epic `DONE` when only its database foundation exists.
2. Mark an individual scenario complete only after current-commit automated evidence covers its API, authorization, persistence, retry behavior and UI outcome where the story requires UI.
3. Link every pull request, test report or implementation note to the Jira key and scenario ID.
4. Keep this file synchronized with the status notice and coverage index in [`master-gherkin-stories.md`](master-gherkin-stories.md).
