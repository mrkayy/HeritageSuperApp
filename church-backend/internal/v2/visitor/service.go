package visitor

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/platform/uid"
)

var (
	ErrInvalidCapture   = errors.New("visitor capture is invalid")
	ErrClaimUnavailable = errors.New("claim invitation is unavailable")
	ErrClaimConsumed    = errors.New("claim invitation has already been consumed")
)

type Authorizer interface {
	Authorize(context.Context, *identity.AuthContext, authorizationRequest) (*authorizationDecision, error)
}

// These small local contracts keep visitor capture independent of the authorization package's concrete implementation.
type authorizationRequest struct {
	TargetOrganizationID, TargetBranchID uuid.UUID
	Capability                           string
}
type authorizationDecision struct{ Allowed bool }

type CaptureRequest struct {
	OrganizationID, BranchID, ServiceOccurrenceID                                uuid.UUID
	FirstName, LastName, ContactKind, ContactValue, MissingContactReason, Source string
	InviterPersonID                                                              *uuid.UUID
	RestrictedPrayerNote                                                         map[string]any
}
type CaptureResult struct {
	PersonID, CaptureID, WorkItemID uuid.UUID
	Version                         int
}

type Service struct {
	db    *sql.DB
	clock clock.Clock
	ids   uid.Generator
}

func NewService(db *sql.DB, c clock.Clock, generators ...uid.Generator) *Service {
	if c == nil {
		c = clock.NewRealClock()
	}
	g := uid.NewGenerator()
	if len(generators) > 0 && generators[0] != nil {
		g = generators[0]
	}
	return &Service{db: db, clock: c, ids: g}
}

func (s *Service) Capture(ctx context.Context, actor *identity.AuthContext, req CaptureRequest) (CaptureResult, error) {
	if actor == nil || actor.OrganizationID != req.OrganizationID || req.BranchID == uuid.Nil || req.ServiceOccurrenceID == uuid.Nil || strings.TrimSpace(req.FirstName) == "" || strings.TrimSpace(req.Source) == "" {
		return CaptureResult{}, ErrInvalidCapture
	}
	if req.ContactValue == "" && strings.TrimSpace(req.MissingContactReason) == "" {
		return CaptureResult{}, ErrInvalidCapture
	}
	if req.ContactValue != "" && req.ContactKind != "email" && req.ContactKind != "phone" {
		return CaptureResult{}, ErrInvalidCapture
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return CaptureResult{}, err
	}
	defer tx.Rollback()
	var open bool
	if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM service_occurrences WHERE id=$1 AND organization_id=$2 AND branch_id=$3 AND status IN ('open','scheduled'))`, req.ServiceOccurrenceID, req.OrganizationID, req.BranchID).Scan(&open); err != nil {
		return CaptureResult{}, err
	}
	if !open {
		return CaptureResult{}, ErrInvalidCapture
	}
	personID := s.ids.New()
	if _, err = tx.ExecContext(ctx, `INSERT INTO people(id,organization_id,first_name,last_name,identity_status) VALUES($1,$2,$3,$4,'provisional')`, personID, req.OrganizationID, strings.TrimSpace(req.FirstName), strings.TrimSpace(req.LastName)); err != nil {
		return CaptureResult{}, err
	}
	if req.ContactValue != "" {
		normalized := strings.ToLower(strings.TrimSpace(req.ContactValue))
		if _, err = tx.ExecContext(ctx, `INSERT INTO contact_points(id,organization_id,person_id,kind,raw_value,normalized_value,is_primary,is_shared) VALUES($1,$2,$3,$4,$5,$6,true,false)`, s.ids.New(), req.OrganizationID, personID, req.ContactKind, req.ContactValue, normalized); err != nil {
			return CaptureResult{}, err
		}
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO church_affiliations(id,organization_id,person_id,branch_id,relationship_status,membership_status,is_primary) VALUES($1,$2,$3,$4,'active','visitor',true)`, s.ids.New(), req.OrganizationID, personID, req.BranchID); err != nil {
		return CaptureResult{}, err
	}
	note, _ := json.Marshal(req.RestrictedPrayerNote)
	captureID := s.ids.New()
	if _, err = tx.ExecContext(ctx, `INSERT INTO visitor_captures(id,organization_id,branch_id,person_id,service_occurrence_id,source,inviter_person_id,missing_contact_reason,restricted_prayer_note,captured_by_person_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, captureID, req.OrganizationID, req.BranchID, personID, req.ServiceOccurrenceID, req.Source, req.InviterPersonID, req.MissingContactReason, note, actor.PersonID); err != nil {
		return CaptureResult{}, err
	}
	var workID uuid.UUID
	if err = tx.QueryRowContext(ctx, `SELECT id FROM follow_up_work_items WHERE visitor_capture_id=$1`, captureID).Scan(&workID); err != nil {
		return CaptureResult{}, err
	}
	payload, _ := json.Marshal(map[string]any{"person_id": personID.String(), "capture_id": captureID.String(), "work_item_id": workID.String()})
	if _, err = tx.ExecContext(ctx, `INSERT INTO audit_events(id,organization_id,branch_id,actor_person_id,action,resource_type,resource_id,sensitivity,payload_diff) VALUES($1,$2,$3,$4,'visitor.captured','visitor_capture',$5,'GENERAL',$6)`, s.ids.New(), req.OrganizationID, req.BranchID, actor.PersonID, captureID, payload); err != nil {
		return CaptureResult{}, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO outbox_events(id,organization_id,branch_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,'visitor.captured','person',$4,$5)`, s.ids.New(), req.OrganizationID, req.BranchID, personID, payload); err != nil {
		return CaptureResult{}, err
	}
	if err = tx.Commit(); err != nil {
		return CaptureResult{}, err
	}
	return CaptureResult{PersonID: personID, CaptureID: captureID, WorkItemID: workID, Version: 1}, nil
}

type ClaimInvitationRequest struct {
	OrganizationID, PersonID, IssuedByAssignmentID, IssuedByPersonID uuid.UUID
	AuthMethodKind, Destination                                      string
	TTL                                                              time.Duration
}
type ClaimInvitationResult struct {
	InvitationID   uuid.UUID
	RawToken       string
	ExpiresAt      time.Time
	DeliveryQueued bool
}

func (s *Service) IssueClaimInvitation(ctx context.Context, req ClaimInvitationRequest) (ClaimInvitationResult, error) {
	if req.OrganizationID == uuid.Nil || req.PersonID == uuid.Nil || req.IssuedByAssignmentID == uuid.Nil || req.IssuedByPersonID == uuid.Nil || req.Destination == "" || (req.AuthMethodKind != "email" && req.AuthMethodKind != "phone" && req.AuthMethodKind != "provider") {
		return ClaimInvitationResult{}, ErrInvalidCapture
	}
	if req.TTL <= 0 {
		req.TTL = 24 * time.Hour
	}
	token, hash, err := newToken()
	if err != nil {
		return ClaimInvitationResult{}, err
	}
	now := s.clock.Now()
	expiry := now.Add(req.TTL)
	destination := hashString(strings.ToLower(strings.TrimSpace(req.Destination)))
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ClaimInvitationResult{}, err
	}
	defer tx.Rollback()
	var verified bool
	var authorized bool
	if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM assignments WHERE id=$1 AND organization_id=$2 AND person_id=$3 AND revoked_at IS NULL AND valid_from <= $4 AND (valid_until IS NULL OR valid_until > $4))`, req.IssuedByAssignmentID, req.OrganizationID, req.IssuedByPersonID, now).Scan(&authorized); err != nil {
		return ClaimInvitationResult{}, err
	}
	if !authorized {
		return ClaimInvitationResult{}, ErrInvalidCapture
	}
	if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM profile_verifications WHERE organization_id=$1 AND person_id=$2)`, req.OrganizationID, req.PersonID).Scan(&verified); err != nil {
		return ClaimInvitationResult{}, err
	}
	if !verified {
		return ClaimInvitationResult{}, ErrInvalidCapture
	}
	if _, err = tx.ExecContext(ctx, `UPDATE claim_invitations SET status='revoked',revoked_at=$3,version=version+1 WHERE organization_id=$1 AND person_id=$2 AND status='pending'`, req.OrganizationID, req.PersonID, now); err != nil {
		return ClaimInvitationResult{}, err
	}
	id := s.ids.New()
	if _, err = tx.ExecContext(ctx, `INSERT INTO claim_invitations(id,organization_id,person_id,issued_by_assignment_id,auth_method_kind,destination_hash,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, req.OrganizationID, req.PersonID, req.IssuedByAssignmentID, req.AuthMethodKind, destination, hash, expiry); err != nil {
		return ClaimInvitationResult{}, err
	}
	payload, _ := json.Marshal(map[string]string{"invitation_id": id.String(), "purpose": "claim_account"})
	if _, err = tx.ExecContext(ctx, `INSERT INTO outbox_events(id,organization_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,'claim.invitation.requested','claim_invitation',$3,$4)`, s.ids.New(), req.OrganizationID, id, payload); err != nil {
		return ClaimInvitationResult{}, err
	}
	if err = tx.Commit(); err != nil {
		return ClaimInvitationResult{}, err
	}
	return ClaimInvitationResult{InvitationID: id, RawToken: token, ExpiresAt: expiry, DeliveryQueued: true}, nil
}

type ClaimCompletionRequest struct {
	OrganizationID                             uuid.UUID
	RawToken                                   string
	AuthMethodKind, Identifier, CredentialHash string
}
type ClaimCompletionResult struct{ AccountID, PersonID uuid.UUID }

func (s *Service) CompleteClaim(ctx context.Context, req ClaimCompletionRequest) (ClaimCompletionResult, error) {
	if req.OrganizationID == uuid.Nil || req.RawToken == "" || req.Identifier == "" || req.CredentialHash == "" {
		return ClaimCompletionResult{}, ErrClaimUnavailable
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ClaimCompletionResult{}, err
	}
	defer tx.Rollback()
	now := s.clock.Now()
	var id, person uuid.UUID
	var expires time.Time
	var status string
	err = tx.QueryRowContext(ctx, `SELECT id,person_id,expires_at,status FROM claim_invitations WHERE organization_id=$1 AND token_hash=$2 FOR UPDATE`, req.OrganizationID, hashString(req.RawToken)).Scan(&id, &person, &expires, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return ClaimCompletionResult{}, ErrClaimUnavailable
	}
	if err != nil {
		return ClaimCompletionResult{}, err
	}
	if status != "pending" {
		return ClaimCompletionResult{}, ErrClaimConsumed
	}
	if !now.Before(expires) {
		return ClaimCompletionResult{}, ErrClaimUnavailable
	}
	var verified bool
	if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM profile_verifications WHERE organization_id=$1 AND person_id=$2)`, req.OrganizationID, person).Scan(&verified); err != nil {
		return ClaimCompletionResult{}, err
	}
	if !verified {
		return ClaimCompletionResult{}, ErrClaimUnavailable
	}
	accountID := s.ids.New()
	if _, err = tx.ExecContext(ctx, `INSERT INTO accounts(id,organization_id,person_id,status) VALUES($1,$2,$3,'active')`, accountID, req.OrganizationID, person); err != nil {
		return ClaimCompletionResult{}, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO auth_methods(id,account_id,kind,identifier,credential_hash,verified_at) VALUES($1,$2,$3,$4,$5,$6)`, s.ids.New(), accountID, req.AuthMethodKind, hashString(strings.ToLower(strings.TrimSpace(req.Identifier))), req.CredentialHash, now); err != nil {
		return ClaimCompletionResult{}, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO baseline_grants(id,organization_id,account_id,capability_id,scope_level) SELECT $1,$2,$3,id,'SELF' FROM capabilities WHERE code='member.baseline.view'`, s.ids.New(), req.OrganizationID, accountID); err != nil {
		return ClaimCompletionResult{}, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE claim_invitations SET status='consumed',consumed_at=$2,version=version+1 WHERE id=$1`, id, now); err != nil {
		return ClaimCompletionResult{}, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO audit_events(id,organization_id,actor_person_id,action,resource_type,resource_id) VALUES($1,$2,$3,'account.claimed','account',$4)`, s.ids.New(), req.OrganizationID, person, accountID); err != nil {
		return ClaimCompletionResult{}, err
	}
	if err = tx.Commit(); err != nil {
		return ClaimCompletionResult{}, err
	}
	return ClaimCompletionResult{AccountID: accountID, PersonID: person}, nil
}

func newToken() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	raw := hex.EncodeToString(b)
	return raw, hashString(raw), nil
}
func hashString(value string) string {
	h := sha256.Sum256([]byte(value))
	return hex.EncodeToString(h[:])
}
