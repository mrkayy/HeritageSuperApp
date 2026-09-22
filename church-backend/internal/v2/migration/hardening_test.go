package migration_test

import (
	"context"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"sync"
	"testing"
	"time"
)

func TestReadinessDoesNotCreateSchema(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()
	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatal(err)
	}
	if err = runner.EnsureReady(ctx); err == nil {
		t.Fatal("unmigrated database ready")
	}
	var count int
	if err = db.QueryRowContext(ctx, "SELECT count(*) FROM pg_tables WHERE schemaname='public'").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("readiness created %d tables", count)
	}
}
func TestMigrationSamePoolSingleConnectionAndFutureVersion(t *testing.T) {
	db := getTestDB(t)
	db.SetMaxOpenConns(1)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := runner.Up(ctx); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	var locked bool
	if err = db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid())").Scan(&locked); err != nil {
		t.Fatal(err)
	}
	if locked {
		t.Fatal("migration connection retained advisory lock")
	}
	if _, err = db.ExecContext(ctx, "INSERT INTO schema_migrations_v2 VALUES(999,'unknown','unknown',NOW())"); err != nil {
		t.Fatal(err)
	}
	if err = runner.EnsureReady(ctx); err == nil {
		t.Fatal("future schema accepted")
	}
	if _, err = runner.Up(ctx); err == nil {
		t.Fatal("future migration history accepted")
	}
}
