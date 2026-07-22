// Package migrate applies every module's own migrations/ folder against
// the single shared database. Modules never touch each other's schema -
// they just each register their migrations directory here.
package migrate

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ModuleMigrations pairs a module name with its embedded SQL files.
// Each module exposes one of these; main.go collects them all.
type ModuleMigrations struct {
	Module string
	FS     embed.FS
	Dir    string // e.g. "migrations"
}

const trackerDDL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
	module      TEXT NOT NULL,
	filename    TEXT NOT NULL,
	applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (module, filename)
);`

// Run applies any not-yet-applied migration file, per module, in filename
// order. Filenames should be numbered, e.g. 0001_create_members.up.sql.
func Run(ctx context.Context, pool *pgxpool.Pool, modules []ModuleMigrations) error {
	if _, err := pool.Exec(ctx, trackerDDL); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for _, m := range modules {
		entries, err := fs.ReadDir(m.FS, m.Dir)
		if err != nil {
			return fmt.Errorf("read migrations for %s: %w", m.Module, err)
		}
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name())
		}
		sort.Strings(names)

		for _, name := range names {
			var already bool
			err := pool.QueryRow(ctx,
				`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE module=$1 AND filename=$2)`,
				m.Module, name,
			).Scan(&already)
			if err != nil {
				return err
			}
			if already {
				continue
			}

			content, err := fs.ReadFile(m.FS, m.Dir+"/"+name)
			if err != nil {
				return err
			}

			tx, err := pool.Begin(ctx)
			if err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, string(content)); err != nil {
				tx.Rollback(ctx)
				return fmt.Errorf("apply %s/%s: %w", m.Module, name, err)
			}
			if _, err := tx.Exec(ctx,
				`INSERT INTO schema_migrations (module, filename) VALUES ($1, $2)`,
				m.Module, name,
			); err != nil {
				tx.Rollback(ctx)
				return err
			}
			if err := tx.Commit(ctx); err != nil {
				return err
			}
			fmt.Printf("applied migration: %s/%s\n", m.Module, name)
		}
	}
	return nil
}
