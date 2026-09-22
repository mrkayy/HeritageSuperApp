package visitor_test

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/platform/uid"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"github.com/hofchurchng/church-backend/internal/v2/visitor"
)

func setup(t *testing.T) (*visitor.Service, *identity.Service, *sql.DB) {
	t.Helper()
	db := testutil.Open(t)
	ctx := context.Background()
	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = runner.Up(ctx); err != nil {
		t.Fatal(err)
	}
	if err = fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatal(err)
	}
	sessions := identity.NewService(db, clock.NewRealClock())
	return visitor.NewService(db, clock.NewRealClock(), uid.NewGenerator()), sessions, db
}

func TestCaptureCreatesIdentityVisitWelcomeWorkAuditAndOutboxAtomically(t *testing.T) {
	service, sessions, db := setup(t)
	defer db.Close()
	ctx := context.Background()
	actor, err := sessions.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if err != nil {
		t.Fatal(err)
	}
	occurrence := uuid.New()
	// The occurrence itself is an explicit operational record; capture cannot invent one.
	// setupVisitorDB exposes the database through the helper below.
	if _, err = db.ExecContext(ctx, `INSERT INTO service_occurrences(id,organization_id,branch_id,starts_at,service_type,status) VALUES($1,$2,$3,NOW(),'sunday','open')`, occurrence, fixtures.OrgHeritageID, fixtures.BranchLekkiID); err != nil {
		t.Fatal(err)
	}
	result, err := service.Capture(ctx, actor, visitor.CaptureRequest{OrganizationID: fixtures.OrgHeritageID, BranchID: fixtures.BranchLekkiID, ServiceOccurrenceID: occurrence, FirstName: "New", LastName: "Visitor", ContactKind: "phone", ContactValue: "+2348000000000", Source: "info_center"})
	if err != nil {
		t.Fatal(err)
	}
	var count int
	checks := []struct {
		query string
		id    uuid.UUID
	}{{"SELECT count(*) FROM people WHERE id=$1", result.PersonID}, {"SELECT count(*) FROM visitor_captures WHERE id=$1", result.CaptureID}, {"SELECT count(*) FROM follow_up_work_items WHERE id=$1", result.WorkItemID}, {"SELECT count(*) FROM audit_events WHERE resource_id=$1", result.CaptureID}, {"SELECT count(*) FROM outbox_events WHERE aggregate_id=$1", result.PersonID}}
	for _, check := range checks {
		if err = db.QueryRowContext(ctx, check.query, check.id).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("expected one record for %s, got %d", check.query, count)
		}
	}
	if _, err = service.Capture(ctx, actor, visitor.CaptureRequest{OrganizationID: fixtures.OrgHeritageID, BranchID: fixtures.BranchLekkiID, ServiceOccurrenceID: occurrence, FirstName: "Duplicate", LastName: "Visitor", Source: "info_center"}); err == nil {
		t.Fatal("duplicate occurrence/person path accepted")
	}
}

func TestClaimInvitationIsPurposeBoundSingleUseAndConcurrent(t *testing.T) {
	service, _, db := setup(t)
	defer db.Close()
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `INSERT INTO profile_verifications(organization_id,person_id,verified_by_assignment_id,evidence) VALUES($1,$2,$3,'{}')`, fixtures.OrgHeritageID, fixtures.PersonVisitorK, fixtures.AssignmentAdaChoirID); err != nil {
		t.Fatal(err)
	}
	inv, err := service.IssueClaimInvitation(ctx, visitor.ClaimInvitationRequest{OrganizationID: fixtures.OrgHeritageID, PersonID: fixtures.PersonVisitorK, IssuedByAssignmentID: fixtures.AssignmentAdaChoirID, IssuedByPersonID: fixtures.PersonAdaID, AuthMethodKind: "email", Destination: "visitor@example.test", TTL: time.Hour})
	if err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, e := service.CompleteClaim(ctx, visitor.ClaimCompletionRequest{OrganizationID: fixtures.OrgHeritageID, RawToken: inv.RawToken, AuthMethodKind: "email", Identifier: "visitor@example.test", CredentialHash: "test-hash"})
			results <- e
		}()
	}
	wg.Wait()
	close(results)
	successes := 0
	for e := range results {
		if e == nil {
			successes++
		} else if !errors.Is(e, visitor.ErrClaimConsumed) {
			t.Errorf("unexpected race result: %v", e)
		}
	}
	if successes != 1 {
		t.Fatalf("expected one successful claim, got %d", successes)
	}
	if _, err := service.CompleteClaim(ctx, visitor.ClaimCompletionRequest{OrganizationID: fixtures.OrgHeritageID, RawToken: inv.RawToken, AuthMethodKind: "email", Identifier: "visitor@example.test", CredentialHash: "test-hash"}); !errors.Is(err, visitor.ErrClaimConsumed) {
		t.Fatalf("reused claim accepted: %v", err)
	}
}
