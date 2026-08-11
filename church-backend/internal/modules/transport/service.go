package transport

import (
	"context"
	"errors"

	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Service struct {
	repo  *Repository
	souls contracts.SoulReader
}

func NewService(repo *Repository, souls contracts.SoulReader) *Service {
	return &Service{repo: repo, souls: souls}
}

func (s *Service) Create(ctx context.Context, input contracts.CreateTransportRequestDTO) (contracts.TransportRequestDTO, error) {
	if _, err := s.souls.GetSoul(ctx, input.SoulID); err != nil {
		return contracts.TransportRequestDTO{}, errors.New("invalid soul id")
	}
	return s.repo.Create(ctx, input)
}

func (s *Service) Update(ctx context.Context, id string, input contracts.UpdateTransportRequestDTO) (contracts.TransportRequestDTO, error) {
	if input.SoulID != nil && *input.SoulID != "" {
		if _, err := s.souls.GetSoul(ctx, *input.SoulID); err != nil {
			return contracts.TransportRequestDTO{}, errors.New("invalid soul id")
		}
	}
	return s.repo.Update(ctx, id, input)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) GetTransportRequest(ctx context.Context, id string) (contracts.TransportRequestDTO, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) ListTransportRequests(ctx context.Context) ([]contracts.TransportRequestDTO, error) {
	return s.repo.List(ctx)
}
