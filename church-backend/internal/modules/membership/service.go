package membership

import (
	"context"
	"fmt"

	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GetMember satisfies contracts.MembershipReader, so main.go can hand
// *Service straight to any other module's constructor (e.g. Giving)
// without that module ever importing this package.
func (s *Service) GetMember(ctx context.Context, id string) (contracts.Member, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) ListMembers(ctx context.Context) ([]contracts.Member, error) {
	return s.repo.List(ctx)
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
	return s.repo.Update(ctx, id, in)
}

type ProfileMemberInput struct {
	Name     string
	Email    string
	Role     string
	TeamID   *string
	SectorID *string
	ChurchID *string
}

func (s *Service) ProfileMember(ctx context.Context, in ProfileMemberInput) (contracts.Member, error) {
	if in.Name == "" || in.Email == "" {
		return contracts.Member{}, fmt.Errorf("name and email are required")
	}

	// Validate role
	if !contracts.IsValidRole(in.Role) {
		return contracts.Member{}, fmt.Errorf("invalid role: %s", in.Role)
	}

	return s.repo.Profile(ctx, in.Name, in.Email, in.Role, in.TeamID, in.SectorID, in.ChurchID)
}
