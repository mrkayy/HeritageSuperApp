package migration_test

import (
	"context"
	"database/sql"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"sync"
	"testing"
	"testing/fstest"

	"github.com/hofchurchng/church-backend/internal/v2/migration"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func getTestDB(t *testing.T) *sql.DB {
	t.Helper()
	return testutil.Open(t)
}

func TestMigration_FreshAndRepeat(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()

	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatalf("NewRunner: %v", err)
	}

	// 1. Fresh migration
	count, err := runner.Up(ctx)
	if err != nil {
		t.Fatalf("Fresh Up failed: %v", err)
	}
	if count < 1 {
		t.Errorf("expected at least 1 migration applied, got %d", count)
	}

	// 2. EnsureReady passes
	if err := runner.EnsureReady(ctx); err != nil {
		t.Errorf("EnsureReady failed after Up: %v", err)
	}

	// 3. Repeat run applies 0 migrations
	repeatCount, err := runner.Up(ctx)
	if err != nil {
		t.Fatalf("Repeat Up failed: %v", err)
	}
	if repeatCount != 0 {
		t.Errorf("expected 0 migrations on repeat run, got %d", repeatCount)
	}
}

func TestMigration_ChecksumMismatch(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	ctx := context.Background()

	// Initial migration with mock filesystem
	mockFS1 := fstest.MapFS{
		"000001_init.up.sql":   &fstest.MapFile{Data: []byte("CREATE TABLE t1 (id INT PRIMARY KEY);")},
		"000001_init.down.sql": &fstest.MapFile{Data: []byte("DROP TABLE t1;")},
	}

	runner1, err := migration.NewRunnerWithFS(db, nil, mockFS1, ".")
	if err != nil {
		t.Fatalf("NewRunnerWithFS: %v", err)
	}

	if _, err := runner1.Up(ctx); err != nil {
		t.Fatalf("runner1.Up: %v", err)
	}

	// Second runner has tampered SQL for the already applied migration
	mockFS2 := fstest.MapFS{
		"000001_init.up.sql":   &fstest.MapFile{Data: []byte("CREATE TABLE t1 (id INT PRIMARY KEY, tampered BOOLEAN);")},
		"000001_init.down.sql": &fstest.MapFile{Data: []byte("DROP TABLE t1;")},
	}

	runner2, err := migration.NewRunnerWithFS(db, nil, mockFS2, ".")
	if err != nil {
		t.Fatalf("NewRunnerWithFS 2: %v", err)
	}

	_, err = runner2.Up(ctx)
	if err == nil {
		t.Fatal("expected error due to checksum mismatch, but got nil")
	}
}

func TestMigration_ConcurrentAdvisoryLock(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	ctx := context.Background()
	runner1, _ := migration.NewRunner(db, nil)
	runner2, _ := migration.NewRunner(db, nil)

	var wg sync.WaitGroup
	wg.Add(2)

	var err1, err2 error
	go func() {
		defer wg.Done()
		_, err1 = runner1.Up(ctx)
	}()

	go func() {
		defer wg.Done()
		_, err2 = runner2.Up(ctx)
	}()

	wg.Wait()

	if err1 != nil {
		t.Errorf("runner 1 error: %v", err1)
	}
	if err2 != nil {
		t.Errorf("runner 2 error: %v", err2)
	}

	// Database must be ready
	if err := runner1.EnsureReady(ctx); err != nil {
		t.Errorf("EnsureReady after concurrent runs: %v", err)
	}
}
