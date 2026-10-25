package authorization

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
)

type ScopeLevel string

const (
	ScopeSelf         ScopeLevel = "SELF"
	ScopeAssigned     ScopeLevel = "ASSIGNED"
	ScopeTeam         ScopeLevel = "TEAM"
	ScopeSector       ScopeLevel = "SECTOR"
	ScopeChurch       ScopeLevel = "CHURCH"
	ScopeOrganization ScopeLevel = "ORGANIZATION"
	ScopePlatform     ScopeLevel = "PLATFORM"
)

type SensitivityClass string

const (
	SensitivityGeneral              SensitivityClass = "GENERAL"
	SensitivityMinistryInternal     SensitivityClass = "MINISTRY_INTERNAL"
	SensitivityPastoralConfidential SensitivityClass = "PASTORAL_CONFIDENTIAL"
	SensitivityChildSafeguarding    SensitivityClass = "CHILD_SAFEGUARDING"
	SensitivityExecutiveRestricted  SensitivityClass = "EXECUTIVE_RESTRICTED"
	SensitivitySecurityRestricted   SensitivityClass = "SECURITY_RESTRICTED"
)

type AuthzRequest struct {
	TargetOrganizationID uuid.UUID
	Capability           string
	TargetScope          ScopeLevel
	TargetBranchID       *uuid.UUID
	TargetResourceID     *uuid.UUID
	Sensitivity          SensitivityClass
}

type AuthzDecision struct {
	Allowed        bool
	Reason         string
	AssignmentID   *uuid.UUID
	GrantID        *uuid.UUID
	ScopeEvaluated ScopeLevel
}

type Authorizer interface {
	Authorize(ctx context.Context, authCtx *identity.AuthContext, req AuthzRequest) (*AuthzDecision, error)
}

type Service struct {
	db    *sql.DB
	clock clock.Clock
}

func NewAuthorizer(db *sql.DB, clk clock.Clock) *Service {
	if clk == nil {
		clk = clock.NewRealClock()
	}
	return &Service{
		db:    db,
		clock: clk,
	}
}

// Authorize accepts server-resolved scope identifiers, never client-supplied claims.
// Foundation ASSIGNED resources are people; future resource modules must resolve their
// persisted organization and containing scope before using this service.
func (s *Service) Authorize(ctx context.Context, actor *identity.AuthContext, req AuthzRequest) (*AuthzDecision, error) {
	deny := &AuthzDecision{Reason: "no active grant within the requested scope and sensitivity"}
	if actor == nil || actor.OrganizationID == uuid.Nil || req.TargetOrganizationID != actor.OrganizationID {
		return deny, nil
	}
	if req.Sensitivity == "" {
		req.Sensitivity = SensitivityGeneral
	}
	now := s.clock.Now()
	var active bool
	err := s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM accounts WHERE id=$1 AND person_id=$2 AND organization_id=$3 AND status='active')`, actor.AccountID, actor.PersonID, actor.OrganizationID).Scan(&active)
	if err != nil {
		return nil, err
	}
	if !active {
		return deny, nil
	}
	// Validate actual resource membership; a guessed ID with forged branch metadata fails closed.
	valid, err := s.validTarget(ctx, req)
	if err != nil {
		return nil, err
	}
	if !valid {
		return deny, nil
	}
	if req.TargetScope == ScopeSelf && req.TargetResourceID != nil && *req.TargetResourceID == actor.PersonID && req.Sensitivity == SensitivityGeneral {
		err = s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM baseline_grants b JOIN capabilities c ON c.id=b.capability_id WHERE b.account_id=$1 AND b.organization_id=$2 AND b.scope_level='SELF' AND c.code=$3)`, actor.AccountID, actor.OrganizationID, req.Capability).Scan(&active)
		if err != nil {
			return nil, err
		}
		if active {
			return &AuthzDecision{Allowed: true, Reason: "personal baseline grant", ScopeEvaluated: ScopeSelf}, nil
		}
	}
	// Both direct and delegated access are bounded by the originating assignment.
	rows, err := s.db.QueryContext(ctx, `
 SELECT g.id,a.id,g.scope_level,g.scope_resource_id,a.branch_id,a.team_id,a.sector_id,a.person_id
 FROM scoped_grants g JOIN assignments a ON a.id=g.assignment_id JOIN capabilities c ON c.id=g.capability_id
 WHERE a.organization_id=$1 AND c.code=$2 AND g.sensitivity_class=$3
 AND a.revoked_at IS NULL AND a.valid_from <= $4 AND (a.valid_until IS NULL OR a.valid_until > $4)
 AND g.revoked_at IS NULL AND g.valid_from <= $4 AND (g.valid_until IS NULL OR g.valid_until > $4)
 AND g.scope_level=a.scope_level AND g.scope_resource_id IS NOT DISTINCT FROM a.scope_resource_id
 AND (a.person_id=$5 OR (g.delegable AND EXISTS (
 SELECT 1 FROM delegations d JOIN assignments recipient ON recipient.id=d.delegated_to_assignment_id
 WHERE d.parent_grant_id=g.id AND recipient.person_id=$5 AND recipient.organization_id=a.organization_id
 AND d.revoked_at IS NULL AND d.valid_from <= $4 AND d.valid_until > $4
 AND recipient.revoked_at IS NULL AND recipient.valid_from <= $4 AND (recipient.valid_until IS NULL OR recipient.valid_until > $4)
 AND recipient.scope_level=a.scope_level AND recipient.scope_resource_id IS NOT DISTINCT FROM a.scope_resource_id
 AND recipient.branch_id IS NOT DISTINCT FROM a.branch_id
 )))`, actor.OrganizationID, req.Capability, req.Sensitivity, now, actor.PersonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var grant, assignment, owner uuid.UUID
		var level ScopeLevel
		var resource, branch, team, sector *uuid.UUID
		if err = rows.Scan(&grant, &assignment, &level, &resource, &branch, &team, &sector, &owner); err != nil {
			return nil, err
		}
		if scopeMatches(level, resource, branch, team, sector, owner, req) {
			return &AuthzDecision{Allowed: true, Reason: "active scoped grant", AssignmentID: &assignment, GrantID: &grant, ScopeEvaluated: level}, nil
		}
	}
	return deny, rows.Err()
}

func same(a, b *uuid.UUID) bool { return a != nil && b != nil && *a == *b }
func scopeMatches(level ScopeLevel, resource, branch, team, sector *uuid.UUID, owner uuid.UUID, req AuthzRequest) bool {
	if branch != nil && req.TargetBranchID != nil && !same(branch, req.TargetBranchID) {
		return false
	}
	switch level {
	case ScopeOrganization:
		return req.TargetScope != ScopePlatform
	case ScopeChurch:
		return same(branch, req.TargetBranchID)
	case ScopeTeam:
		return req.TargetScope == ScopeTeam && (same(resource, req.TargetResourceID) || (resource == nil && same(team, req.TargetResourceID)))
	case ScopeSector:
		return req.TargetScope == ScopeSector && (same(resource, req.TargetResourceID) || (resource == nil && same(sector, req.TargetResourceID)))
	case ScopeAssigned:
		return req.TargetScope == ScopeAssigned && same(resource, req.TargetResourceID)
	case ScopeSelf:
		return req.TargetScope == ScopeSelf && req.TargetResourceID != nil && *req.TargetResourceID == owner
	// PLATFORM never implies cross-organization or confidential access.
	case ScopePlatform:
		return req.TargetScope == ScopePlatform
	}
	return false
}

func (s *Service) validTarget(ctx context.Context, req AuthzRequest) (bool, error) {
	var query string
	switch req.TargetScope {
	case ScopeOrganization, ScopePlatform:
		query = "SELECT EXISTS(SELECT 1 FROM organizations WHERE id=$1)"
		var exists bool
		err := s.db.QueryRowContext(ctx, query, req.TargetOrganizationID).Scan(&exists)
		return exists, err
	case ScopeTeam:
		query = "SELECT EXISTS(SELECT 1 FROM teams WHERE organization_id=$1 AND id=$2 AND ($3::uuid IS NULL OR branch_id=$3))"
	case ScopeSector:
		query = "SELECT EXISTS(SELECT 1 FROM sectors WHERE organization_id=$1 AND id=$2 AND ($3::uuid IS NULL OR branch_id=$3))"
	case ScopeChurch:
		query = "SELECT EXISTS(SELECT 1 FROM branches WHERE organization_id=$1 AND id=$2)"
		var exists bool
		err := s.db.QueryRowContext(ctx, query, req.TargetOrganizationID, req.TargetBranchID).Scan(&exists)
		return exists, err
	case ScopeAssigned, ScopeSelf:
		query = "SELECT EXISTS(SELECT 1 FROM people p WHERE p.organization_id=$1 AND p.id=$2 AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM church_affiliations f WHERE f.person_id=p.id AND f.organization_id=p.organization_id AND f.branch_id=$3 AND f.relationship_status='active')))"
	default:
		return false, nil
	}
	var exists bool
	err := s.db.QueryRowContext(ctx, query, req.TargetOrganizationID, req.TargetResourceID, req.TargetBranchID).Scan(&exists)
	return exists, err
}
