package membership

import (
	"context"

	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Get(ctx context.Context, id string) (contracts.Member, error) {
	var m contracts.Member
	err := r.db.QueryRow(ctx,
		`SELECT id, name, email FROM members WHERE id = $1`, id,
	).Scan(&m.ID, &m.Name, &m.Email)
	return m, err
}

func (r *Repository) List(ctx context.Context) ([]contracts.Member, error) {
	rows, err := r.db.Query(ctx, `SELECT id, name, email FROM members ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []contracts.Member
	for rows.Next() {
		var m contracts.Member
		if err := rows.Scan(&m.ID, &m.Name, &m.Email); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}
