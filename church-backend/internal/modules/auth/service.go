package auth

import (
	"context"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid email or password")
var ErrNotProfiled = errors.New("email is not registered in the members directory")

type Service struct {
	repo      *Repository
	jwtSecret string
}

func NewService(repo *Repository, jwtSecret string) *Service {
	return &Service{repo: repo, jwtSecret: jwtSecret}
}

type LoginResult struct {
	Token     string   `json:"token"`
	ID        string   `json:"user_id"`
	Email     string   `json:"email"`
	FirstName string   `json:"first_name"`
	LastName  string   `json:"last_name"`
	Roles     []string `json:"roles"`
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

	return LoginResult{
		Token:     token,
		ID:        u.ID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Roles:     u.Roles,
	}, nil
}

func (s *Service) LoginOrCreateOAuthUser(ctx context.Context, email string) (LoginResult, error) {
	u, err := s.repo.FindOrCreateByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, postgresErrNotProfiled) {
			return LoginResult{}, ErrNotProfiled
		}
		return LoginResult{}, err
	}

	token, err := issueToken(s.jwtSecret, u.ID, u.Email, u.Roles)
	if err != nil {
		return LoginResult{}, err
	}

	return LoginResult{
		Token:     token,
		ID:        u.ID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Roles:     u.Roles,
	}, nil
}

func (s *Service) CheckMemberExists(ctx context.Context, email string) (bool, error) {
	return s.repo.CheckMemberExists(ctx, email)
}

