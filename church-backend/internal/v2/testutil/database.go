// Package testutil owns disposable databases; it never drops a configured database or schema.
package testutil

import (
	"context"
	"database/sql"
	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

func Open(t *testing.T) *sql.DB {
	t.Helper()
	raw := os.Getenv("V2_TEST_DATABASE_URL")
	if raw == "" {
		t.Skip("PostgreSQL integration test: run make v2-test-integration")
	}
	u, err := url.Parse(raw)
	if err != nil || u.Path != "/hof_v2_test" {
		t.Fatal("V2_TEST_DATABASE_URL must explicitly target hof_v2_test")
	}
	admin, err := sql.Open("pgx", raw)
	if err != nil {
		t.Fatal("open test database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err = admin.PingContext(ctx); err != nil {
		admin.Close()
		t.Fatal("test PostgreSQL unavailable")
	}
	name := "hof_v2_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if _, err = admin.ExecContext(ctx, `CREATE DATABASE "`+name+`" TEMPLATE template0`); err != nil {
		admin.Close()
		t.Fatalf("create disposable database: %v", err)
	}
	u.Path = "/" + name
	db, err := sql.Open("pgx", u.String())
	if err != nil {
		t.Fatal("open disposable database")
	}
	t.Cleanup(func() {
		db.Close()
		cleanup, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if _, err := admin.ExecContext(cleanup, `DROP DATABASE "`+name+`" WITH (FORCE)`); err != nil {
			t.Errorf("cleanup disposable database: %v", err)
		}
		admin.Close()
	})
	return db
}
