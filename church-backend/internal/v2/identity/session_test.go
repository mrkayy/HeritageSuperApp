package identity_test

import (
	"context"
	"database/sql"
	"errors"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"testing"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupSessionDB(t *testing.T) (*sql.DB, *identity.Service) {
	t.Helper()
	db := testutil.Open(t)
	ctx := context.Background()

	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatalf("migration runner: %v", err)
	}
	if _, err := runner.Up(ctx); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatalf("seed fixtures: %v", err)
	}

	sessionSvc := identity.NewService(db, clock.NewRealClock())
	return db, sessionSvc
}

func TestSession_ResolveValidSession(t *testing.T) {
	db, sessionSvc := setupSessionDB(t)
	defer db.Close()
	ctx := context.Background()

	authCtx, err := sessionSvc.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if err != nil {
		t.Fatalf("unexpected error resolving valid session: %v", err)
	}

	if authCtx.PersonID != fixtures.PersonAdaID {
		t.Errorf("expected PersonID %s, got %s", fixtures.PersonAdaID, authCtx.PersonID)
	}
	if authCtx.AccountID != fixtures.AccountAdaID {
		t.Errorf("expected AccountID %s, got %s", fixtures.AccountAdaID, authCtx.AccountID)
	}
	if authCtx.FirstName != "Ada" || authCtx.LastName != "Okafor" {
		t.Errorf("unexpected name: %s %s", authCtx.FirstName, authCtx.LastName)
	}

	// Verify Baseline Grants
	foundBaseline := false
	for _, bg := range authCtx.BaselineGrants {
		if bg == "member.baseline.view" {
			foundBaseline = true
			break
		}
	}
	if !foundBaseline {
		t.Errorf("expected baseline grant member.baseline.view in %v", authCtx.BaselineGrants)
	}

	// Verify Overlapping Active Assignments (Choir Lead + Membership Caller)
	if len(authCtx.ActiveAssignments) < 2 {
		t.Fatalf("expected at least 2 active assignments, got %d", len(authCtx.ActiveAssignments))
	}
}

func TestSession_ResolveNotFound(t *testing.T) {
	db, sessionSvc := setupSessionDB(t)
	defer db.Close()
	ctx := context.Background()

	_, err := sessionSvc.ResolveSession(ctx, "non-existent-random-token-xyz")
	if !errors.Is(err, identity.ErrSessionNotFound) {
		t.Errorf("expected ErrSessionNotFound, got %v", err)
	}
}

func TestSession_ResolveExpired(t *testing.T) {
	db, _ := setupSessionDB(t)
	defer db.Close()
	ctx := context.Background()

	// Update Ada's session expiration to the past
	_, err := db.ExecContext(ctx, `
		UPDATE sessions 
		SET created_at=NOW()-INTERVAL '2 hours', expires_at = NOW() - INTERVAL '1 hour'
		WHERE account_id = $1
	`, fixtures.AccountAdaID)
	if err != nil {
		t.Fatalf("failed to update session expiration: %v", err)
	}

	sessionSvc := identity.NewService(db, clock.NewRealClock())
	_, err = sessionSvc.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if !errors.Is(err, identity.ErrSessionExpired) {
		t.Errorf("expected ErrSessionExpired, got %v", err)
	}
}

func TestSession_ResolveRevoked(t *testing.T) {
	db, sessionSvc := setupSessionDB(t)
	defer db.Close()
	ctx := context.Background()

	var sessionID uuid.UUID
	err := db.QueryRowContext(ctx, `SELECT id FROM sessions WHERE account_id = $1`, fixtures.AccountAdaID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("find session: %v", err)
	}

	// Revoke Ada's session
	err = sessionSvc.RevokeSession(ctx, sessionID)
	if err != nil {
		t.Fatalf("failed to revoke session: %v", err)
	}

	_, err = sessionSvc.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if !errors.Is(err, identity.ErrSessionRevoked) {
		t.Errorf("expected ErrSessionRevoked, got %v", err)
	}
}

func TestSession_ResolveSuspendedAccount(t *testing.T) {
	db, sessionSvc := setupSessionDB(t)
	defer db.Close()
	ctx := context.Background()

	// Set Ada's account status to suspended
	_, err := db.ExecContext(ctx, `
		UPDATE accounts 
		SET status = 'suspended'
		WHERE id = $1
	`, fixtures.AccountAdaID)
	if err != nil {
		t.Fatalf("failed to suspend account: %v", err)
	}

	_, err = sessionSvc.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if !errors.Is(err, identity.ErrAccountInactive) {
		t.Errorf("expected ErrAccountInactive, got %v", err)
	}
}
