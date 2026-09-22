package outbox_test

import (
	"context"
	"database/sql"
	"errors"
	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/outbox"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"testing"
	"time"
)

func TestOutboxLeaseRecoveryFencingAndRetryLimit(t *testing.T) {
	db, _ := setupOutboxDB(t)
	ctx := context.Background()
	frozen := clock.NewFrozenClock(time.Now().Add(time.Second))
	d := outbox.NewDispatcher(db, frozen)
	id := uuid.New()
	if _, err := db.ExecContext(ctx, `INSERT INTO outbox_events(id,organization_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,'test','person',$1,'{}')`, id, fixtures.OrgHeritageID); err != nil {
		t.Fatal(err)
	}
	first, err := d.LeaseEvents(ctx, "worker", 1, time.Minute)
	if err != nil || len(first) != 1 {
		t.Fatalf("lease: %v %v", first, err)
	}
	frozen.Advance(time.Minute)
	if err = d.MarkPublished(ctx, id, "worker", first[0].LeaseToken); !errors.Is(err, outbox.ErrLeaseExpired) {
		t.Fatalf("expired worker acknowledged: %v", err)
	}
	second, err := d.LeaseEvents(ctx, "worker", 1, time.Minute)
	if err != nil || len(second) != 1 {
		t.Fatalf("recover: %v %v", second, err)
	}
	if err = d.MarkPublished(ctx, id, "worker", first[0].LeaseToken); !errors.Is(err, outbox.ErrLeaseExpired) {
		t.Fatalf("stale token accepted: %v", err)
	}
	if err = d.MarkFailed(ctx, id, "worker", second[0].LeaseToken, 2); err != nil {
		t.Fatal(err)
	}
	frozen.Advance(time.Second)
	premature, err := d.LeaseEvents(ctx, "worker", 1, time.Minute)
	if err != nil || len(premature) != 0 {
		t.Fatalf("ignored retry delay: %v %v", premature, err)
	}
	frozen.Advance(time.Second)
	third, err := d.LeaseEvents(ctx, "worker", 1, time.Minute)
	if err != nil || len(third) != 1 {
		t.Fatalf("retry: %v %v", third, err)
	}
	if err = d.MarkFailed(ctx, id, "worker", third[0].LeaseToken, 2); err != nil {
		t.Fatal(err)
	}
	frozen.Advance(24 * time.Hour)
	terminal, err := d.LeaseEvents(ctx, "worker", 1, time.Minute)
	if err != nil || len(terminal) != 0 {
		t.Fatalf("terminal event leased again: %v %v", terminal, err)
	}
	var state, last string
	var attempts int
	if err = db.QueryRowContext(ctx, "SELECT state,retry_count,last_error FROM outbox_events WHERE id=$1", id).Scan(&state, &attempts, &last); err != nil {
		t.Fatal(err)
	}
	if state != "failed" || attempts != 2 || last == "" {
		t.Fatalf("failure not visible: %s %d %s", state, attempts, last)
	}
}
func TestOutboxConsumerReplayAndRollback(t *testing.T) {
	db, d := setupOutboxDB(t)
	ctx := context.Background()
	id := uuid.New()
	if _, err := db.ExecContext(ctx, `INSERT INTO outbox_events(id,organization_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,'test','person',$1,'{}')`, id, fixtures.OrgHeritageID); err != nil {
		t.Fatal(err)
	}
	failure := errors.New("fail consumer")
	err := d.Consume(ctx, "projection", outbox.Event{ID: id}, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, "UPDATE people SET first_name='Changed' WHERE id=$1", fixtures.PersonAdaID)
		if err != nil {
			return err
		}
		return failure
	})
	if !errors.Is(err, failure) {
		t.Fatal(err)
	}
	var name string
	if err = db.QueryRowContext(ctx, "SELECT first_name FROM people WHERE id=$1", fixtures.PersonAdaID).Scan(&name); err != nil || name != "Ada" {
		t.Fatalf("rollback: %s %v", name, err)
	}
	calls := 0
	handler := func(tx *sql.Tx) error {
		calls++
		_, err := tx.ExecContext(ctx, "UPDATE people SET first_name='Projected' WHERE id=$1", fixtures.PersonAdaID)
		return err
	}
	if err = d.Consume(ctx, "projection", outbox.Event{ID: id}, handler); err != nil {
		t.Fatal(err)
	}
	if err = d.Consume(ctx, "projection", outbox.Event{ID: id}, handler); !errors.Is(err, outbox.ErrAlreadyProcessed) {
		t.Fatal(err)
	}
	if calls != 1 {
		t.Fatalf("consumer ran %d times", calls)
	}
}
