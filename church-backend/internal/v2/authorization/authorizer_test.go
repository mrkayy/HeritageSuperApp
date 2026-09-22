package authorization_test

import (
	"context"
	"database/sql"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"testing"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/authorization"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupAuthzDB(t *testing.T) (*sql.DB, *identity.Service, *authorization.Service) {
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

	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatalf("fixtures: %v", err)
	}

	clk := clock.NewRealClock()
	sessionSvc := identity.NewService(db, clk)
	authzSvc := authorization.NewAuthorizer(db, clk)

	return db, sessionSvc, authzSvc
}

func TestAuthorization_ChoirLeadAndMembershipCallerScopeIsolation(t *testing.T) {
	db, sessionSvc, authzSvc := setupAuthzDB(t)
	defer db.Close()
	ctx := context.Background()

	authCtx, err := sessionSvc.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if err != nil {
		t.Fatalf("resolve Ada session: %v", err)
	}

	// 1. Ada accessing Lekki Choir roster (Scope: TEAM) -> MUST ALLOW
	dec, err := authzSvc.Authorize(ctx, authCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "team.roster.view",
		TargetScope:          authorization.ScopeTeam,
		TargetBranchID:       &fixtures.BranchLekkiID,
		TargetResourceID:     &fixtures.TeamLekkiChoirID,
	})
	if err != nil || !dec.Allowed {
		t.Errorf("expected ALLOW for Lekki Choir roster, got: allowed=%v, reason=%s (err: %v)", dec.Allowed, dec.Reason, err)
	}

	// 2. Ada accessing Ikeja Choir roster (different branch) -> MUST DENY
	dec, err = authzSvc.Authorize(ctx, authCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "team.roster.view",
		TargetScope:          authorization.ScopeTeam,
		TargetBranchID:       &fixtures.BranchIkejaID,
		TargetResourceID:     &fixtures.TeamIkejaChoirID,
	})
	if err != nil || dec.Allowed {
		t.Errorf("expected DENY for Ikeja Choir roster, got allowed=%v", dec.Allowed)
	}

	// 3. Ada logging follow-up on assigned visitor Kemi (PersonVisitorK) -> MUST ALLOW
	dec, err = authzSvc.Authorize(ctx, authCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "membership.followup.perform",
		TargetScope:          authorization.ScopeAssigned,
		TargetBranchID:       &fixtures.BranchLekkiID,
		TargetResourceID:     &fixtures.PersonVisitorK,
	})
	if err != nil || !dec.Allowed {
		t.Errorf("expected ALLOW for assigned visitor Kemi, got: allowed=%v, reason=%s", dec.Allowed, dec.Reason)
	}

	// 4. Ada logging follow-up on an UNASSIGNED person (PersonTundeID) -> MUST DENY
	// (Crucial invariant: Ada's Choir Team Lead scope must NOT widen her follow-up caller scope!)
	dec, err = authzSvc.Authorize(ctx, authCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "membership.followup.perform",
		TargetScope:          authorization.ScopeAssigned,
		TargetBranchID:       &fixtures.BranchLekkiID,
		TargetResourceID:     &fixtures.PersonTundeID,
	})
	if err != nil || dec.Allowed {
		t.Errorf("expected DENY for unassigned person follow-up, got allowed=%v", dec.Allowed)
	}

	// 5. Ada requesting Pastoral SitRep -> MUST DENY (PASTORAL_CONFIDENTIAL requires explicit grant)
	dec, err = authzSvc.Authorize(ctx, authCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "pastoral.sitrep.view",
		TargetScope:          authorization.ScopeChurch,
		Sensitivity:          authorization.SensitivityPastoralConfidential,
	})
	if err != nil || dec.Allowed {
		t.Errorf("expected DENY for pastoral confidential record, got allowed=%v", dec.Allowed)
	}
}

func TestAuthorization_DelegationAndRevocation(t *testing.T) {
	db, _, authzSvc := setupAuthzDB(t)
	defer db.Close()
	ctx := context.Background()

	// Create an assistant assignment for Tunde in Lekki Choir
	assistantAssignID := uuid.New()
	_, err := db.ExecContext(ctx, `
		INSERT INTO assignments (id, organization_id, branch_id, person_id, scope_level, scope_resource_id)
		VALUES ($1, $2, $3, $4, 'TEAM', $5)
	`, assistantAssignID, fixtures.OrgHeritageID, fixtures.BranchLekkiID, fixtures.PersonTundeID, fixtures.TeamLekkiChoirID)
	if err != nil {
		t.Fatalf("create assistant assignment: %v", err)
	}

	// Find Ada's grant for team.roster.view
	var adaGrantID uuid.UUID
	err = db.QueryRowContext(ctx, `
		SELECT sg.id FROM scoped_grants sg
		JOIN capabilities c ON sg.capability_id = c.id
		WHERE sg.assignment_id = $1 AND c.code = 'team.roster.view'
	`, fixtures.AssignmentAdaChoirID).Scan(&adaGrantID)
	if err != nil {
		t.Fatalf("find Ada grant: %v", err)
	}

	// Delegate from Ada to Tunde's assignment
	delegationID := uuid.New()
	_, err = db.ExecContext(ctx, `
		INSERT INTO delegations (id, parent_grant_id, delegated_to_assignment_id, valid_from, valid_until)
		VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '1 day')
	`, delegationID, adaGrantID, assistantAssignID)
	if err != nil {
		t.Fatalf("insert delegation: %v", err)
	}

	tundeAccount := uuid.New()
	if _, err := db.ExecContext(ctx, "INSERT INTO accounts(id,organization_id,person_id) VALUES($1,$2,$3)", tundeAccount, fixtures.OrgHeritageID, fixtures.PersonTundeID); err != nil {
		t.Fatal(err)
	}
	tundeCtx := &identity.AuthContext{
		AccountID:      tundeAccount,
		PersonID:       fixtures.PersonTundeID,
		OrganizationID: fixtures.OrgHeritageID,
	}

	// 1. Tunde evaluates delegated grant -> MUST ALLOW
	dec, err := authzSvc.Authorize(ctx, tundeCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "team.roster.view",
		TargetScope:          authorization.ScopeTeam,
		TargetResourceID:     &fixtures.TeamLekkiChoirID,
	})
	if err != nil || !dec.Allowed {
		t.Errorf("expected ALLOW for delegated grant, got: allowed=%v, reason=%s", dec.Allowed, dec.Reason)
	}

	if _, err = db.ExecContext(ctx, "UPDATE scoped_grants SET valid_until=NOW()-INTERVAL '1 hour' WHERE id=$1", adaGrantID); err != nil {
		t.Fatal(err)
	}
	dec, err = authzSvc.Authorize(ctx, tundeCtx, authorization.AuthzRequest{TargetOrganizationID: fixtures.OrgHeritageID, Capability: "team.roster.view", TargetScope: authorization.ScopeTeam, TargetResourceID: &fixtures.TeamLekkiChoirID})
	if err != nil || dec.Allowed {
		t.Fatalf("expired source grant delegated: %+v %v", dec, err)
	}
	if _, err = db.ExecContext(ctx, "UPDATE scoped_grants SET valid_until=NULL WHERE id=$1", adaGrantID); err != nil {
		t.Fatal(err)
	}
	// 2. Revoke Ada's parent assignment -> Tunde's delegated access MUST IMMEDIATELY DENY!
	_, err = db.ExecContext(ctx, `UPDATE assignments SET revoked_at = NOW() WHERE id = $1`, fixtures.AssignmentAdaChoirID)
	if err != nil {
		t.Fatalf("revoke parent assignment: %v", err)
	}

	dec, err = authzSvc.Authorize(ctx, tundeCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "team.roster.view",
		TargetScope:          authorization.ScopeTeam,
		TargetResourceID:     &fixtures.TeamLekkiChoirID,
	})
	if err != nil || dec.Allowed {
		t.Errorf("expected DENY after parent assignment revocation, got allowed=%v", dec.Allowed)
	}
}

func TestAuthorization_BaselineGrantSelfScope(t *testing.T) {
	db, sessionSvc, authzSvc := setupAuthzDB(t)
	defer db.Close()
	ctx := context.Background()

	authCtx, err := sessionSvc.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if err != nil {
		t.Fatalf("resolve Ada session: %v", err)
	}

	// Requesting member.baseline.view with SELF scope -> MUST ALLOW
	dec, err := authzSvc.Authorize(ctx, authCtx, authorization.AuthzRequest{
		TargetOrganizationID: fixtures.OrgHeritageID,
		Capability:           "member.baseline.view",
		TargetScope:          authorization.ScopeSelf,
		TargetResourceID:     &authCtx.PersonID,
	})
	if err != nil || !dec.Allowed {
		t.Errorf("expected ALLOW for baseline grant, got: allowed=%v, reason=%s", dec.Allowed, dec.Reason)
	}
}
