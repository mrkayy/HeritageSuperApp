package membership

import (
	"context"

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

func (s *Service) AddMember(ctx context.Context, name string, email string) (contracts.Member, error) {
	return s.repo.Add(ctx, name, email)
}

func (s *Service) DeleteMember(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
