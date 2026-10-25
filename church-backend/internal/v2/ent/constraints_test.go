package ent_test

import (
	"context"
	"database/sql"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"testing"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db := testutil.Open(t)
	ctx := context.Background()

	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatalf("migration runner: %v", err)
	}
	if _, err := runner.Up(ctx); err != nil {
		t.Fatalf("migrate up: %v", err)
	}

	return db
}

func TestPostgreSQLConstraints_SharedContactsAllowed(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	ctx := context.Background()

	orgID := uuid.New()
	_, err := db.ExecContext(ctx, `INSERT INTO organizations (id, name, slug) VALUES ($1, 'Org 1', 'org-1')`, orgID)
	if err != nil {
		t.Fatalf("insert org: %v", err)
	}

	p1 := uuid.New()
	p2 := uuid.New()
	_, err = db.ExecContext(ctx, `INSERT INTO people (id, organization_id, first_name, last_name) VALUES ($1, $3, 'P1', 'L1'), ($2, $3, 'P2', 'L2')`, p1, p2, orgID)
	if err != nil {
		t.Fatalf("insert people: %v", err)
	}

	sharedPhone := "+2348099998888"
	normPhone := "2348099998888"

	// Insert contact point for Person 1
	_, err = db.ExecContext(ctx, `
		INSERT INTO contact_points (id, organization_id, person_id, kind, raw_value, normalized_value, is_shared)
		VALUES ($1, $2, $3, 'phone', $4, $5, true)
	`, uuid.New(), orgID, p1, sharedPhone, normPhone)
	if err != nil {
		t.Fatalf("insert cp1: %v", err)
	}

	// Insert SAME contact point for Person 2 (must SUCCEED!)
	_, err = db.ExecContext(ctx, `
		INSERT INTO contact_points (id, organization_id, person_id, kind, raw_value, normalized_value, is_shared)
		VALUES ($1, $2, $3, 'phone', $4, $5, true)
	`, uuid.New(), orgID, p2, sharedPhone, normPhone)
	if err != nil {
		t.Fatalf("insert cp2 failed with shared contact: %v", err)
	}

	var count int
	err = db.QueryRowContext(ctx, `SELECT COUNT(*) FROM contact_points WHERE normalized_value = $1`, normPhone).Scan(&count)
	if err != nil || count != 2 {
		t.Errorf("expected 2 contact points with same phone, got %d (err: %v)", count, err)
	}
}

func TestPostgreSQLConstraints_SingleActiveAccountPerPerson(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	ctx := context.Background()

	orgID := uuid.New()
	personID := uuid.New()
	_, _ = db.ExecContext(ctx, `INSERT INTO organizations (id, name, slug) VALUES ($1, 'Org 1', 'org-1')`, orgID)
	_, _ = db.ExecContext(ctx, `INSERT INTO people (id, organization_id, first_name) VALUES ($1, $2, 'Alice')`, personID, orgID)

	// First active account: succeeds
	_, err := db.ExecContext(ctx, `
		INSERT INTO accounts (id, organization_id, person_id, status)
		VALUES ($1, $2, $3, 'active')
	`, uuid.New(), orgID, personID)
	if err != nil {
		t.Fatalf("first active account failed: %v", err)
	}

	// Second active account for same person: MUST FAIL due to idx_accounts_single_active
	_, err = db.ExecContext(ctx, `
		INSERT INTO accounts (id, organization_id, person_id, status)
		VALUES ($1, $2, $3, 'active')
	`, uuid.New(), orgID, personID)
	if err == nil {
		t.Fatal("expected unique constraint violation on second active account, got nil")
	}

	// But a suspended account for same person is permitted (e.g. historical replacement)
	_, err = db.ExecContext(ctx, `
		INSERT INTO accounts (id, organization_id, person_id, status)
		VALUES ($1, $2, $3, 'suspended')
	`, uuid.New(), orgID, personID)
	if err != nil {
		t.Fatalf("insert suspended account failed: %v", err)
	}
}

func TestPostgreSQLConstraints_SinglePrimaryActiveAffiliation(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	ctx := context.Background()

	orgID := uuid.New()
	b1 := uuid.New()
	b2 := uuid.New()
	personID := uuid.New()

	_, _ = db.ExecContext(ctx, `INSERT INTO organizations (id, name, slug) VALUES ($1, 'Org 1', 'org-1')`, orgID)
	_, _ = db.ExecContext(ctx, `INSERT INTO branches (id, organization_id, name, slug) VALUES ($1, $3, 'B1', 'b1'), ($2, $3, 'B2', 'b2')`, b1, b2, orgID)
	_, _ = db.ExecContext(ctx, `INSERT INTO people (id, organization_id, first_name) VALUES ($1, $2, 'Bob')`, personID, orgID)

	// Primary active affiliation to B1: succeeds
	_, err := db.ExecContext(ctx, `
		INSERT INTO church_affiliations (id, organization_id, person_id, branch_id, relationship_status, is_primary)
		VALUES ($1, $2, $3, $4, 'active', true)
	`, uuid.New(), orgID, personID, b1)
	if err != nil {
		t.Fatalf("first primary affiliation failed: %v", err)
	}

	// Second primary active affiliation to B2: MUST FAIL
	_, err = db.ExecContext(ctx, `
		INSERT INTO church_affiliations (id, organization_id, person_id, branch_id, relationship_status, is_primary)
		VALUES ($1, $2, $3, $4, 'active', true)
	`, uuid.New(), orgID, personID, b2)
	if err == nil {
		t.Fatal("expected unique constraint violation on second primary active affiliation, got nil")
	}

	// Non-primary active affiliation is allowed
	_, err = db.ExecContext(ctx, `
		INSERT INTO church_affiliations (id, organization_id, person_id, branch_id, relationship_status, is_primary)
		VALUES ($1, $2, $3, $4, 'active', false)
	`, uuid.New(), orgID, personID, b2)
	if err != nil {
		t.Fatalf("non-primary affiliation failed: %v", err)
	}
}

func TestPostgreSQLConstraints_AppendOnlyAuditEvents(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	ctx := context.Background()

	orgID := uuid.New()
	_, _ = db.ExecContext(ctx, `INSERT INTO organizations (id, name, slug) VALUES ($1, 'Org 1', 'org-1')`, orgID)

	auditID := uuid.New()
	_, err := db.ExecContext(ctx, `
		INSERT INTO audit_events (id, organization_id, action, resource_type, sensitivity)
		VALUES ($1, $2, 'person.created', 'person', 'GENERAL')
	`, auditID, orgID)
	if err != nil {
		t.Fatalf("insert audit event: %v", err)
	}

	// Attempt to UPDATE audit_events: MUST FAIL due to trigger
	_, err = db.ExecContext(ctx, `UPDATE audit_events SET action = 'tampered' WHERE id = $1`, auditID)
	if err == nil {
		t.Fatal("expected exception on UPDATE to audit_events, but got nil")
	}

	// Attempt to DELETE audit_events: MUST FAIL due to trigger
	_, err = db.ExecContext(ctx, `DELETE FROM audit_events WHERE id = $1`, auditID)
	if err == nil {
		t.Fatal("expected exception on DELETE to audit_events, but got nil")
	}
}
