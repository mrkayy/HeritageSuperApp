package souls

import (
	"context"
	"errors"

	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateSoul(ctx context.Context, input contracts.CreateSoulDTO, addedByUserID string) (contracts.SoulDTO, error) {
	if input.FullName == "" {
		return contracts.SoulDTO{}, errors.New("full_name is required")
	}
	if input.Phone == "" {
		return contracts.SoulDTO{}, errors.New("phone is required")
	}
	return s.repo.CreateSoul(ctx, input, addedByUserID)
}

func (s *Service) GetSoul(ctx context.Context, id string) (contracts.SoulDTO, error) {
	if id == "" {
		return contracts.SoulDTO{}, errors.New("id is required")
	}
	return s.repo.GetSoulByID(ctx, id)
}

func (s *Service) ListSouls(ctx context.Context, filter contracts.SoulFilter) ([]contracts.SoulDTO, error) {
	return s.repo.ListSouls(ctx, filter)
}

func (s *Service) UpdateSoul(ctx context.Context, id string, input contracts.UpdateSoulDTO) (contracts.SoulDTO, error) {
	if id == "" {
		return contracts.SoulDTO{}, errors.New("id is required")
	}
	return s.repo.UpdateSoul(ctx, id, input)
}

func (s *Service) DeleteSoul(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("id is required")
	}
	return s.repo.DeleteSoul(ctx, id)
}

func (s *Service) AddSoulJournal(ctx context.Context, soulID string, userID *string, note string) (contracts.SoulJournalDTO, error) {
	if soulID == "" {
		return contracts.SoulJournalDTO{}, errors.New("soul_id is required")
	}
	if note == "" {
		return contracts.SoulJournalDTO{}, errors.New("note is required")
	}
	return s.repo.AddSoulJournal(ctx, soulID, userID, note)
}

func (s *Service) GetSoulJournals(ctx context.Context, soulID string) ([]contracts.SoulJournalDTO, error) {
	if soulID == "" {
		return nil, errors.New("soul_id is required")
	}
	return s.repo.GetSoulJournals(ctx, soulID)
}
