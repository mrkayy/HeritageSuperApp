# V2 Milestone 2: Visitor Capture and Controlled Account Claim

This milestone starts the first business slice on top of the V2 foundation.

## Delivered scaffold

- `000003_visitor_claim_slice` adds service occurrences, visitor captures, welcome work, profile verifications and claim invitations.
- `internal/v2/visitor` provides atomic visitor capture, profile-gated invitation issuance and single-use claim completion.
- Capture writes the provisional Person, branch affiliation, occurrence link, welcome work, audit event and outbox event in one transaction.
- Claim completion locks and consumes the invitation, creates the active Account and authentication method, grants the personal baseline capability and audits the result in one transaction.
- API contracts are available at `POST /api/v2/churches/{branch_id}/visitor-captures` and `POST /api/v2/auth/claims/complete`.

## Local verification

```sh
make v2-test-unit
make v2-test-integration
make v2-check
```

Integration tests use a temporary PostgreSQL database and remove it after the run. They do not reset the development database.

## Remaining scope

Identity-candidate review, attendance commands, follow-up assignment and outcomes, channel challenges, notification delivery, rate limiting, PIN/photo setup and frontend work remain subsequent slices. HOF-002 and HOF-013 remain planned until those complete vertical slices pass.
