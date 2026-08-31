package admin

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ---------------------------------------------------------------------------
// Local Churches (Branches)
// ---------------------------------------------------------------------------

func (s *Service) ListChurches(ctx context.Context) ([]contracts.LocalChurchDTO, error) {
	return s.repo.ListChurches(ctx)
}

func (s *Service) CreateChurch(ctx context.Context, input contracts.CreateLocalChurchDTO, actorUser contracts.AuthedUser) (contracts.LocalChurchDTO, error) {
	if strings.TrimSpace(input.Name) == "" {
		return contracts.LocalChurchDTO{}, errors.New("church name is required")
	}
	if strings.TrimSpace(input.Slug) == "" {
		input.Slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(input.Name), " ", "-"))
	}
	if strings.TrimSpace(input.Center) == "" {
		input.Center = input.Name
	}

	dto, err := s.repo.CreateChurch(ctx, input)
	if err != nil {
		return contracts.LocalChurchDTO{}, err
	}

	// Audit Log
	uid := actorUser.ID
	_ = s.repo.CreateAuditLog(ctx, contracts.AuditLogDTO{
		ActorUserID:  &uid,
		ActorName:    actorUser.Email,
		ActorEmail:   actorUser.Email,
		ActorRole:    actorUser.CurrentRole,
		Action:       "provision_branch",
		ResourceType: "local_church",
		ResourceID:   dto.ID,
		Details:      fmt.Sprintf("Provisioned branch %s (%s)", dto.Name, dto.Slug),
	})

	return dto, nil
}

func (s *Service) UpdateChurch(ctx context.Context, idStr string, input contracts.UpdateLocalChurchDTO, actorUser contracts.AuthedUser) (contracts.LocalChurchDTO, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return contracts.LocalChurchDTO{}, errors.New("invalid church id")
	}

	dto, err := s.repo.UpdateChurch(ctx, id, input)
	if err != nil {
		return contracts.LocalChurchDTO{}, err
	}

	// Audit Log
	uid := actorUser.ID
	_ = s.repo.CreateAuditLog(ctx, contracts.AuditLogDTO{
		ActorUserID:  &uid,
		ActorName:    actorUser.Email,
		ActorEmail:   actorUser.Email,
		ActorRole:    actorUser.CurrentRole,
		Action:       "update_branch",
		ResourceType: "local_church",
		ResourceID:   dto.ID,
		Details:      fmt.Sprintf("Updated details for branch %s", dto.Name),
	})

	return dto, nil
}

func (s *Service) ReassignLeadership(ctx context.Context, idStr string, input contracts.ReassignLeadershipDTO, actorUser contracts.AuthedUser) error {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return errors.New("invalid church id")
	}

	err = s.repo.ReassignLeadership(ctx, id, input)
	if err != nil {
		return err
	}

	// Audit Log
	uid := actorUser.ID
	_ = s.repo.CreateAuditLog(ctx, contracts.AuditLogDTO{
		ActorUserID:  &uid,
		ActorName:    actorUser.Email,
		ActorEmail:   actorUser.Email,
		ActorRole:    actorUser.CurrentRole,
		Action:       "reassign_branch_leadership",
		ResourceType: "local_church",
		ResourceID:   idStr,
		Details:      "Reassigned resident pastor or church admin",
	})

	return nil
}

func (s *Service) ToggleChurchStatus(ctx context.Context, idStr string, actorUser contracts.AuthedUser) (bool, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return false, errors.New("invalid church id")
	}

	newStatus, err := s.repo.ToggleChurchStatus(ctx, id)
	if err != nil {
		return false, err
	}

	// Audit Log
	uid := actorUser.ID
	action := "archive_branch"
	if newStatus {
		action = "restore_branch"
	}

	_ = s.repo.CreateAuditLog(ctx, contracts.AuditLogDTO{
		ActorUserID:  &uid,
		ActorName:    actorUser.Email,
		ActorEmail:   actorUser.Email,
		ActorRole:    actorUser.CurrentRole,
		Action:       action,
		ResourceType: "local_church",
		ResourceID:   idStr,
		Details:      fmt.Sprintf("Toggled branch active state to %v", newStatus),
	})

	return newStatus, nil
}

// ---------------------------------------------------------------------------
// Leadership Invitations
// ---------------------------------------------------------------------------

func (s *Service) ListLeadershipInvites(ctx context.Context) ([]contracts.LeadershipInviteDTO, error) {
	return s.repo.ListLeadershipInvites(ctx)
}

func (s *Service) CreateLeadershipInvite(ctx context.Context, input contracts.CreateLeadershipInviteDTO, actorUser contracts.AuthedUser) (contracts.LeadershipInviteDTO, error) {
	if strings.TrimSpace(input.Email) == "" {
		return contracts.LeadershipInviteDTO{}, errors.New("email is required")
	}
	if strings.TrimSpace(input.Role) == "" {
		return contracts.LeadershipInviteDTO{}, errors.New("role is required")
	}

	// Generate a secure 6-digit or 32-char token
	bytes := make([]byte, 16)
	_, _ = rand.Read(bytes)
	otpCode := hex.EncodeToString(bytes)

	creatorUUID, _ := uuid.Parse(actorUser.ID)
	dto, err := s.repo.CreateLeadershipInvite(ctx, input, otpCode, creatorUUID)
	if err != nil {
		return contracts.LeadershipInviteDTO{}, err
	}

	// Audit Log
	uid := actorUser.ID
	_ = s.repo.CreateAuditLog(ctx, contracts.AuditLogDTO{
		ActorUserID:  &uid,
		ActorName:    actorUser.Email,
		ActorEmail:   actorUser.Email,
		ActorRole:    actorUser.CurrentRole,
		Action:       "invite_leader",
		ResourceType: "leadership_invite",
		ResourceID:   dto.ID,
		Details:      fmt.Sprintf("Dispatched leadership magic link to %s for role %s", input.Email, input.Role),
	})

	return dto, nil
}

func (s *Service) RevokeLeadershipInvite(ctx context.Context, idStr string, actorUser contracts.AuthedUser) error {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return errors.New("invalid invite id")
	}

	err = s.repo.RevokeInvite(ctx, id)
	if err != nil {
		return err
	}

	uid := actorUser.ID
	_ = s.repo.CreateAuditLog(ctx, contracts.AuditLogDTO{
		ActorUserID:  &uid,
		ActorName:    actorUser.Email,
		ActorEmail:   actorUser.Email,
		ActorRole:    actorUser.CurrentRole,
		Action:       "revoke_leadership_invite",
		ResourceType: "leadership_invite",
		ResourceID:   idStr,
		Details:      "Revoked pending leadership invitation",
	})

	return nil
}

// ---------------------------------------------------------------------------
// Universal Member Dossier
// ---------------------------------------------------------------------------

func (s *Service) SearchUniversalMembers(ctx context.Context, query string) ([]contracts.UniversalMemberSearchResultDTO, error) {
	if strings.TrimSpace(query) == "" {
		return []contracts.UniversalMemberSearchResultDTO{}, nil
	}
	return s.repo.SearchUniversalMembers(ctx, strings.TrimSpace(query))
}

func (s *Service) GetMember360Dossier(ctx context.Context, memberIDStr string) (contracts.Member360DossierDTO, error) {
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		return contracts.Member360DossierDTO{}, errors.New("invalid member id")
	}
	return s.repo.GetMember360Dossier(ctx, memberID)
}

// ---------------------------------------------------------------------------
// Executive Analytics
// ---------------------------------------------------------------------------

func (s *Service) GetExecutiveAnalytics(ctx context.Context, actorUser contracts.AuthedUser) (contracts.ExecutiveSummaryDTO, error) {
	return s.repo.GetExecutiveSummary(ctx, nil)
}

// ---------------------------------------------------------------------------
// Security Audit Logs
// ---------------------------------------------------------------------------

func (s *Service) ListAuditLogs(ctx context.Context, limit int) ([]contracts.AuditLogDTO, error) {
	return s.repo.ListAuditLogs(ctx, limit)
}
