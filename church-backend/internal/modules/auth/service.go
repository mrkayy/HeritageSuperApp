package auth

import (
	"context"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid email or password")

type Service struct {
	repo      *Repository
	jwtSecret string
}

func NewService(repo *Repository, jwtSecret string) *Service {
	return &Service{repo: repo, jwtSecret: jwtSecret}
}

type LoginResult struct {
	Token string
	Email string
	Roles []string
}

// Login is the single entry point every feature's frontend calls to
// authenticate. Whatever module a user is heading to next (Giving,
// Membership, Events...), they all get here first.
func (s *Service) Login(ctx context.Context, email, password string) (LoginResult, error) {
	u, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	token, err := issueToken(s.jwtSecret, u.ID, u.Email, u.Roles)
	if err != nil {
		return LoginResult{}, err
	}

	return LoginResult{Token: token, Email: u.Email, Roles: u.Roles}, nil
}
