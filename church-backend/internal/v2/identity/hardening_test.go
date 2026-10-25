package identity_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/platform/uid"
	"testing"
	"time"
)

func TestSessionExactExpiryAndInjectedID(t *testing.T) {
	db, _ := setupSessionDB(t)
	ctx := context.Background()
	frozen := clock.NewFrozenClock(time.Now())
	id := uuid.New()
	svc := identity.NewService(db, frozen, uid.NewStubGenerator(id))
	token, actual, err := svc.CreateSession(ctx, fixtures.AccountAdaID, "", "", time.Hour)
	if err != nil || actual != id {
		t.Fatalf("create: %s %v", actual, err)
	}
	var hash string
	if err = db.QueryRowContext(ctx, "SELECT session_token_hash FROM sessions WHERE id=$1", id).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	if hash == token || hash != identity.HashToken(token) {
		t.Fatal("session token not hashed")
	}
	frozen.Advance(time.Hour)
	if _, err = svc.ResolveSession(ctx, token); !errors.Is(err, identity.ErrSessionExpired) {
		t.Fatalf("expiry boundary: %v", err)
	}
	if _, _, err = svc.CreateSession(ctx, fixtures.AccountSuspendedID, "", "", time.Hour); !errors.Is(err, identity.ErrAccountInactive) {
		t.Fatalf("suspended account session created: %v", err)
	}
}
func TestContextDropsRevokedAssignments(t *testing.T) {
	db, svc := setupSessionDB(t)
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, "UPDATE scoped_grants SET revoked_at=NOW() WHERE assignment_id=$1", fixtures.AssignmentAdaChoirID); err != nil {
		t.Fatal(err)
	}
	actor, err := svc.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if err != nil {
		t.Fatal(err)
	}
	for _, assignment := range actor.ActiveAssignments {
		if assignment.AssignmentID == fixtures.AssignmentAdaChoirID {
			t.Fatal("context includes assignment with no active grants")
		}
	}
}
