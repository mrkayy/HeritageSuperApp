package authorization_test

import (
	"context"
	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/authorization"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"testing"
)

func TestAuthorization_TargetsBaselineAndImmediateRevocation(t *testing.T) {
	db, sessions, auth := setupAuthzDB(t)
	ctx := context.Background()
	actor, err := sessions.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if err != nil {
		t.Fatal(err)
	}
	base := authorization.AuthzRequest{TargetOrganizationID: actor.OrganizationID, Capability: "member.baseline.view", TargetScope: authorization.ScopeSelf, TargetResourceID: &actor.PersonID}
	for _, name := range []string{"other_person", "other_org", "missing_org", "confidential"} {
		t.Run(name, func(t *testing.T) {
			req := base
			switch name {
			case "other_person":
				req.TargetResourceID = &fixtures.PersonTundeID
			case "other_org":
				req.TargetOrganizationID = uuid.New()
			case "missing_org":
				req.TargetOrganizationID = uuid.Nil
			case "confidential":
				req.Sensitivity = authorization.SensitivityPastoralConfidential
			}
			d, e := auth.Authorize(ctx, actor, req)
			if e != nil || d.Allowed {
				t.Fatalf("expected deny: %+v %v", d, e)
			}
		})
	}
	if _, err = db.ExecContext(ctx, "DELETE FROM baseline_grants WHERE account_id=$1", actor.AccountID); err != nil {
		t.Fatal(err)
	}
	d, err := auth.Authorize(ctx, actor, base)
	if err != nil || d.Allowed {
		t.Fatalf("cached baseline accepted: %+v %v", d, err)
	}
	req := authorization.AuthzRequest{TargetOrganizationID: actor.OrganizationID, Capability: "team.roster.view", TargetScope: authorization.ScopeTeam, TargetResourceID: &fixtures.TeamLekkiChoirID, TargetBranchID: &fixtures.BranchIkejaID}
	d, err = auth.Authorize(ctx, actor, req)
	if err != nil || d.Allowed {
		t.Fatalf("forged branch accepted: %+v %v", d, err)
	}
	req.TargetBranchID = &fixtures.BranchLekkiID
	for _, step := range []struct {
		query string
		allow bool
	}{
		{"UPDATE assignments SET valid_until=NOW()-INTERVAL '1 hour' WHERE id=$1", false},
		{"UPDATE assignments SET valid_until=NULL WHERE id=$1", true},
		{"UPDATE scoped_grants SET revoked_at=NOW() WHERE assignment_id=$1", false},
	} {
		if _, err = db.ExecContext(ctx, step.query, fixtures.AssignmentAdaChoirID); err != nil {
			t.Fatal(err)
		}
		d, err = auth.Authorize(ctx, actor, req)
		if err != nil || d.Allowed != step.allow {
			t.Fatalf("%s: %+v %v", step.query, d, err)
		}
	}
}
func TestAuthorization_ExecutiveAndPlatformNeedExplicitSensitivity(t *testing.T) {
	db, sessions, auth := setupAuthzDB(t)
	ctx := context.Background()
	actor, err := sessions.ResolveSession(ctx, fixtures.RawSessionTokenAda)
	if err != nil {
		t.Fatal(err)
	}
	for _, scope := range []authorization.ScopeLevel{authorization.ScopeOrganization, authorization.ScopePlatform} {
		t.Run(string(scope), func(t *testing.T) {
			assignment, grant := uuid.New(), uuid.New()
			if _, err = db.ExecContext(ctx, `INSERT INTO assignments(id,organization_id,person_id,scope_level) VALUES($1,$2,$3,$4)`, assignment, actor.OrganizationID, actor.PersonID, scope); err != nil {
				t.Fatal(err)
			}
			if _, err = db.ExecContext(ctx, `INSERT INTO scoped_grants(id,assignment_id,capability_id,scope_level) VALUES($1,$2,$3,$4)`, grant, assignment, fixtures.CapTeamRosterView, scope); err != nil {
				t.Fatal(err)
			}
			req := authorization.AuthzRequest{TargetOrganizationID: actor.OrganizationID, Capability: "team.roster.view", TargetScope: scope, Sensitivity: authorization.SensitivityPastoralConfidential}
			d, e := auth.Authorize(ctx, actor, req)
			if e != nil || d.Allowed {
				t.Fatalf("confidential bypass: %+v %v", d, e)
			}
			if _, err = db.ExecContext(ctx, "UPDATE scoped_grants SET sensitivity_class='PASTORAL_CONFIDENTIAL' WHERE id=$1", grant); err != nil {
				t.Fatal(err)
			}
			d, e = auth.Authorize(ctx, actor, req)
			if e != nil || !d.Allowed {
				t.Fatalf("explicit grant denied: %+v %v", d, e)
			}
		})
	}
}
func TestDelegation_RejectsScopeAndValidityExpansion(t *testing.T) {
	db, _, _ := setupAuthzDB(t)
	ctx := context.Background()
	var grant uuid.UUID
	if err := db.QueryRowContext(ctx, "SELECT id FROM scoped_grants WHERE assignment_id=$1 LIMIT 1", fixtures.AssignmentAdaChoirID).Scan(&grant); err != nil {
		t.Fatal(err)
	}
	other := uuid.New()
	if _, err := db.ExecContext(ctx, `INSERT INTO assignments(id,organization_id,branch_id,person_id,scope_level,scope_resource_id) VALUES($1,$2,$3,$4,'TEAM',$5)`, other, fixtures.OrgHeritageID, fixtures.BranchIkejaID, fixtures.PersonTundeID, fixtures.TeamIkejaChoirID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO delegations(parent_grant_id,delegated_to_assignment_id,valid_until) VALUES($1,$2,NOW()+INTERVAL '1 day')`, grant, other); err == nil {
		t.Fatal("cross-branch delegation accepted")
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO delegations(parent_grant_id,delegated_to_assignment_id,valid_from,valid_until) VALUES($1,$2,NOW()-INTERVAL '2 days',NOW()+INTERVAL '1 day')`, grant, fixtures.AssignmentAdaChoirID); err == nil {
		t.Fatal("delegation before source validity accepted")
	}
	if _, err := db.ExecContext(ctx, "UPDATE scoped_grants SET delegable=false WHERE id=$1", grant); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO delegations(parent_grant_id,delegated_to_assignment_id,valid_until) VALUES($1,$2,NOW()+INTERVAL '1 day')`, grant, fixtures.AssignmentAdaChoirID); err == nil {
		t.Fatal("nondelegable grant accepted")
	}
}
