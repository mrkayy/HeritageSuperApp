package featureflags

import (
	"context"
	"sync"
	"time"

	"github.com/hofchurchng/church-backend/internal/ent"
)

type FlagDTO struct {
	ID           string    `json:"id"`
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	Description  string    `json:"description,omitempty"`
	Category     string    `json:"category"`
	IsEnabled    bool      `json:"isEnabled"`
	AllowedRoles []string  `json:"allowedRoles,omitempty"`
	UpdatedBy    string    `json:"updatedBy,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func toDTO(f *ent.FeatureFlag) FlagDTO {
	desc := ""
	if f.Description != nil {
		desc = *f.Description
	}
	updatedBy := ""
	if f.UpdatedBy != nil {
		updatedBy = *f.UpdatedBy
	}

	return FlagDTO{
		ID:           f.ID.String(),
		Key:          f.Key,
		Name:         f.Name,
		Description:  desc,
		Category:     f.Category,
		IsEnabled:    f.IsEnabled,
		AllowedRoles: f.AllowedRoles,
		UpdatedBy:    updatedBy,
		UpdatedAt:    f.UpdatedAt,
	}
}

type Service struct {
	repo *Repository

	// In-memory cache for fast middleware evaluation
	mu         sync.RWMutex
	cache      map[string]*ent.FeatureFlag
	lastCached time.Time
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo:  repo,
		cache: make(map[string]*ent.FeatureFlag),
	}
}

func (s *Service) refreshCache(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	flags, err := s.repo.List(ctx)
	if err != nil {
		return err
	}

	newCache := make(map[string]*ent.FeatureFlag)
	for _, f := range flags {
		newCache[f.Key] = f
	}

	s.cache = newCache
	s.lastCached = time.Now()
	return nil
}

func (s *Service) ListAll(ctx context.Context) ([]FlagDTO, error) {
	flags, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}

	dtos := make([]FlagDTO, len(flags))
	for i, f := range flags {
		dtos[i] = toDTO(f)
	}
	return dtos, nil
}

func (s *Service) IsFeatureEnabled(ctx context.Context, key string, userRoles []string) bool {
	s.mu.RLock()
	stale := time.Since(s.lastCached) > 30*time.Second
	flag, exists := s.cache[key]
	s.mu.RUnlock()

	if stale || !exists {
		_ = s.refreshCache(ctx)
		s.mu.RLock()
		flag, exists = s.cache[key]
		s.mu.RUnlock()
	}

	if !exists {
		// Default to enabled if flag is not configured in database
		return true
	}

	if !flag.IsEnabled {
		return false
	}

	// If allowed_roles is specified and not empty, check if user has any of the required roles
	if len(flag.AllowedRoles) > 0 {
		for _, requiredRole := range flag.AllowedRoles {
			for _, userRole := range userRoles {
				if requiredRole == userRole {
					return true
				}
			}
		}
		return false
	}

	return true
}

func (s *Service) ToggleFlag(ctx context.Context, key string, isEnabled bool, updatedBy string) (FlagDTO, error) {
	flag, err := s.repo.Update(ctx, key, isEnabled, updatedBy)
	if err != nil {
		return FlagDTO{}, err
	}

	_ = s.refreshCache(ctx)
	return toDTO(flag), nil
}

func (s *Service) UpsertFlag(ctx context.Context, key, name, description, category string, isEnabled bool, allowedRoles []string, updatedBy string) (FlagDTO, error) {
	flag, err := s.repo.Upsert(ctx, key, name, description, category, isEnabled, allowedRoles, updatedBy)
	if err != nil {
		return FlagDTO{}, err
	}

	_ = s.refreshCache(ctx)
	return toDTO(flag), nil
}
