package migration

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"database/sql/driver"
	"encoding/hex"
	"fmt"
	"io/fs"
	"log/slog"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/hofchurchng/church-backend/internal/v2/migrations"
)

const (
	AdvisoryLockID  = 982347102
	MigrationsTable = "schema_migrations_v2"
)

type MigrationFile struct {
	Version  int
	Name     string
	UpFile   string
	DownFile string
	UpSQL    string
	DownSQL  string
	Checksum string
}

type AppliedMigration struct {
	Version   int
	Name      string
	Checksum  string
	AppliedAt time.Time
}

type database interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	BeginTx(context.Context, *sql.TxOptions) (*sql.Tx, error)
}

type Runner struct {
	db     database
	pool   *sql.DB
	logger *slog.Logger
	files  []MigrationFile
}

func NewRunner(db *sql.DB, logger *slog.Logger) (*Runner, error) {
	if logger == nil {
		logger = slog.Default()
	}

	files, err := loadMigrationFiles(migrations.FS, ".")
	if err != nil {
		return nil, fmt.Errorf("failed to load migration files: %w", err)
	}

	return &Runner{
		db:     db,
		pool:   db,
		logger: logger,
		files:  files,
	}, nil
}

func NewRunnerWithFS(db *sql.DB, logger *slog.Logger, fsys fs.FS, dir string) (*Runner, error) {
	if logger == nil {
		logger = slog.Default()
	}

	files, err := loadMigrationFiles(fsys, dir)
	if err != nil {
		return nil, fmt.Errorf("failed to load migration files: %w", err)
	}

	return &Runner{
		db:     db,
		pool:   db,
		logger: logger,
		files:  files,
	}, nil
}

func loadMigrationFiles(fsys fs.FS, dir string) ([]MigrationFile, error) {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return nil, err
	}

	fileMap := make(map[int]*MigrationFile)

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		parts := strings.SplitN(entry.Name(), "_", 2)
		if len(parts) < 2 {
			continue
		}

		ver, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}

		mf, exists := fileMap[ver]
		if !exists {
			mf = &MigrationFile{Version: ver}
			fileMap[ver] = mf
		}

		fullPath := filepath.Join(dir, entry.Name())
		content, err := fs.ReadFile(fsys, fullPath)
		if err != nil {
			return nil, err
		}

		if strings.HasSuffix(entry.Name(), ".up.sql") {
			mf.UpFile = entry.Name()
			mf.UpSQL = string(content)
			hash := sha256.Sum256(content)
			mf.Checksum = hex.EncodeToString(hash[:])
			nameParts := strings.TrimSuffix(parts[1], ".up.sql")
			mf.Name = nameParts
		} else if strings.HasSuffix(entry.Name(), ".down.sql") {
			mf.DownFile = entry.Name()
			mf.DownSQL = string(content)
		}
	}

	var result []MigrationFile
	for _, mf := range fileMap {
		if mf.UpSQL != "" {
			result = append(result, *mf)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Version < result[j].Version
	})

	return result, nil
}

// EnsureSchemaMigrationsTable creates the migrations tracking table if not present.
func (r *Runner) EnsureSchemaMigrationsTable(ctx context.Context) error {
	query := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			version INT PRIMARY KEY,
			name TEXT NOT NULL,
			checksum TEXT NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`, MigrationsTable)

	_, err := r.db.ExecContext(ctx, query)
	return err
}

// locked pins every operation to the session owning the advisory lock.
func (r *Runner) locked(ctx context.Context, fn func(*Runner) (int, error)) (int, error) {
	conn, err := r.pool.Conn(ctx)
	if err != nil {
		return 0, err
	}
	defer conn.Close()
	if _, err = conn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", AdvisoryLockID); err != nil {
		return 0, err
	}
	defer func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if _, err := conn.ExecContext(cleanup, "SELECT pg_advisory_unlock($1)", AdvisoryLockID); err != nil {
			// Discard a session whose lock state is uncertain rather than pooling it.
			_ = conn.Raw(func(any) error { return driver.ErrBadConn })
		}
	}()
	child := *r
	child.db = conn
	return fn(&child)
}

func (r *Runner) GetApplied(ctx context.Context) (map[int]AppliedMigration, error) {
	query := fmt.Sprintf("SELECT version, name, checksum, applied_at FROM %s ORDER BY version ASC", MigrationsTable)
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[int]AppliedMigration)
	for rows.Next() {
		var am AppliedMigration
		if err := rows.Scan(&am.Version, &am.Name, &am.Checksum, &am.AppliedAt); err != nil {
			return nil, err
		}
		applied[am.Version] = am
	}

	return applied, rows.Err()
}

// Up applies all pending migrations in order with checksum verification.
func (r *Runner) Up(ctx context.Context) (int, error) {
	return r.locked(ctx, func(locked *Runner) (int, error) { return locked.up(ctx) })
}

func (r *Runner) up(ctx context.Context) (int, error) {
	if err := r.EnsureSchemaMigrationsTable(ctx); err != nil {
		return 0, err
	}

	applied, err := r.GetApplied(ctx)
	if err != nil {
		return 0, err
	}

	if err := r.validateApplied(applied); err != nil {
		return 0, err
	}
	// Verify checksums of already applied migrations
	for _, file := range r.files {
		if app, ok := applied[file.Version]; ok {
			if app.Checksum != file.Checksum {
				return 0, fmt.Errorf("migration checksum mismatch for version %06d (%s): recorded %s != current %s",
					file.Version, file.Name, app.Checksum, file.Checksum)
			}
		}
	}

	count := 0
	for _, file := range r.files {
		if _, ok := applied[file.Version]; ok {
			continue
		}

		r.logger.Info("Applying migration", "version", file.Version, "name", file.Name)

		tx, err := r.db.BeginTx(ctx, nil)
		if err != nil {
			return count, fmt.Errorf("begin tx for migration %06d: %w", file.Version, err)
		}

		if _, err := tx.ExecContext(ctx, file.UpSQL); err != nil {
			tx.Rollback()
			return count, fmt.Errorf("execute migration %06d (%s): %w", file.Version, file.Name, err)
		}

		recordQuery := fmt.Sprintf("INSERT INTO %s (version, name, checksum, applied_at) VALUES ($1, $2, $3, NOW())", MigrationsTable)
		if _, err := tx.ExecContext(ctx, recordQuery, file.Version, file.Name, file.Checksum); err != nil {
			tx.Rollback()
			return count, fmt.Errorf("record migration %06d: %w", file.Version, err)
		}

		if err := tx.Commit(); err != nil {
			return count, fmt.Errorf("commit migration %06d: %w", file.Version, err)
		}

		count++
		r.logger.Info("Successfully applied migration", "version", file.Version, "name", file.Name)
	}

	return count, nil
}

// Down rolls back the specified number of migrations.
func (r *Runner) Down(ctx context.Context, steps int) (int, error) {
	if steps <= 0 {
		return 0, nil
	}

	return r.locked(ctx, func(locked *Runner) (int, error) { return locked.down(ctx, steps) })
}

func (r *Runner) down(ctx context.Context, steps int) (int, error) {

	applied, err := r.GetApplied(ctx)
	if err != nil {
		return 0, err
	}

	if err := r.validateApplied(applied); err != nil {
		return 0, err
	}
	// Get applied versions in descending order
	var appliedVersions []int
	for v := range applied {
		appliedVersions = append(appliedVersions, v)
	}
	sort.Sort(sort.Reverse(sort.IntSlice(appliedVersions)))

	count := 0
	for _, v := range appliedVersions {
		if count >= steps {
			break
		}

		var file *MigrationFile
		for _, f := range r.files {
			if f.Version == v {
				file = &f
				break
			}
		}

		if file == nil || file.DownSQL == "" {
			return count, fmt.Errorf("down migration script missing for version %06d", v)
		}

		r.logger.Info("Reverting migration", "version", file.Version, "name", file.Name)

		tx, err := r.db.BeginTx(ctx, nil)
		if err != nil {
			return count, fmt.Errorf("begin tx for reverting %06d: %w", file.Version, err)
		}

		if _, err := tx.ExecContext(ctx, file.DownSQL); err != nil {
			tx.Rollback()
			return count, fmt.Errorf("execute down migration %06d (%s): %w", file.Version, file.Name, err)
		}

		deleteQuery := fmt.Sprintf("DELETE FROM %s WHERE version = $1", MigrationsTable)
		if _, err := tx.ExecContext(ctx, deleteQuery, file.Version); err != nil {
			tx.Rollback()
			return count, fmt.Errorf("delete migration record %06d: %w", file.Version, err)
		}

		if err := tx.Commit(); err != nil {
			return count, fmt.Errorf("commit reverting migration %06d: %w", file.Version, err)
		}

		count++
		r.logger.Info("Successfully reverted migration", "version", file.Version, "name", file.Name)
	}

	return count, nil
}

// EnsureReady checks that all migrations are applied and match checksums without modifying the database.
func (r *Runner) EnsureReady(ctx context.Context) error {
	applied, err := r.GetApplied(ctx)
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	if err := r.validateApplied(applied); err != nil {
		return err
	}
	for _, file := range r.files {
		app, ok := applied[file.Version]
		if !ok {
			return fmt.Errorf("unapplied migration pending: version %06d (%s)", file.Version, file.Name)
		}
		if app.Checksum != file.Checksum {
			return fmt.Errorf("migration checksum mismatch for version %06d (%s)", file.Version, file.Name)
		}
	}

	return nil
}

func (r *Runner) LatestVersion() int {
	if len(r.files) == 0 {
		return 0
	}
	return r.files[len(r.files)-1].Version
}

func (r *Runner) validateApplied(applied map[int]AppliedMigration) error {
	known := make(map[int]string)
	for _, f := range r.files {
		known[f.Version] = f.Checksum
	}
	for version, app := range applied {
		checksum, ok := known[version]
		if !ok {
			return fmt.Errorf("unknown applied migration version %d", version)
		}
		if checksum != app.Checksum {
			return fmt.Errorf("migration checksum mismatch for version %d", version)
		}
	}
	return nil
}
