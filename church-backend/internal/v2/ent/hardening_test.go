package ent_test

import (
	"context"
	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/google/uuid"
	v2ent "github.com/hofchurchng/church-backend/internal/v2/ent"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/database"
	"testing"
)

func TestConstraintsTenantsPeriodsAndRuntimePrivileges(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatal(err)
	}
	other := uuid.New()
	if _, err := db.ExecContext(ctx, "INSERT INTO organizations(id,name,slug) VALUES($1,'Other','other')", other); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, query string
		args        []any
	}{
		{"cross_org_person", "INSERT INTO accounts(organization_id,person_id) VALUES($1,$2)", []any{other, fixtures.PersonAdaID}},
		{"cross_org_branch", "INSERT INTO teams(organization_id,branch_id,name) VALUES($1,$2,'Invalid')", []any{other, fixtures.BranchLekkiID}},
		{"cross_branch_team", "INSERT INTO assignments(organization_id,branch_id,person_id,team_id,scope_level,scope_resource_id) VALUES($1,$2,$3,$4,'TEAM',$4)", []any{fixtures.OrgHeritageID, fixtures.BranchIkejaID, fixtures.PersonAdaID, fixtures.TeamLekkiChoirID}},
		{"invalid_period", "INSERT INTO assignments(organization_id,person_id,scope_level,valid_from,valid_until) VALUES($1,$2,'ORGANIZATION',NOW(),NOW()-INTERVAL '1 hour')", []any{fixtures.OrgHeritageID, fixtures.PersonAdaID}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := db.ExecContext(ctx, tc.query, tc.args...); err == nil {
				t.Fatal("invalid reference accepted")
			}
		})
	}
	if err := database.VerifyRuntimeRole(ctx, db); err == nil {
		t.Fatal("owner accepted as runtime")
	}
	db.SetMaxOpenConns(1)
	if _, err := db.ExecContext(ctx, "SET ROLE hof_v2_app"); err != nil {
		t.Fatal(err)
	}
	defer db.ExecContext(ctx, "RESET ROLE")
	if err := database.VerifyRuntimeRole(ctx, db); err != nil {
		t.Fatal(err)
	}
	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatal(err)
	}
	if err = runner.EnsureReady(ctx); err != nil {
		t.Fatalf("runtime readiness: %v", err)
	}
	if _, err = db.ExecContext(ctx, `INSERT INTO audit_events(organization_id,action,resource_type) VALUES($1,'test','person')`, fixtures.OrgHeritageID); err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{"UPDATE audit_events SET action='changed'", "DELETE FROM audit_events", "TRUNCATE audit_events", "ALTER TABLE audit_events DISABLE TRIGGER ALL", "CREATE TABLE startup_mutation(id int)", "DELETE FROM schema_migrations_v2"} {
		if _, err = db.ExecContext(ctx, query); err == nil {
			t.Fatalf("runtime privilege escalation: %s", query)
		}
	}
}
func TestEntClientMatchesMigratedSchemaAndFixtureRepeat(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatal(err)
	}
	var before, after int
	if err := db.QueryRowContext(ctx, "SELECT count(*) FROM scoped_grants").Scan(&before); err != nil {
		t.Fatal(err)
	}
	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, "SELECT count(*) FROM scoped_grants").Scan(&after); err != nil {
		t.Fatal(err)
	}
	if before != after {
		t.Fatalf("fixture repeat duplicated grants: %d -> %d", before, after)
	}
	client := v2ent.NewClient(v2ent.Driver(entsql.OpenDB(dialect.Postgres, db)))
	checks := map[string]func() error{
		"Organization":      func() error { _, err := client.Organization.Query().All(ctx); return err },
		"Branch":            func() error { _, err := client.Branch.Query().All(ctx); return err },
		"Sector":            func() error { _, err := client.Sector.Query().All(ctx); return err },
		"Team":              func() error { _, err := client.Team.Query().All(ctx); return err },
		"Person":            func() error { _, err := client.Person.Query().All(ctx); return err },
		"ContactPoint":      func() error { _, err := client.ContactPoint.Query().All(ctx); return err },
		"ChurchAffiliation": func() error { _, err := client.ChurchAffiliation.Query().All(ctx); return err },
		"Account":           func() error { _, err := client.Account.Query().All(ctx); return err },
		"AuthMethod":        func() error { _, err := client.AuthMethod.Query().All(ctx); return err },
		"Session":           func() error { _, err := client.Session.Query().All(ctx); return err },
		"Assignment":        func() error { _, err := client.Assignment.Query().All(ctx); return err },
		"RoleTemplate":      func() error { _, err := client.RoleTemplate.Query().All(ctx); return err },
		"Capability":        func() error { _, err := client.Capability.Query().All(ctx); return err },
		"RoleCapability":    func() error { _, err := client.RoleCapability.Query().All(ctx); return err },
		"ScopedGrant":       func() error { _, err := client.ScopedGrant.Query().All(ctx); return err },
		"BaselineGrant":     func() error { _, err := client.BaselineGrant.Query().All(ctx); return err },
		"Delegation":        func() error { _, err := client.Delegation.Query().All(ctx); return err },
		"AuditEvent":        func() error { _, err := client.AuditEvent.Query().All(ctx); return err },
		"OutboxEvent":       func() error { _, err := client.OutboxEvent.Query().All(ctx); return err },
		"ConsumerReceipt":   func() error { _, err := client.ConsumerReceipt.Query().All(ctx); return err },
		"IdempotencyRecord": func() error { _, err := client.IdempotencyRecord.Query().All(ctx); return err },
		"LegacyRecordMap":   func() error { _, err := client.LegacyRecordMap.Query().All(ctx); return err },
	}
	for name, check := range checks {
		t.Run(name, func(t *testing.T) {
			if err := check(); err != nil {
				t.Fatal(err)
			}
		})
	}
}
