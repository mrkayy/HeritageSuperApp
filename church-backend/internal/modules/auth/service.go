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
	Token       string   `json:"token"`
	ID          string   `json:"user_id"`
	Email       string   `json:"email"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Roles       []string `json:"roles"`
	CurrentRole string   `json:"currentRole"`
	TeamID      string   `json:"teamId"`
	TeamName    string   `json:"teamName"`
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

	token, err := issueToken(s.jwtSecret, u.ID, u.Email, u.Roles, u.TeamID, u.TeamName)
	if err != nil {
		return LoginResult{}, err
	}

	currentRole := ""
	if len(u.Roles) > 0 {
		currentRole = u.Roles[0]
	}

	return LoginResult{
		Token:       token,
		ID:          u.ID,
		Email:       u.Email,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		Roles:       u.Roles,
		CurrentRole: currentRole,
		TeamID:      u.TeamID,
		TeamName:    u.TeamName,
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

	token, err := issueToken(s.jwtSecret, u.ID, u.Email, u.Roles, u.TeamID, u.TeamName)
	if err != nil {
		return LoginResult{}, err
	}

	currentRole := ""
	if len(u.Roles) > 0 {
		currentRole = u.Roles[0]
	}

	return LoginResult{
		Token:       token,
		ID:          u.ID,
		Email:       u.Email,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		Roles:       u.Roles,
		CurrentRole: currentRole,
		TeamID:      u.TeamID,
		TeamName:    u.TeamName,
	}, nil
}

func (s *Service) CheckMemberExists(ctx context.Context, email string) (bool, error) {
	return s.repo.CheckMemberExists(ctx, email)
}

type VerifyMagicLinkResult struct {
	Email     string `json:"email"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Valid     bool   `json:"valid"`
}

func (s *Service) VerifyMagicLink(ctx context.Context, code, email string) (VerifyMagicLinkResult, error) {
	invite, err := s.repo.VerifyMagicLink(ctx, code, email)
	if err != nil {
		return VerifyMagicLinkResult{Valid: false}, err
	}

	firstName := invite.FirstName
	lastName := invite.LastName

	return VerifyMagicLinkResult{
		Email:     email,
		Role:      string(invite.Role),
		FirstName: firstName,
		LastName:  lastName,
		Valid:     true,
	}, nil
}

func (s *Service) CompleteMagicLinkOnboarding(ctx context.Context, code, email, firstName, lastName, password string) (LoginResult, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return LoginResult{}, err
	}

	u, err := s.repo.CompleteMagicLinkOnboarding(ctx, code, email, firstName, lastName, string(hashedPassword))
	if err != nil {
		return LoginResult{}, err
	}

	token, err := issueToken(s.jwtSecret, u.ID, u.Email, u.Roles, u.TeamID, u.TeamName)
	if err != nil {
		return LoginResult{}, err
	}

	currentRole := ""
	if len(u.Roles) > 0 {
		currentRole = u.Roles[0]
	}

	return LoginResult{
		Token:       token,
		ID:          u.ID,
		Email:       u.Email,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		Roles:       u.Roles,
		CurrentRole: currentRole,
		TeamID:      u.TeamID,
		TeamName:    u.TeamName,
	}, nil
}

