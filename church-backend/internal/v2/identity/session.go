package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/platform/uid"
)

var (
	ErrSessionNotFound = errors.New("session not found")
	ErrSessionExpired  = errors.New("session expired")
	ErrSessionRevoked  = errors.New("session revoked")
	ErrAccountInactive = errors.New("account inactive or suspended")
)

type AssignmentContext struct {
	AssignmentID    uuid.UUID  `json:"assignment_id"`
	BranchID        *uuid.UUID `json:"branch_id,omitempty"`
	RoleName        string     `json:"role_name"`
	TeamID          *uuid.UUID `json:"team_id,omitempty"`
	SectorID        *uuid.UUID `json:"sector_id,omitempty"`
	ScopeLevel      string     `json:"scope_level"`
	ScopeResourceID *uuid.UUID `json:"scope_resource_id,omitempty"`
	ValidFrom       time.Time  `json:"valid_from"`
	ValidUntil      *time.Time `json:"valid_until,omitempty"`
}

type AuthContext struct {
	SessionID         uuid.UUID           `json:"session_id"`
	AccountID         uuid.UUID           `json:"account_id"`
	PersonID          uuid.UUID           `json:"person_id"`
	OrganizationID    uuid.UUID           `json:"organization_id"`
	IdentityStatus    string              `json:"identity_status"`
	FirstName         string              `json:"first_name"`
	LastName          string              `json:"last_name"`
	BaselineGrants    []string            `json:"baseline_grants"`
	ActiveAssignments []AssignmentContext `json:"active_assignments"`
}

type Service struct {
	db    *sql.DB
	clock clock.Clock
	ids   uid.Generator
}

func NewService(db *sql.DB, clk clock.Clock, generators ...uid.Generator) *Service {
	if clk == nil {
		clk = clock.NewRealClock()
	}
	ids := uid.NewGenerator()
	if len(generators) > 0 && generators[0] != nil {
		ids = generators[0]
	}
	return &Service{
		ids:   ids,
		db:    db,
		clock: clk,
	}
}

func GenerateSessionToken() (string, string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	rawToken := hex.EncodeToString(bytes)
	hash := HashToken(rawToken)
	return rawToken, hash, nil
}

func HashToken(rawToken string) string {
	h := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(h[:])
}

func (s *Service) CreateSession(ctx context.Context, accountID uuid.UUID, userAgent, ipAddress string, ttl time.Duration) (string, uuid.UUID, error) {
	if ttl <= 0 {
		return "", uuid.Nil, errors.New("session TTL must be positive")
	}
	rawToken, tokenHash, err := GenerateSessionToken()
	if err != nil {
		return "", uuid.Nil, err
	}

	sessionID := s.ids.New()
	now := s.clock.Now()
	expiresAt := now.Add(ttl)

	query := `
		INSERT INTO sessions (id, account_id, session_token_hash, user_agent, ip_address, expires_at, created_at, last_active_at)
		SELECT $1, $2, $3, $4, $5, $6, $7, $7 FROM accounts WHERE id=$2 AND status='active'
	`
	result, err := s.db.ExecContext(ctx, query, sessionID, accountID, tokenHash, userAgent, ipAddress, expiresAt, now)
	if err != nil {
		return "", uuid.Nil, fmt.Errorf("failed to create session: %w", err)
	}

	if count, _ := result.RowsAffected(); count != 1 {
		return "", uuid.Nil, ErrAccountInactive
	}
	return rawToken, sessionID, nil
}

func (s *Service) ResolveSession(ctx context.Context, rawToken string) (*AuthContext, error) {
	if rawToken == "" {
		return nil, ErrSessionNotFound
	}

	tokenHash := HashToken(rawToken)
	now := s.clock.Now()

	query := `
		SELECT 
			s.id, s.account_id, s.expires_at, s.revoked_at,
			a.organization_id, a.person_id, a.status,
			p.identity_status, p.first_name, p.last_name
		FROM sessions s
		JOIN accounts a ON s.account_id = a.id
		JOIN people p ON a.person_id = p.id AND a.organization_id=p.organization_id
		WHERE s.session_token_hash = $1
	`

	var (
		sessionID, accountID, orgID, personID uuid.UUID
		expiresAt                             time.Time
		revokedAt                             sql.NullTime
		accountStatus, identityStatus         string
		firstName, lastName                   string
	)

	err := s.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&sessionID, &accountID, &expiresAt, &revokedAt,
		&orgID, &personID, &accountStatus,
		&identityStatus, &firstName, &lastName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query session: %w", err)
	}

	if revokedAt.Valid {
		return nil, ErrSessionRevoked
	}
	if !now.Before(expiresAt) {
		return nil, ErrSessionExpired
	}
	if accountStatus != "active" {
		return nil, ErrAccountInactive
	}

	// 1. Fetch Baseline Grants
	baselineQuery := `
		SELECT c.code
		FROM baseline_grants bg
		JOIN capabilities c ON bg.capability_id = c.id
		WHERE bg.account_id = $1 AND bg.organization_id=$2
	`
	rows, err := s.db.QueryContext(ctx, baselineQuery, accountID, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query baseline grants: %w", err)
	}
	defer rows.Close()

	baselineGrants := []string{}
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		baselineGrants = append(baselineGrants, code)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	// 2. Fetch Active Assignments
	assignQuery := `
		SELECT 
			asn.id, asn.branch_id, COALESCE(rt.name,''), asn.team_id, asn.sector_id,
			asn.scope_level, asn.scope_resource_id, asn.valid_from, asn.valid_until
		FROM assignments asn
		LEFT JOIN role_templates rt ON asn.role_template_id = rt.id AND rt.organization_id=asn.organization_id
		WHERE asn.person_id = $1 AND asn.organization_id=$3
		  AND asn.revoked_at IS NULL
		  AND asn.valid_from <= $2
		  AND (asn.valid_until IS NULL OR asn.valid_until > $2)
 AND (EXISTS(SELECT 1 FROM scoped_grants g WHERE g.assignment_id=asn.id AND g.revoked_at IS NULL AND g.valid_from <= $2 AND (g.valid_until IS NULL OR g.valid_until > $2))
 OR EXISTS(SELECT 1 FROM delegations d JOIN scoped_grants g ON g.id=d.parent_grant_id JOIN assignments source ON source.id=g.assignment_id
 WHERE d.delegated_to_assignment_id=asn.id AND d.revoked_at IS NULL AND d.valid_from <= $2 AND d.valid_until > $2
 AND g.delegable AND g.revoked_at IS NULL AND g.valid_from <= $2 AND (g.valid_until IS NULL OR g.valid_until > $2)
 AND source.organization_id=asn.organization_id AND source.revoked_at IS NULL AND source.valid_from <= $2 AND (source.valid_until IS NULL OR source.valid_until > $2)
 AND source.scope_level=asn.scope_level AND source.scope_resource_id IS NOT DISTINCT FROM asn.scope_resource_id AND source.branch_id IS NOT DISTINCT FROM asn.branch_id))
 ORDER BY asn.id
	`
	assignRows, err := s.db.QueryContext(ctx, assignQuery, personID, now, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query assignments: %w", err)
	}
	defer assignRows.Close()

	activeAssignments := []AssignmentContext{}
	for assignRows.Next() {
		var (
			asCtx                                       AssignmentContext
			branchID, teamID, sectorID, scopeResourceID *uuid.UUID
			validUntil                                  *time.Time
		)

		err := assignRows.Scan(
			&asCtx.AssignmentID, &branchID, &asCtx.RoleName, &teamID, &sectorID,
			&asCtx.ScopeLevel, &scopeResourceID, &asCtx.ValidFrom, &validUntil,
		)
		if err != nil {
			return nil, err
		}
		{
			asCtx.BranchID = branchID
			asCtx.TeamID = teamID
			asCtx.SectorID = sectorID
			asCtx.ScopeResourceID = scopeResourceID
			asCtx.ValidUntil = validUntil
			activeAssignments = append(activeAssignments, asCtx)
		}
	}

	if err := assignRows.Err(); err != nil {
		return nil, err
	}

	return &AuthContext{
		SessionID:         sessionID,
		AccountID:         accountID,
		PersonID:          personID,
		OrganizationID:    orgID,
		IdentityStatus:    identityStatus,
		FirstName:         firstName,
		LastName:          lastName,
		BaselineGrants:    baselineGrants,
		ActiveAssignments: activeAssignments,
	}, nil
}

func (s *Service) RevokeSession(ctx context.Context, sessionID uuid.UUID) error {
	now := s.clock.Now()
	query := "UPDATE sessions SET revoked_at = $1 WHERE id = $2"
	_, err := s.db.ExecContext(ctx, query, now, sessionID)
	return err
}

func (s *Service) RevokeAllAccountSessions(ctx context.Context, accountID uuid.UUID) error {
	now := s.clock.Now()
	query := "UPDATE sessions SET revoked_at = $1 WHERE account_id = $2 AND revoked_at IS NULL"
	_, err := s.db.ExecContext(ctx, query, now, accountID)
	return err
}
