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

// --- Team CRUD ---

func (s *Service) GetTeam(ctx context.Context, id string) (contracts.Team, error) {
	return s.repo.GetTeam(ctx, id)
}

func (s *Service) ListTeams(ctx context.Context) ([]contracts.Team, error) {
	return s.repo.ListTeams(ctx)
}

func (s *Service) CreateTeam(ctx context.Context, name string) (contracts.Team, error) {
	return s.repo.CreateTeam(ctx, name)
}

func (s *Service) CreateTeamFull(ctx context.Context, name string, description *string, churchID, sectorID *string) (contracts.Team, error) {
	return s.repo.CreateTeamFull(ctx, name, description, churchID, sectorID)
}

func (s *Service) UpdateTeam(ctx context.Context, id, name string, description *string, churchID, sectorID *string) (contracts.Team, error) {
	return s.repo.UpdateTeam(ctx, id, name, description, churchID, sectorID)
}

func (s *Service) DeleteTeam(ctx context.Context, id string) error {
	return s.repo.DeleteTeam(ctx, id)
}

// --- Sector CRUD ---

func (s *Service) GetSector(ctx context.Context, id string) (contracts.Sector, error) {
	return s.repo.GetSector(ctx, id)
}

func (s *Service) ListSectors(ctx context.Context) ([]contracts.Sector, error) {
	return s.repo.ListSectors(ctx)
}

func (s *Service) CreateSector(ctx context.Context, name string) (contracts.Sector, error) {
	return s.repo.CreateSector(ctx, name)
}

func (s *Service) CreateSectorFull(ctx context.Context, name string, description *string, churchID *string) (contracts.Sector, error) {
	return s.repo.CreateSectorFull(ctx, name, description, churchID)
}

func (s *Service) UpdateSector(ctx context.Context, id, name string, description *string, churchID *string) (contracts.Sector, error) {
	return s.repo.UpdateSector(ctx, id, name, description, churchID)
}

func (s *Service) DeleteSector(ctx context.Context, id string) error {
	return s.repo.DeleteSector(ctx, id)
}

// --- LocalChurch CRUD ---

func (s *Service) ListChurches(ctx context.Context) ([]contracts.LocalChurch, error) {
	return s.repo.ListChurches(ctx)
}

func (s *Service) GetChurch(ctx context.Context, id string) (contracts.LocalChurch, error) {
	return s.repo.GetChurch(ctx, id)
}

func (s *Service) CreateChurch(ctx context.Context, name, center, description, slug string) (contracts.LocalChurch, error) {
	return s.repo.CreateChurch(ctx, name, center, description, slug)
}

func (s *Service) UpdateChurch(ctx context.Context, id, name, center, description, slug string) (contracts.LocalChurch, error) {
	return s.repo.UpdateChurch(ctx, id, name, center, description, slug)
}

func (s *Service) DeleteChurch(ctx context.Context, id string) error {
	return s.repo.DeleteChurch(ctx, id)
}
