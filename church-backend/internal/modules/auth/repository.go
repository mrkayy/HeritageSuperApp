package auth

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type user struct {
	ID           string
	Email        string
	PasswordHash string
	Roles        []string
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (user, error) {
	var u user
	err := r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, roles FROM auth_users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Roles)
	return u, err
}
