package membership

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Service struct {
	repo             *Repository
	infoCenterReader contracts.InfoCenterReader
	infoCenterProf   contracts.InfoCenterProfiler
}

func NewService(repo *Repository, icr contracts.InfoCenterReader, icp contracts.InfoCenterProfiler) *Service {
	return &Service{repo: repo, infoCenterReader: icr, infoCenterProf: icp}
}

// GetMember satisfies contracts.MembershipReader, so main.go can hand
// *Service straight to any other module's constructor (e.g. Giving)
// without that module ever importing this package.
func (s *Service) GetMember(ctx context.Context, id string) (contracts.Member, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) ListMembers(ctx context.Context, teamID string) ([]contracts.Member, error) {
	return s.repo.List(ctx, teamID)
}

func (s *Service) AddMember(ctx context.Context, in AddMemberInput) (contracts.Member, error) {
	if in.FirstName == "" || in.Surname == "" {
		return contracts.Member{}, fmt.Errorf("first name and surname are required")
	}
	return s.repo.Add(ctx, in)
}

func (s *Service) DeleteMember(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) UpdateMember(ctx context.Context, id string, in AddMemberInput) (contracts.Member, error) {
	if in.FirstName == "" || in.Surname == "" {
		return contracts.Member{}, fmt.Errorf("first name and surname are required")
	}
	if in.Role == "" {
		in.Role = string(contracts.RoleMember)
	}
	// Validate role
	if !contracts.IsValidRole(in.Role) {
		return contracts.Member{}, fmt.Errorf("invalid role: %s", in.Role)
	}

	return s.repo.Update(ctx, id, in)
}

type ProfileMemberInput struct {
	FirstName    string
	Surname      string
	Name         string
	Email        string
	Role         string
	CurrentStage *string
	TeamID       *string
	SectorID     *string
	ChurchID     *string
	CreatedBy    *uuid.UUID
}

func (s *Service) ProfileMember(ctx context.Context, in ProfileMemberInput) (contracts.Member, error) {
	if (in.FirstName == "" && in.Name == "") || in.Email == "" {
		return contracts.Member{}, fmt.Errorf("name and email are required")
	}
	if in.Role == "" {
		in.Role = string(contracts.RoleMember)
	}
	// Validate role
	if !contracts.IsValidRole(in.Role) {
		return contracts.Member{}, fmt.Errorf("invalid role: %s", in.Role)
	}

	return s.repo.ProfileNewMember(ctx, in)
}

func (s *Service) ListMembersPaginated(ctx context.Context, page, limit int, search, stage, teamID string) ([]contracts.Member, int, error) {
	return s.repo.ListPaginated(ctx, page, limit, search, stage, teamID)
}

func (s *Service) GetStageCounts(ctx context.Context) (map[string]int, error) {
	return s.repo.GetStageCounts(ctx)
}

func (s *Service) AddGuardianRelationship(ctx context.Context, in GuardianRelationshipInput) error {
	return s.repo.AddGuardianRelationship(ctx, in)
}

func (s *Service) GetGuardianRelationships(ctx context.Context, memberID string) ([]GuardianRelationshipDTO, error) {
	return s.repo.GetGuardianRelationshipsForMember(ctx, memberID)
}

func (s *Service) DeleteGuardianRelationship(ctx context.Context, relID string) error {
	return s.repo.DeleteGuardianRelationship(ctx, relID)
}

func (s *Service) ListProfilingQueue(ctx context.Context, userID string) ([]contracts.TeamTodoDTO, error) {
	return s.repo.ListTeamTodos(ctx, userID, "membership", "pending")
}

func (s *Service) ProfileVisitor(ctx context.Context, visitorID string, userID string) (contracts.Member, error) {
	visitor, err := s.infoCenterReader.GetVisitor(ctx, visitorID)
	if err != nil {
		return contracts.Member{}, fmt.Errorf("visitor not found: %w", err)
	}

	stage := "foundation_class"
	email := ""
	if visitor.Email != nil {
		email = *visitor.Email
	}

	creatorUUID, err := uuid.Parse(userID)
	if err != nil {
		return contracts.Member{}, fmt.Errorf("invalid user id: %w", err)
	}

	phone := visitor.PhoneNumber
	addr := visitor.Address

	member, err := s.repo.Add(ctx, AddMemberInput{
		FirstName:    visitor.FirstName,
		Surname:      visitor.LastName,
		Role:         "member",
		Email:        &email,
		PhoneNumber:  &phone,
		HomeAddress:  &addr,
		Gender:       &visitor.Gender,
		CurrentStage: &stage,
		SourceTeam:   strPtr("info_center"),
		CreatedBy:    &creatorUUID,
	})
	if err != nil {
		return contracts.Member{}, fmt.Errorf("creating member: %w", err)
	}

	if err := s.infoCenterProf.MarkVisitorProfiled(ctx, visitorID, member.ID); err != nil {
		return contracts.Member{}, fmt.Errorf("marking visitor profiled: %w", err)
	}

	_ = s.repo.CompleteTeamTodo(ctx, visitorID, userID)

	return member, nil
}

func strPtr(s string) *string { return &s }
