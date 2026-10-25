package idempotency_test

import (
	"context"
	"database/sql"
	"errors"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/idempotency"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestIdempotencyConcurrentAtomicReplayAndRollback(t *testing.T) {
	db, store := setupIdempotencyDB(t)
	ctx := context.Background()
	var calls atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rec, err := store.Execute(ctx, fixtures.OrgHeritageID, "concurrent", []byte("body"), time.Hour, func(tx *sql.Tx) (int, []byte, error) {
				calls.Add(1)
				_, err := tx.ExecContext(ctx, "UPDATE people SET first_name='Once' WHERE id=$1", fixtures.PersonAdaID)
				return 200, []byte("saved"), err
			})
			if err != nil || rec == nil || string(rec.ResponseBody) != "saved" {
				t.Errorf("execute: %v %v", rec, err)
			}
		}()
	}
	wg.Wait()
	if calls.Load() != 1 {
		t.Fatalf("domain command executed %d times", calls.Load())
	}
	_, err := store.Execute(ctx, fixtures.OrgHeritageID, "concurrent", []byte("different"), time.Hour, func(*sql.Tx) (int, []byte, error) { t.Error("conflicting handler ran"); return 200, nil, nil })
	if !errors.Is(err, idempotency.ErrIdempotencyConflict) {
		t.Fatalf("conflict: %v", err)
	}
	failure := errors.New("domain failure")
	_, err = store.Execute(ctx, fixtures.OrgHeritageID, "rollback", nil, time.Hour, func(tx *sql.Tx) (int, []byte, error) {
		if _, err := tx.ExecContext(ctx, "UPDATE people SET first_name='Rollback' WHERE id=$1", fixtures.PersonAdaID); err != nil {
			return 0, nil, err
		}
		return 0, nil, failure
	})
	if !errors.Is(err, failure) {
		t.Fatal(err)
	}
	var name string
	if err = db.QueryRowContext(ctx, "SELECT first_name FROM people WHERE id=$1", fixtures.PersonAdaID).Scan(&name); err != nil || name != "Once" {
		t.Fatalf("domain rollback: %s %v", name, err)
	}
	rec, err := store.Check(ctx, fixtures.OrgHeritageID, "rollback", nil)
	if err != nil || rec != nil {
		t.Fatalf("rolled back response persisted: %+v %v", rec, err)
	}
}
func TestIdempotencyExpiredKeyReplacesHash(t *testing.T) {
	db, _ := setupIdempotencyDB(t)
	ctx := context.Background()
	frozen := clock.NewFrozenClock(time.Now())
	store := idempotency.NewStore(db, frozen)
	if err := store.Save(ctx, fixtures.OrgHeritageID, "reuse", []byte("old"), 200, []byte("old"), time.Minute); err != nil {
		t.Fatal(err)
	}
	frozen.Advance(time.Minute)
	if err := store.Save(ctx, fixtures.OrgHeritageID, "reuse", []byte("new"), 201, []byte("new"), time.Minute); err != nil {
		t.Fatal(err)
	}
	rec, err := store.Check(ctx, fixtures.OrgHeritageID, "reuse", []byte("new"))
	if err != nil || rec == nil || rec.StatusCode != 201 {
		t.Fatalf("expired key poisoned: %+v %v", rec, err)
	}
	if err = store.Save(ctx, fixtures.OrgHeritageID, "reuse", []byte("wrong"), 202, []byte("wrong"), time.Minute); !errors.Is(err, idempotency.ErrIdempotencyConflict) {
		t.Fatalf("save overwrote mismatching hash: %v", err)
	}
}
