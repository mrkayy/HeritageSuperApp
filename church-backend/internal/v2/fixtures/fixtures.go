package fixtures

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"

	"github.com/google/uuid"
)

// Well-known deterministic UUIDs for synthetic fixtures
var (
	OrgHeritageID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

	BranchLekkiID = uuid.MustParse("00000000-0000-0000-0001-000000000001")
	BranchIkejaID = uuid.MustParse("00000000-0000-0000-0001-000000000002")

	SectorLekkiPhase1ID = uuid.MustParse("00000000-0000-0000-0002-000000000001")
	SectorAllenID       = uuid.MustParse("00000000-0000-0000-0002-000000000002")

	TeamLekkiChoirID      = uuid.MustParse("00000000-0000-0000-0003-000000000001")
	TeamLekkiMembershipID = uuid.MustParse("00000000-0000-0000-0003-000000000002")
	TeamLekkiInfoCenterID = uuid.MustParse("00000000-0000-0000-0003-000000000003")
	TeamIkejaChoirID      = uuid.MustParse("00000000-0000-0000-0003-000000000004")
	TeamIkejaMembershipID = uuid.MustParse("00000000-0000-0000-0003-000000000005")

	RoleTemplateChoirLeadID        = uuid.MustParse("00000000-0000-0000-0004-000000000001")
	RoleTemplateMembershipCallerID = uuid.MustParse("00000000-0000-0000-0004-000000000002")
	RoleTemplateMembershipLeadID   = uuid.MustParse("00000000-0000-0000-0004-000000000003")
	RoleTemplateGOID               = uuid.MustParse("00000000-0000-0000-0004-000000000004")
	RoleTemplateSuperAdminID       = uuid.MustParse("00000000-0000-0000-0004-000000000005")

	CapTeamRosterView         = uuid.MustParse("00000000-0000-0000-0005-000000000001")
	CapTeamRosterManage       = uuid.MustParse("00000000-0000-0000-0005-000000000002")
	CapMembershipFollowupView = uuid.MustParse("00000000-0000-0000-0005-000000000003")
	CapMembershipFollowupPerf = uuid.MustParse("00000000-0000-0000-0005-000000000004")
	CapMembershipProfileAppr  = uuid.MustParse("00000000-0000-0000-0005-000000000005")
	CapPastoralSitRepView     = uuid.MustParse("00000000-0000-0000-0005-000000000006")
	CapMemberBaselineView     = uuid.MustParse("00000000-0000-0000-0005-000000000007")

	PersonAdaID    = uuid.MustParse("00000000-0000-0000-0010-000000000001")
	PersonEmekaID  = uuid.MustParse("00000000-0000-0000-0010-000000000002")
	PersonTundeID  = uuid.MustParse("00000000-0000-0000-0010-000000000003")
	PersonGOID     = uuid.MustParse("00000000-0000-0000-0010-000000000004")
	PersonJohnID   = uuid.MustParse("00000000-0000-0000-0010-000000000005")
	PersonVisitorK = uuid.MustParse("00000000-0000-0000-0010-000000000006")

	AccountAdaID       = uuid.MustParse("00000000-0000-0000-0011-000000000001")
	AccountGOID        = uuid.MustParse("00000000-0000-0000-0011-000000000004")
	AccountSuspendedID = uuid.MustParse("00000000-0000-0000-0011-000000000005")

	AssignmentAdaChoirID    = uuid.MustParse("00000000-0000-0000-0012-000000000001")
	AssignmentAdaFollowupID = uuid.MustParse("00000000-0000-0000-0012-000000000002")
	AssignmentTundeID       = uuid.MustParse("00000000-0000-0000-0012-000000000003")

	RawSessionTokenAda       = "v2_test_token_ada_active_12345"
	RawSessionTokenSuspended = "v2_test_token_suspended_99999"
)

func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// LoadSyntheticFixtures inserts deterministic synthetic test data for V2.
func LoadSyntheticFixtures(ctx context.Context, db *sql.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Organization
	_, err = tx.ExecContext(ctx, `
		INSERT INTO organizations (id, name, slug, status)
		VALUES ($1, 'Heritage of Faith Ministries International', 'heritage-of-faith', 'active')
		ON CONFLICT (id) DO NOTHING;
	`, OrgHeritageID)
	if err != nil {
		return fmt.Errorf("seed org: %w", err)
	}

	// 2. Branches
	_, err = tx.ExecContext(ctx, `
		INSERT INTO branches (id, organization_id, name, center, slug, timezone, status)
		VALUES 
			($1, $3, 'Lekki Branch', 'Lekki Peninsula', 'lekki', 'Africa/Lagos', 'active'),
			($2, $3, 'Ikeja Center', 'Ikeja Central', 'ikeja', 'Africa/Lagos', 'active')
		ON CONFLICT (id) DO NOTHING;
	`, BranchLekkiID, BranchIkejaID, OrgHeritageID)
	if err != nil {
		return fmt.Errorf("seed branches: %w", err)
	}

	// 3. Sectors
	_, err = tx.ExecContext(ctx, `
		INSERT INTO sectors (id, organization_id, branch_id, name, status)
		VALUES
			($1, $3, $4, 'Lekki Phase 1 Sector', 'active'),
			($2, $3, $5, 'Allen Precinct Sector', 'active')
		ON CONFLICT (id) DO NOTHING;
	`, SectorLekkiPhase1ID, SectorAllenID, OrgHeritageID, BranchLekkiID, BranchIkejaID)
	if err != nil {
		return fmt.Errorf("seed sectors: %w", err)
	}

	// 4. Teams
	_, err = tx.ExecContext(ctx, `
		INSERT INTO teams (id, organization_id, branch_id, name, status)
		VALUES
			($1, $6, $7, 'Choir', 'active'),
			($2, $6, $7, 'Membership Team', 'active'),
			($3, $6, $7, 'Information Center', 'active'),
			($4, $6, $8, 'Choir', 'active'),
			($5, $6, $8, 'Membership Team', 'active')
		ON CONFLICT (id) DO NOTHING;
	`, TeamLekkiChoirID, TeamLekkiMembershipID, TeamLekkiInfoCenterID,
		TeamIkejaChoirID, TeamIkejaMembershipID, OrgHeritageID, BranchLekkiID, BranchIkejaID)
	if err != nil {
		return fmt.Errorf("seed teams: %w", err)
	}

	// 5. Capabilities
	capabilities := []struct {
		ID       uuid.UUID
		Code     string
		Desc     string
		Category string
	}{
		{CapTeamRosterView, "team.roster.view", "View team member roster", "team"},
		{CapTeamRosterManage, "team.roster.manage", "Manage team member roster", "team"},
		{CapMembershipFollowupView, "membership.followup.view", "View assigned follow-ups", "membership"},
		{CapMembershipFollowupPerf, "membership.followup.perform", "Log outcome of follow-up call", "membership"},
		{CapMembershipProfileAppr, "membership.profile.approve", "Approve profile change proposals", "membership"},
		{CapPastoralSitRepView, "pastoral.sitrep.view", "View pastoral situation report", "pastoral"},
		{CapMemberBaselineView, "member.baseline.view", "Self-service member profile view", "member"},
	}

	for _, cap := range capabilities {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO capabilities (id, code, description, category)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO NOTHING;
		`, cap.ID, cap.Code, cap.Desc, cap.Category)
		if err != nil {
			return fmt.Errorf("seed capability %s: %w", cap.Code, err)
		}
	}

	// 6. Role Templates
	roleTemplates := []struct {
		ID   uuid.UUID
		Name string
		Desc string
	}{
		{RoleTemplateChoirLeadID, "Choir Team Lead", "Oversees choir roster and rehearsals"},
		{RoleTemplateMembershipCallerID, "Membership Caller", "Contacts assigned visitors"},
		{RoleTemplateMembershipLeadID, "Membership Team Lead", "Allocates follow-up queues and approves profiles"},
		{RoleTemplateGOID, "General Overseer", "Cross-branch executive oversight"},
		{RoleTemplateSuperAdminID, "Super Admin", "Technical platform administration"},
	}

	for _, rt := range roleTemplates {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO role_templates (id, organization_id, name, description, version)
			VALUES ($1, $2, $3, $4, 1)
			ON CONFLICT (id) DO NOTHING;
		`, rt.ID, OrgHeritageID, rt.Name, rt.Desc)
		if err != nil {
			return fmt.Errorf("seed role template %s: %w", rt.Name, err)
		}
	}

	// 7. Role-Capability Mappings
	roleCaps := []struct {
		RoleID uuid.UUID
		CapID  uuid.UUID
	}{
		{RoleTemplateChoirLeadID, CapTeamRosterView},
		{RoleTemplateChoirLeadID, CapTeamRosterManage},
		{RoleTemplateMembershipCallerID, CapMembershipFollowupView},
		{RoleTemplateMembershipCallerID, CapMembershipFollowupPerf},
		{RoleTemplateMembershipLeadID, CapMembershipFollowupView},
		{RoleTemplateMembershipLeadID, CapMembershipProfileAppr},
	}

	for _, rc := range roleCaps {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO role_capabilities (role_template_id, capability_id)
			VALUES ($1, $2)
			ON CONFLICT (role_template_id, capability_id) DO NOTHING;
		`, rc.RoleID, rc.CapID)
		if err != nil {
			return fmt.Errorf("seed role_capability: %w", err)
		}
	}

	// 8. People: Ada, Emeka (shared family phone), Tunde, GO, Suspended John, Visitor K
	people := []struct {
		ID        uuid.UUID
		FirstName string
		LastName  string
		Status    string
	}{
		{PersonAdaID, "Ada", "Okafor", "verified"},
		{PersonEmekaID, "Emeka", "Okafor", "provisional"},
		{PersonTundeID, "Tunde", "Bakare", "verified"},
		{PersonGOID, "David", "Adeleke", "verified"},
		{PersonJohnID, "John", "Doe", "inactive"},
		{PersonVisitorK, "Kemi", "Oluwole", "provisional"},
	}

	for _, p := range people {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO people (id, organization_id, first_name, last_name, identity_status)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (id) DO NOTHING;
		`, p.ID, OrgHeritageID, p.FirstName, p.LastName, p.Status)
		if err != nil {
			return fmt.Errorf("seed person %s: %w", p.FirstName, err)
		}
	}

	// 9. Contact Points (Ada and Emeka SHARE phone "+2348011112222")
	contactPoints := []struct {
		ID       uuid.UUID
		PersonID uuid.UUID
		Kind     string
		Raw      string
		Norm     string
		Primary  bool
		Shared   bool
	}{
		{uuid.MustParse("00000000-0000-0000-0013-000000000001"), PersonAdaID, "phone", "+2348011112222", "2348011112222", true, true},
		{uuid.MustParse("00000000-0000-0000-0013-000000000002"), PersonAdaID, "email", "ada@example.com", "ada@example.com", false, false},
		{uuid.MustParse("00000000-0000-0000-0013-000000000003"), PersonEmekaID, "phone", "+2348011112222", "2348011112222", true, true},
		{uuid.MustParse("00000000-0000-0000-0013-000000000004"), PersonTundeID, "email", "tunde@example.com", "tunde@example.com", true, false},
		{uuid.MustParse("00000000-0000-0000-0013-000000000005"), PersonGOID, "email", "go@heritage.org", "go@heritage.org", true, false},
	}

	for _, cp := range contactPoints {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO contact_points (id, organization_id, person_id, kind, raw_value, normalized_value, is_primary, is_shared, verified_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
			ON CONFLICT (id) DO NOTHING;
		`, cp.ID, OrgHeritageID, cp.PersonID, cp.Kind, cp.Raw, cp.Norm, cp.Primary, cp.Shared)
		if err != nil {
			return fmt.Errorf("seed contact point: %w", err)
		}
	}

	// 10. Church Affiliations
	affiliations := []struct {
		ID       uuid.UUID
		PersonID uuid.UUID
		BranchID uuid.UUID
		RelStat  string
		MembStat string
		Primary  bool
	}{
		{uuid.MustParse("00000000-0000-0000-0014-000000000001"), PersonAdaID, BranchLekkiID, "active", "member", true},
		{uuid.MustParse("00000000-0000-0000-0014-000000000002"), PersonEmekaID, BranchLekkiID, "active", "visitor", true},
		{uuid.MustParse("00000000-0000-0000-0014-000000000003"), PersonTundeID, BranchIkejaID, "active", "steward", true},
		{uuid.MustParse("00000000-0000-0000-0014-000000000004"), PersonGOID, BranchLekkiID, "active", "member", true},
		{uuid.MustParse("00000000-0000-0000-0014-000000000005"), PersonVisitorK, BranchLekkiID, "active", "visitor", true},
	}

	for _, aff := range affiliations {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO church_affiliations (id, organization_id, person_id, branch_id, relationship_status, membership_status, is_primary)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (id) DO NOTHING;
		`, aff.ID, OrgHeritageID, aff.PersonID, aff.BranchID, aff.RelStat, aff.MembStat, aff.Primary)
		if err != nil {
			return fmt.Errorf("seed affiliation: %w", err)
		}
	}

	// 11. Accounts
	accounts := []struct {
		ID       uuid.UUID
		PersonID uuid.UUID
		Status   string
	}{
		{AccountAdaID, PersonAdaID, "active"},
		{AccountGOID, PersonGOID, "active"},
		{AccountSuspendedID, PersonJohnID, "suspended"},
	}

	for _, acc := range accounts {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO accounts (id, organization_id, person_id, status)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO NOTHING;
		`, acc.ID, OrgHeritageID, acc.PersonID, acc.Status)
		if err != nil {
			return fmt.Errorf("seed account: %w", err)
		}
	}

	// 12. Sessions (Ada has active session, Suspended user has session)
	adaTokenHash := HashToken(RawSessionTokenAda)
	suspendedTokenHash := HashToken(RawSessionTokenSuspended)

	_, err = tx.ExecContext(ctx, `
		INSERT INTO sessions (id, account_id, session_token_hash, user_agent, ip_address, expires_at, created_at)
		VALUES 
			('00000000-0000-0000-0099-000000000001'::uuid, $1, $2, 'SyntheticTestBrowser/1.0', '127.0.0.1', NOW() + INTERVAL '7 days', NOW()),
			('00000000-0000-0000-0099-000000000002'::uuid, $3, $4, 'SyntheticTestBrowser/1.0', '127.0.0.1', NOW() + INTERVAL '7 days', NOW())
		ON CONFLICT (session_token_hash) DO NOTHING;
	`, AccountAdaID, adaTokenHash, AccountSuspendedID, suspendedTokenHash)
	if err != nil {
		return fmt.Errorf("seed sessions: %w", err)
	}

	// 13. Baseline Grants for Ada and GO
	_, err = tx.ExecContext(ctx, `
		INSERT INTO baseline_grants (id, organization_id, account_id, capability_id, scope_level)
		VALUES 
			('00000000-0000-0000-0099-000000000003'::uuid, $1, $2, $3, 'SELF'),
			('00000000-0000-0000-0099-000000000004'::uuid, $1, $4, $3, 'SELF')
		ON CONFLICT (account_id, capability_id) DO NOTHING;
	`, OrgHeritageID, AccountAdaID, CapMemberBaselineView, AccountGOID)
	if err != nil {
		return fmt.Errorf("seed baseline grants: %w", err)
	}

	// 14. Ada's Overlapping Assignments:
	// Assignment 1: Choir Lead (Branch: Lekki, Team: Lekki Choir, Scope: TEAM)
	// Assignment 2: Membership Caller (Branch: Lekki, Team: Lekki Membership, Scope: ASSIGNED, resource: PersonVisitorK)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO assignments (id, organization_id, branch_id, person_id, role_template_id, team_id, scope_level, scope_resource_id, valid_from)
		VALUES 
			($1, $3, $4, $5, $6, $7, 'TEAM', $7, NOW() - INTERVAL '1 day'),
			($2, $3, $4, $5, $8, $9, 'ASSIGNED', $10, NOW() - INTERVAL '1 day')
		ON CONFLICT (id) DO NOTHING;
	`, AssignmentAdaChoirID, AssignmentAdaFollowupID, OrgHeritageID, BranchLekkiID, PersonAdaID,
		RoleTemplateChoirLeadID, TeamLekkiChoirID, RoleTemplateMembershipCallerID, TeamLekkiMembershipID, PersonVisitorK)
	if err != nil {
		return fmt.Errorf("seed Ada assignments: %w", err)
	}

	// Scoped Grants for Assignment 1 (Choir Lead: team.roster.view, team.roster.manage with Scope TEAM)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO scoped_grants (id, assignment_id, capability_id, scope_level, scope_resource_id, sensitivity_class, valid_from, delegable)
		VALUES 
			('00000000-0000-0000-0099-000000000005'::uuid, $1, $2, 'TEAM', $4, 'GENERAL', NOW() - INTERVAL '1 day', TRUE),
			('00000000-0000-0000-0099-000000000006'::uuid, $1, $3, 'TEAM', $4, 'GENERAL', NOW() - INTERVAL '1 day', TRUE)
		ON CONFLICT DO NOTHING;
	`, AssignmentAdaChoirID, CapTeamRosterView, CapTeamRosterManage, TeamLekkiChoirID)
	if err != nil {
		return fmt.Errorf("seed Ada choir scoped grants: %w", err)
	}

	// Scoped Grants for Assignment 2 (Membership Caller: membership.followup.view, membership.followup.perform with Scope ASSIGNED to PersonVisitorK)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO scoped_grants (id, assignment_id, capability_id, scope_level, scope_resource_id, sensitivity_class, valid_from, delegable)
		VALUES 
			('00000000-0000-0000-0099-000000000007'::uuid, $1, $2, 'ASSIGNED', $4, 'GENERAL', NOW() - INTERVAL '1 day', TRUE),
			('00000000-0000-0000-0099-000000000008'::uuid, $1, $3, 'ASSIGNED', $4, 'GENERAL', NOW() - INTERVAL '1 day', TRUE)
		ON CONFLICT DO NOTHING;
	`, AssignmentAdaFollowupID, CapMembershipFollowupView, CapMembershipFollowupPerf, PersonVisitorK)
	if err != nil {
		return fmt.Errorf("seed Ada caller scoped grants: %w", err)
	}

	return tx.Commit()
}
