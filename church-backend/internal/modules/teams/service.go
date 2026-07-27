package teams

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

// GetTeam/ListTeams satisfy contracts.TeamReader; GetSector/ListSectors
// satisfy contracts.SectorReader.
func (s *Service) GetTeam(ctx context.Context, id string) (contracts.Team, error) {
	return s.repo.GetTeam(ctx, id)
}

func (s *Service) ListTeams(ctx context.Context) ([]contracts.Team, error) {
	return s.repo.ListTeams(ctx)
}

func (s *Service) CreateTeam(ctx context.Context, name string) (contracts.Team, error) {
	return s.repo.CreateTeam(ctx, name)
}

func (s *Service) GetSector(ctx context.Context, id string) (contracts.Sector, error) {
	return s.repo.GetSector(ctx, id)
}

func (s *Service) ListSectors(ctx context.Context) ([]contracts.Sector, error) {
	return s.repo.ListSectors(ctx)
}

func (s *Service) CreateSector(ctx context.Context, name string) (contracts.Sector, error) {
	return s.repo.CreateSector(ctx, name)
}
