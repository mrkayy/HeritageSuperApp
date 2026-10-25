package idempotency_test

import (
	"context"
	"database/sql"
	"errors"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"testing"
	"time"

	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/idempotency"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupIdempotencyDB(t *testing.T) (*sql.DB, *idempotency.Store) {
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

	store := idempotency.NewStore(db, clock.NewRealClock())
	return db, store
}

func TestIdempotency_Miss(t *testing.T) {
	db, store := setupIdempotencyDB(t)
	defer db.Close()
	ctx := context.Background()

	rec, err := store.Check(ctx, fixtures.OrgHeritageID, "never-used-key", []byte(`{"hello":"world"}`))
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if rec != nil {
		t.Fatalf("expected nil record on miss, got %v", rec)
	}
}

func TestIdempotency_HitAndReplay(t *testing.T) {
	db, store := setupIdempotencyDB(t)
	defer db.Close()
	ctx := context.Background()

	key := "test-key-replay-123"
	payload := []byte(`{"member_name":"John"}`)
	cachedResponse := []byte(`{"id":"123","status":"created"}`)

	// Save record
	err := store.Save(ctx, fixtures.OrgHeritageID, key, payload, 201, cachedResponse, 1*time.Hour)
	if err != nil {
		t.Fatalf("save idempotency record: %v", err)
	}

	// Check same key with same payload
	rec, err := store.Check(ctx, fixtures.OrgHeritageID, key, payload)
	if err != nil {
		t.Fatalf("unexpected error on replay: %v", err)
	}
	if rec == nil {
		t.Fatalf("expected cached record, got nil")
	}
	if rec.StatusCode != 201 {
		t.Errorf("expected status code 201, got %d", rec.StatusCode)
	}
	if string(rec.ResponseBody) != string(cachedResponse) {
		t.Errorf("expected response %s, got %s", cachedResponse, rec.ResponseBody)
	}
}

func TestIdempotency_PayloadMismatchConflict(t *testing.T) {
	db, store := setupIdempotencyDB(t)
	defer db.Close()
	ctx := context.Background()

	key := "test-key-conflict-456"
	payload1 := []byte(`{"action":"promote","person_id":"1"}`)
	payload2 := []byte(`{"action":"demote","person_id":"1"}`)

	err := store.Save(ctx, fixtures.OrgHeritageID, key, payload1, 200, []byte(`{"status":"ok"}`), 1*time.Hour)
	if err != nil {
		t.Fatalf("save initial record: %v", err)
	}

	// Check same key with different payload -> MUST return ErrIdempotencyConflict
	_, err = store.Check(ctx, fixtures.OrgHeritageID, key, payload2)
	if !errors.Is(err, idempotency.ErrIdempotencyConflict) {
		t.Errorf("expected ErrIdempotencyConflict, got %v", err)
	}
}

func TestIdempotency_ExpiredRecord(t *testing.T) {
	db, _ := setupIdempotencyDB(t)
	defer db.Close()
	ctx := context.Background()
	frozen := clock.NewFrozenClock(time.Now())
	store := idempotency.NewStore(db, frozen)
	key := "test-key-expired-789"
	payload := []byte(`{"action":"login"}`)

	// Advance the injected clock to the exact expiry boundary.
	err := store.Save(ctx, fixtures.OrgHeritageID, key, payload, 200, []byte(`{"status":"ok"}`), time.Minute)
	if err != nil {
		t.Fatalf("save expired record: %v", err)
	}

	frozen.Advance(time.Minute)
	rec, err := store.Check(ctx, fixtures.OrgHeritageID, key, payload)
	if err != nil {
		t.Fatalf("unexpected error on expired check: %v", err)
	}
	if rec != nil {
		t.Errorf("expected expired record to return nil, got %v", rec)
	}
}
