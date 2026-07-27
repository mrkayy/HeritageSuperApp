package membership

import (
	"context"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/member"
)

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Get(ctx context.Context, id string) (contracts.Member, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.Member{}, err
	}

	m, err := r.db.Member.Get(ctx, uid)
	if err != nil {
		return contracts.Member{}, err
	}

	return contracts.Member{
		ID:    m.ID.String(),
		Name:  m.Name,
		Email: m.Email,
	}, nil
}

func (r *Repository) List(ctx context.Context) ([]contracts.Member, error) {
	members, err := r.db.Member.Query().
		Order(ent.Asc(member.FieldName)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.Member, 0, len(members))
	for _, m := range members {
		out = append(out, contracts.Member{
			ID:    m.ID.String(),
			Name:  m.Name,
			Email: m.Email,
		})
	}
	return out, nil
}
