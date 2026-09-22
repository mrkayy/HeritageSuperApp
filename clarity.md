# Heritage V2 — Architecture Clarifications and Decision Record

## Purpose

This document responds to the review of the two V2 architecture reports and turns the unresolved observations into explicit architecture decisions.

The review is accepted in substance. The core V2 direction remains valid: **Person, Account, Church Affiliation, Journey, and Assignment must be separate concepts**. However, that model is not implementation-ready until identity resolution, tenant visibility, membership semantics, permission composition, journey continuity, workflow ownership, event reliability, sensitive-data access, account recovery, migration, and delivery scope are made explicit.

This document therefore acts as a **clarity layer between the architecture charter and implementation**. It does not replace the product backlog or the full V2 system design. It records the decisions that must constrain both.

---

# 1. Core Architecture Position

Heritage V2 will model a human being once at the identity layer while allowing uncertainty during capture.

The canonical shape is:

```text
Person
├── Account(s)
├── ContactPoint(s)
├── Address(es)
├── PersonRelationship(s)
├── ChurchAffiliation(s)
│   ├── MembershipStatus
│   └── Journey
├── Assignment(s)
│   └── Scoped Capability Grants
├── Attendance / Visit History
├── Discipleship Records
├── Pastoral Care Records
└── Outreach History
```

The important distinction is:

- **Person** = the human being.
- **Account** = authentication identity and access entry point.
- **Church Affiliation** = the person’s formal relationship with a local church during a period of time.
- **Membership Status** = the church-recognized standing of that affiliation.
- **Journey** = discipleship progression and related milestones.
- **Assignment** = an operational appointment such as Membership Caller, Choir Team Lead, Academy Teacher, Sector Lead, or Resident Pastor.
- **Capability Grant** = what an assignment is allowed to do, within a defined resource scope.

No single one of these concepts is allowed to substitute for the others.

---

# 2. Canonical Identity Does Not Mean Perfect Matching

## Decision

Heritage will maintain an organization-level canonical `Person` record, but **capture flows may create provisional or possibly-duplicate records**.

The system must never assume that matching phone number, email address, name, or address alone proves that two records belong to the same human being.

## Required model

```text
Person
id
identity_status: provisional | verified | merged | inactive
merged_into_person_id?
created_at
created_by

IdentityEvidence
id
person_id
kind: phone | email | name_dob | account_claim | staff_verification | legacy_reference
value_hash / normalized_value
verification_level
verified_at?
verified_by?

PotentialDuplicate
id
person_a_id
person_b_id
match_reason
confidence
status: open | dismissed | merged
reviewed_by?
reviewed_at?
```

## Rules

1. A visitor capture may create a provisional Person.
2. Duplicate detection may suggest a likely existing Person, but does not automatically merge records solely because a contact point matches.
3. Staff may review possible duplicates.
4. Merge actions must be audited.
5. Unmerge must be supported where technically possible and where downstream records can be restored safely.
6. All legacy identifiers must remain traceable after migration.
7. Shared family phone numbers and recycled numbers must be treated as normal cases, not edge failures.

The existing Information Center duplicate-phone experience remains useful as a **warning and lookup aid**, not as final proof of identity.

---

# 3. Tenant Boundary and Canonical Identity Ownership

## Decision

Canonical identity is **organization-wide within Heritage of Faith**, not globally shared across unrelated organizations.

A Person may be discoverable across Heritage branches only when the requesting user has an explicit organization-level or cross-branch capability.

Ordinary branch users must not gain organization-wide Person discovery merely because Person records are stored centrally.

## Tenancy hierarchy

```text
Platform
└── Organization: Heritage of Faith
    └── Local Church / Branch
        ├── Sectors
        ├── Teams
        ├── Programs
        └── Services / Events
```

## Visibility rules

### Branch-scoped workers

May discover and operate on:

- people with a current affiliation to their church;
- people explicitly assigned to their work queue;
- visitors captured in their branch;
- records shared with that branch through an approved workflow, such as an inbound transfer.

They do **not** receive unrestricted organization-wide Person search.

### Resident Pastor / Church Admin

May receive broad visibility within their local church, subject to sensitive-record restrictions.

### General Overseer / authorized organization leadership

May receive organization-wide intelligence capabilities across Heritage branches.

### Super Admin

Platform administration and organization configuration are separate from pastoral or ministry authority. Super Admin access to sensitive member content must be explicit rather than implied by technical administration status.

## Important distinction

A shared Person record solves identity continuity. It does **not** erase branch data boundaries.

Every operational record continues to carry its originating organizational context, including where applicable:

```text
organization_id
church_id
team_id?
sector_id?
created_by_assignment_id?
```

---

# 4. “Global” Does Not Mean Platform-Wide by Default

## Decision

The term `GLOBAL` will not be used as an ambiguous authorization scope.

Use explicit scopes instead:

```text
SELF
ASSIGNED
TEAM
SECTOR
CHURCH
ORGANIZATION
PLATFORM
```

- `ORGANIZATION` means all Heritage of Faith branches inside the organization.
- `PLATFORM` is reserved for platform-level administration and must not automatically grant ministry-data visibility.

This prevents confusion between General Overseer authority and Super Admin authority.

---

# 5. Permissions Must Be Evaluated in Assignment Context

## Decision

Capabilities are not combined as free-floating privileges on a user account.

Every operational authorization decision must evaluate:

```text
Person
+ Account Session
+ Active Assignment
+ Capability
+ Scope
+ Resource Context
+ Record Sensitivity
```

## Example

A person may simultaneously hold:

```text
Assignment A
Church: Lekki
Team: Choir
Role: Team Lead
Capability: team.roster.manage
Scope: TEAM

Assignment B
Church: Lekki
Team: Membership
Role: Caller
Capability: membership.followup.perform
Scope: ASSIGNED
```

The Choir Team Lead assignment must not widen the Membership Caller assignment into team-wide Membership access.

In other words, scope is attached to the grant that produced the capability.

## Authorization rule

Do not evaluate:

```text
all_capabilities(user) + widest_scope(user)
```

Evaluate:

```text
for each active grant:
    does this grant authorize this capability
    for this resource
    in this organizational context
    at this sensitivity level?
```

This is a critical V2 invariant.

---

# 6. Membership Remains an Explicit Business Concept

## Decision

`Person + active ChurchAffiliation` does not automatically mean “member.”

A Church Affiliation records that the person has a recognized relationship with the branch. Membership standing is a separate business attribute.

Example:

```text
ChurchAffiliation
id
person_id
church_id
relationship_status: active | transferring | ended
membership_status:
    visitor
    attendee
    candidate
    member
    steward
    inactive_member
joined_at?
ended_at?
```

The exact vocabulary can be refined with church leadership, but the architectural rule is fixed:

> **Affiliation answers where and whether the person currently relates to the church. Membership status answers what standing the church recognizes within that affiliation.**

Journey stage remains separate again.

A person can therefore be:

```text
Affiliation: active at Lekki
Membership Status: visitor
Journey Stage: returning_visitor
```

or later:

```text
Affiliation: active at Lekki
Membership Status: steward
Journey Stage: completed_membership_pipeline
Assignments: Choir Team Lead, Academy Teacher
```

This prevents authorization roles, membership standing, and discipleship progression from collapsing into one enum.

---

# 7. Journey Continuity Across Branch Transfers

## Decision

The Journey belongs to the person within the organization and must not restart simply because active church affiliation changes.

However, local branches may need to recognize, map, or supplement previously completed training.

## Proposed model

```text
Journey
id
person_id
organization_id
current_stage_id

JourneyAchievement
id
journey_id
achievement_type
program_id?
module_id?
completed_at
church_id
rule_version_id
status: recognized | provisional | superseded | revoked

JourneyRecognition
id
achievement_id
receiving_church_id
recognition_status: accepted | equivalent | supplementary_required | disputed
notes
reviewed_by
reviewed_at
```

## Transfer behavior

A transfer changes the active affiliation.

It does not rewrite:

- attendance history;
- assessment history;
- pastoral history;
- previous team assignments;
- completed discipleship milestones;
- original church context.

The receiving branch may evaluate whether a previous module is directly accepted, considered equivalent, or requires supplementary work.

This supports future differences in local delivery without destroying organization-wide continuity.

---

# 8. Journey Is a Rule-Governed State Machine, Not a Single Status Field

## Decision

Journey progression must support more than a simple ordered stage list.

The system needs to represent:

- prerequisites;
- eligibility;
- recommendations;
- enrollment;
- attendance requirements;
- assessment requirements;
- exemptions;
- repeats / retakes;
- corrections;
- manual pastoral overrides;
- concurrent programs;
- recognition of prior completion;
- rule-version history.

## Required concepts

```text
JourneyStage
JourneyRuleSet
JourneyRuleVersion
JourneyEligibility
JourneyRecommendation
ProgramEnrollment
JourneyAchievement
JourneyTransition
JourneyOverride
```

Every material transition should record why it happened.

Example:

```text
JourneyTransition
from_stage
into_stage
occurred_at
actor
reason_code
rule_version_id
source_record_id
manual_override: false
```

This gives Heritage a defensible historical answer to:

> Why was this person advanced?

---

# 9. Domain State Owns Truth; Work Items Coordinate Action

## Decision

The proposed workflow/task engine will **not** become the source of truth for domain outcomes.

Each domain owns its own state.

Examples:

- Membership owns follow-up outcomes.
- Journey owns eligibility and progression.
- Discipleship owns enrollment and assessment.
- Pastoral Care owns SitRep state.
- Transfers own transfer state.

`WorkItem` exists to coordinate what a person or team needs to do next.

## Example

Correct:

```text
JourneyEligibility.status = eligible

WorkItem
kind = foundation_followup
subject = Person/Journey
status = open
```

When the caller completes the work:

```text
Domain action updates enrollment / recommendation / follow-up record
WorkItem becomes completed
```

Incorrect:

```text
WorkItem.status = completed
therefore member magically changes stage
```

Domain services remain responsible for business outcomes.

---

# 10. Internal Events Need Reliability Rules

## Decision

Heritage V2 may use internal domain events inside the modular monolith, but essential workflows cannot rely on in-memory “fire and forget” behavior.

## Event categories

### Synchronous domain actions

Used where the initiating transaction must succeed or fail atomically.

Example:

```text
Record visitor attendance
+ persist attendance record
+ update visit aggregate if needed
```

### Durable integration/domain events

Used where another module must react reliably after commit.

Examples:

```text
FoundationEligibilityReached
ProfileVerified
JourneyStageChanged
UrgentSitRepFiled
TransferAccepted
```

## Reliability requirements

For durable events, the architecture must define:

- event ID;
- event type and version;
- aggregate/resource ID;
- organization/church context;
- occurred-at timestamp;
- durable publication after the source transaction;
- retry policy;
- idempotent consumer behavior;
- dead-letter / failed-event visibility;
- auditability.

A transactional outbox pattern is the default design candidate if database-backed publication is required.

We do not need separate message-broker infrastructure to adopt these guarantees inside a modular monolith.

---

# 11. Sensitive Records Require Their Own Access Policy

## Decision

A generic capability such as `person.view` is not sufficient for sensitive church data.

Data access must be classified by record category, and in selected cases by field.

## Initial sensitivity classes

```text
GENERAL
MINISTRY_INTERNAL
PASTORAL_CONFIDENTIAL
CHILD_SAFEGUARDING
EXECUTIVE_RESTRICTED
SECURITY_RESTRICTED
```

Potential mappings:

| Data | Suggested classification |
| --- | --- |
| Basic member directory | GENERAL / MINISTRY_INTERNAL |
| Prayer request | PASTORAL_CONFIDENTIAL |
| Situation Report | PASTORAL_CONFIDENTIAL |
| Medical / allergy notes | PASTORAL_CONFIDENTIAL or CHILD_SAFEGUARDING depending on subject |
| Child profile | CHILD_SAFEGUARDING |
| Guardian relationship | CHILD_SAFEGUARDING when relating to a minor |
| Outreach exact location | MINISTRY_INTERNAL, potentially restricted further |
| Authentication data | SECURITY_RESTRICTED |
| Audit / security events | SECURITY_RESTRICTED |

## Rule

Being able to view a Person does not imply access to every record attached to that Person.

Similarly:

> A family relationship does not itself grant account access, guardianship authority, consent authority, or permission to view confidential records.

Those must be represented explicitly.

---

# 12. Family Relationships and Guardianship Authority Are Different

## Decision

`PersonRelationship` records a relationship fact.

Legal/operational authority over another person must be modeled separately.

Example:

```text
PersonRelationship
A = Mother
B = Child
relationship_type = parent

GuardianAuthority
id
subject_person_id
responsible_person_id
authority_type
valid_from
valid_until?
verification_status
source
```

This keeps “is related to” separate from “is authorized to act for.”

---

# 13. Account Claiming, Recovery, Suspension, and Shared Contacts

## Decision

Account claiming proves control of an authentication channel. It does not, on its own, prove that the claimant owns a Person record.

Controlled onboarding therefore requires both:

```text
Person matching / staff verification
+
authentication-channel verification
```

## Claim flow

```text
Known Person
→ Profile verified by authorized worker
→ Claim invitation issued
→ Claimant proves control of destination email/phone
→ Claim token validated
→ Account linked to Person
→ Account activated
```

## Required exceptional flows

V2 must explicitly support:

- expired invitation;
- resend invitation;
- invitation revocation;
- wrong email or phone entered during profiling;
- shared family email;
- shared family phone number;
- claimant says “this is not me”;
- mistaken claim linked to the wrong Person;
- account recovery after loss of email/phone access;
- account suspension without deleting the Person;
- account replacement while preserving the same Person;
- multiple authentication methods attached to one Account;
- leadership appointment revoked while the underlying member account remains active.

Account recovery must require stronger verification than possession of a stale contact point where risk is elevated.

---

# 14. Historical Records Are Immutable in Context, Correctable by Amendment

## Decision

Historical ministry and pastoral records retain their original branch, actor, and time context.

Corrections should normally be represented as amendments, reversals, superseding records, or audited administrative corrections rather than silent rewrites.

This is especially important for:

- stage transitions;
- assessments;
- transfer approvals;
- maker-checker approvals;
- SitReps;
- sensitive profile changes;
- assignment history.

The system may still allow administrative correction, but every correction must preserve an audit trail.

---

# 15. Migration Is a First-Class V2 Workstream

## Decision

The new architecture will not be implemented by rewriting schemas first and improvising data migration afterward.

Migration design begins before destructive schema changes.

The current project explicitly permits database resets during development and schema refactoring without local-data compatibility hacks. That freedom applies to temporary development data, but production or authoritative organizational records must still have a deliberate migration strategy.

## Migration deliverables

### A. Legacy entity map

Every current entity must map to one of:

```text
retain
transform
merge
split
archive
retire
```

### B. Legacy ID mapping

```text
LegacyRecordMap
source_entity
source_id
target_entity
target_id
migration_run_id
```

### C. Duplicate-resolution process

Existing `User`, `Member`, `Visitor`, and `Soul` records must be compared conservatively.

No automatic merge should be based solely on phone or email equality.

### D. Reconciliation checks

Migration must verify, at minimum:

- total people represented;
- active accounts;
- current church affiliations;
- stage/journey totals;
- attendance totals;
- SitRep counts;
- cohort/enrollment counts;
- assignment counts;
- branch transfer history;
- unlinked/orphaned records;
- duplicate candidates awaiting review.

### E. Rollback

Every migration run must be reproducible and reversible until final acceptance.

Backups and immutable migration snapshots are mandatory before destructive production migration.

---

# 16. V2 Delivery Will Start With One Vertical Slice

## Decision

We will not attempt to redesign every ministry module simultaneously.

The first V2 implementation slice is:

> **Visitor capture → repeat visit → follow-up assignment → profile verification → account claim**

This slice is intentionally chosen because it exercises nearly every foundational concept without requiring the entire SuperApp to be rebuilt.

## What the slice must prove

### Identity

- provisional Person creation;
- duplicate suggestion;
- duplicate review;
- contact normalization;
- no duplicate human created simply because a new operational record is captured.

### Tenancy

- branch-scoped visitor capture;
- branch-local worker visibility;
- organization-level identity continuity without branch-wide data leakage.

### Journey

- first visit;
- repeat visit;
- journey evidence/history;
- eligibility represented separately from transition.

### Authorization

- Information Center worker access;
- Membership caller access;
- Membership profiling access;
- cross-team handoff without cross-team blanket visibility.

### Workflow

- follow-up work item creation;
- assignment;
- completion tied to a real domain outcome.

### Events

- reliable handoff between Info Center and Membership where asynchronous coordination is useful.

### Account lifecycle

- profile verification;
- claim invitation;
- claim success;
- expired or revoked claim;
- mistaken claim recovery path.

### Audit

- identity merge decisions;
- profile verification;
- assignment;
- claim issuance;
- claim completion.

If this slice cannot be implemented cleanly with the proposed foundation, the foundation changes before broader rollout.

---

# 17. Architecture Invariants to Lock Before Schema Work

The following should be treated as V2 invariants unless explicitly superseded by a later architecture decision record.

1. **A Person is not an Account.**
2. **A Person may exist without an Account.**
3. **A Person may have multiple historical Church Affiliations but only the permitted number of active primary affiliations according to organization policy.**
4. **Membership standing is not an authorization role.**
5. **Journey stage is not an authorization role.**
6. **Assignments grant operational authority.**
7. **Capabilities are evaluated in the context of the Assignment that grants them.**
8. **Scopes from unrelated assignments are never combined to widen access.**
9. **Canonical identity is organization-wide for Heritage, while operational visibility remains scoped.**
10. **Phone/email matches are evidence, not identity proof.**
11. **Duplicate merge and correction operations are audited.**
12. **Transfers change active affiliation, not historical record origin.**
13. **Journey achievements survive branch transfer unless formally revoked or superseded.**
14. **Receiving branches may recognize equivalency or require supplementary work without deleting previous achievements.**
15. **Domain records own business truth. Work items coordinate action.**
16. **Essential cross-domain events require durable, idempotent handling.**
17. **Viewing a Person does not imply viewing all sensitive records attached to that Person.**
18. **Relationship does not imply guardianship authority or account authority.**
19. **Account claiming proves channel control, not Person ownership by itself.**
20. **Historical corrections must remain auditable.**
21. **Production data migration requires reconciliation and rollback even if development databases may be reset freely.**
22. **The first V2 implementation must validate one vertical slice before broad module expansion.**

---

# 18. Immediate Design Artifacts Required Next

Before implementation, the following artifacts should be produced in order.

## 18.1 Domain Glossary

Define canonical meaning for:

- Person
- Account
- Contact Point
- Church Affiliation
- Membership Status
- Journey
- Journey Stage
- Achievement
- Assignment
- Role
- Capability
- Scope
- Team
- Sector
- Program
- Enrollment
- Work Item
- Event
- Sensitive Record
- Guardian Authority

No schema field should be added until its domain meaning is clear.

## 18.2 Authorization Matrix

The matrix must use concrete scenarios, including:

- Membership Caller viewing assigned first-timers;
- Membership Team Lead viewing team queue;
- Choir Team Lead who is also a Membership Caller;
- Resident Pastor reading cross-team operational data;
- Church Admin managing configuration but encountering confidential pastoral records;
- General Overseer searching across branches;
- Super Admin administering the platform without implicit pastoral visibility;
- inbound branch transfer before acceptance;
- sector leader access;
- teacher access to academy students;
- child/guardian data access.

## 18.3 Identity Resolution Specification

Define:

- matching signals;
- confidence levels;
- provisional identity rules;
- duplicate-review UX;
- merge behavior;
- unmerge/correction behavior;
- shared contacts;
- account-claim linkage;
- legacy reconciliation.

## 18.4 Journey Rule Specification

Define the current Heritage progression as business rules rather than only a sequence label.

For every stage/program transition, record:

- prerequisites;
- required evidence;
- authorized decision maker;
- automatic vs manual transition;
- exemptions;
- retakes;
- transfer recognition;
- rule version.

## 18.5 Migration Map

Map every current schema/entity into the V2 model before database replacement begins.

## 18.6 Vertical Slice Technical Design

Produce API contracts, domain services, schema, authorization rules, domain events, work items, audit requirements, frontend workspace flow, and tests for:

```text
Visitor Capture
→ Repeat Visit
→ Membership Follow-Up Assignment
→ Profile Verification
→ Account Claim
```

---

# 19. Decisions Still Intentionally Open

The following are **not** yet locked and require product/leadership input or a deeper technical design:

1. Exact membership-status vocabulary.
2. Whether a person may hold more than one active church affiliation simultaneously in exceptional cases.
3. Exact General Overseer access to pastoral-confidential data.
4. Exact Super Admin access to member-level sensitive data.
5. Which child-safeguarding fields require field-level rather than record-level authorization.
6. Whether email and phone contacts are modeled directly on Person or exclusively as ContactPoint records.
7. Exact workflow engine implementation.
8. Exact event-outbox implementation and whether a broker is ever needed later.
9. Exact equivalency rules for cross-branch discipleship programs.
10. Final migration strategy for production once current authoritative datasets are inspected.

These open questions do not block the core separation of identity, affiliation, journey, and authority.

---

# 20. Final V2 Position

The review does not invalidate the proposed V2 architecture. It identifies where a conceptual model still needed operational precision.

The corrected V2 position is therefore:

> **Heritage will maintain one organization-scoped canonical Person identity, while allowing provisional captures and reviewed duplicates. Authentication, church affiliation, membership standing, discipleship journey, and ministry authority remain separate. Permissions are granted through scoped assignments and evaluated in the resource context of the grant that produced them. Historical ministry records retain their original branch context. Journey achievements survive transfers and can be recognized or supplemented by receiving branches. Domain modules own business truth; work items coordinate action; durable events coordinate reliable cross-domain reactions. Sensitive pastoral, child, security, and ministry data receive explicit record-category access policies. Account claiming requires both Person linkage and authentication-channel verification. Migration and identity reconciliation are designed before destructive schema changes.**

The first V2 implementation should validate these principles through one bounded end-to-end workflow:

```text
Visitor capture
→ repeat visit
→ follow-up assignment
→ profile verification
→ account claim
```

If that slice succeeds without identity duplication, cross-team permission leakage, journey ambiguity, or competing workflow state, the same foundation can then be extended to Discipleship Academy, Pastoral Care, ministry teams, transfers, Soul Bank, and executive intelligence.
