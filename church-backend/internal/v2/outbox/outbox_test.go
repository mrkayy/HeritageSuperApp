package outbox_test

import (
	"context"
	"database/sql"
	"errors"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/outbox"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupOutboxDB(t *testing.T) (*sql.DB, *outbox.Dispatcher) {
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

	dispatcher := outbox.NewDispatcher(db, clock.NewRealClock())
	return db, dispatcher
}

func TestOutbox_LeaseAndPublish(t *testing.T) {
	db, dispatcher := setupOutboxDB(t)
	defer db.Close()
	ctx := context.Background()

	eventID := uuid.New()
	_, err := db.ExecContext(ctx, `
		INSERT INTO outbox_events (
			id, organization_id, event_type, aggregate_type, aggregate_id, payload, state, next_retry_at, occurred_at
		) VALUES ($1, $2, 'test.event', 'test', $1, '{"test":true}', 'pending', NOW(), NOW())
	`, eventID, fixtures.OrgHeritageID)
	if err != nil {
		t.Fatalf("insert outbox event: %v", err)
	}

	worker1 := "worker-alpha"
	worker2 := "worker-beta"

	// Worker 1 leases the event for 30 seconds
	events, err := dispatcher.LeaseEvents(ctx, worker1, 10, 30*time.Second)
	if err != nil {
		t.Fatalf("lease events worker1: %v", err)
	}
	if len(events) != 1 || events[0].ID != eventID {
		t.Fatalf("expected 1 leased event with id %s, got %v", eventID, events)
	}

	// Worker 2 tries to lease while worker 1 has active lease -> must return 0 events (SKIP LOCKED)
	events2, err := dispatcher.LeaseEvents(ctx, worker2, 10, 30*time.Second)
	if err != nil {
		t.Fatalf("lease events worker2: %v", err)
	}
	if len(events2) != 0 {
		t.Fatalf("expected 0 events leased by worker2, got %d", len(events2))
	}

	// Worker 1 marks published
	err = dispatcher.MarkPublished(ctx, eventID, worker1, events[0].LeaseToken)
	if err != nil {
		t.Fatalf("mark published: %v", err)
	}

	// Verify event state is published in db
	var state string
	var lockedBy sql.NullString
	err = db.QueryRowContext(ctx, `SELECT state, locked_by FROM outbox_events WHERE id = $1`, eventID).Scan(&state, &lockedBy)
	if err != nil {
		t.Fatalf("query event: %v", err)
	}
	if state != "published" {
		t.Errorf("expected state published, got %s", state)
	}
	if lockedBy.Valid {
		t.Errorf("expected locked_by null, got %s", lockedBy.String)
	}
}

func TestOutbox_ConsumerReceiptDeduplication(t *testing.T) {
	db, _ := setupOutboxDB(t)
	defer db.Close()
	ctx := context.Background()

	eventID := uuid.New()
	_, err := db.ExecContext(ctx, `
		INSERT INTO outbox_events (
			id, organization_id, event_type, aggregate_type, aggregate_id, payload, state, next_retry_at, occurred_at
		) VALUES ($1, $2, 'test.receipt.event', 'test', $1, '{}', 'pending', NOW(), NOW())
	`, eventID, fixtures.OrgHeritageID)
	if err != nil {
		t.Fatalf("insert outbox event: %v", err)
	}

	consumerName := "membership-email-consumer"

	// 1. First processing: records receipt
	tx1, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx1: %v", err)
	}
	err = outbox.RecordReceipt(ctx, tx1, consumerName, eventID)
	if err != nil {
		t.Fatalf("expected receipt recorded, got %v", err)
	}
	if err := tx1.Commit(); err != nil {
		t.Fatalf("commit tx1: %v", err)
	}

	// 2. Second processing attempt: must return ErrAlreadyProcessed
	tx2, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx2: %v", err)
	}
	defer tx2.Rollback()

	err = outbox.RecordReceipt(ctx, tx2, consumerName, eventID)
	if !errors.Is(err, outbox.ErrAlreadyProcessed) {
		t.Errorf("expected ErrAlreadyProcessed, got %v", err)
	}

	// 3. Different consumer processing the same event must succeed
	differentConsumer := "analytics-consumer"
	tx3, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx3: %v", err)
	}
	err = outbox.RecordReceipt(ctx, tx3, differentConsumer, eventID)
	if err != nil {
		t.Errorf("expected different consumer to succeed, got %v", err)
	}
	_ = tx3.Commit()
}
