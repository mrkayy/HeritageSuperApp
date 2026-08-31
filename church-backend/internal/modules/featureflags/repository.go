package featureflags

import (
	"context"
	"fmt"
	"time"

	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/featureflag"
)

type Repository struct {
	client *ent.Client
}

func NewRepository(client *ent.Client) *Repository {
	return &Repository{client: client}
}

func (r *Repository) List(ctx context.Context) ([]*ent.FeatureFlag, error) {
	return r.client.FeatureFlag.Query().
		Order(ent.Asc(featureflag.FieldCategory), ent.Asc(featureflag.FieldName)).
		All(ctx)
}

func (r *Repository) GetByKey(ctx context.Context, key string) (*ent.FeatureFlag, error) {
	return r.client.FeatureFlag.Query().
		Where(featureflag.KeyEQ(key)).
		Only(ctx)
}

func (r *Repository) Update(ctx context.Context, key string, isEnabled bool, updatedBy string) (*ent.FeatureFlag, error) {
	flag, err := r.GetByKey(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("feature flag %s not found: %w", key, err)
	}

	return flag.Update().
		SetIsEnabled(isEnabled).
		SetUpdatedBy(updatedBy).
		SetUpdatedAt(time.Now()).
		Save(ctx)
}

func (r *Repository) Upsert(ctx context.Context, key, name, description, category string, isEnabled bool, allowedRoles []string, updatedBy string) (*ent.FeatureFlag, error) {
	exists, err := r.client.FeatureFlag.Query().Where(featureflag.KeyEQ(key)).Exist(ctx)
	if err != nil {
		return nil, err
	}

	if exists {
		flag, err := r.GetByKey(ctx, key)
		if err != nil {
			return nil, err
		}
		u := flag.Update().
			SetName(name).
			SetCategory(category).
			SetIsEnabled(isEnabled).
			SetAllowedRoles(allowedRoles).
			SetUpdatedBy(updatedBy).
			SetUpdatedAt(time.Now())
		if description != "" {
			u.SetDescription(description)
		}
		return u.Save(ctx)
	}

	c := r.client.FeatureFlag.Create().
		SetKey(key).
		SetName(name).
		SetCategory(category).
		SetIsEnabled(isEnabled).
		SetAllowedRoles(allowedRoles)
	if description != "" {
		c.SetDescription(description)
	}
	if updatedBy != "" {
		c.SetUpdatedBy(updatedBy)
	}
	return c.Save(ctx)
}
