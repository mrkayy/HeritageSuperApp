package auth

import (
	"context"
	"errors"

	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
)

type user struct {
	ID           string
	Email        string
	FirstName    string
	LastName     string
	PasswordHash string
	Roles        []string
}

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func mapEntUserToUser(eu *ent.User) user {
	return user{
		ID:           eu.ID.String(),
		Email:        eu.Email,
		FirstName:    eu.FirstName,
		LastName:     eu.LastName,
		PasswordHash: eu.PasswordHash,
		Roles:        []string{string(eu.Role)},
	}
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (user, error) {
	eu, err := r.db.User.Query().
		Where(entuser.Email(email)).
		Only(ctx)
	if err != nil {
		return user{}, err
	}
	return mapEntUserToUser(eu), nil
}

func (r *Repository) FindOrCreateByEmail(ctx context.Context, email string) (user, error) {
	eu, err := r.db.User.Query().
		Where(entuser.Email(email)).
		Only(ctx)
	if err == nil {
		return mapEntUserToUser(eu), nil
	}
	if !ent.IsNotFound(err) {
		return user{}, err
	}

	// Email not found in users. Check if they are profiled in members.
	m, err := r.db.Member.Query().
		Where(member.Email(email)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return user{}, postgresErrNotProfiled
		}
		return user{}, err
	}

	// Insert new user if they are profiled in members. Default role is 'member'.
	firstName := m.FirstName
	lastName := m.Surname
	isComplete := firstName != "" && lastName != ""

	newEu, err := r.db.User.Create().
		SetEmail(email).
		SetPasswordHash("oauth-managed-account").
		SetFirstName(firstName).
		SetLastName(lastName).
		SetRole(entuser.RoleMember).
		SetAccountStatus(entuser.AccountStatusActive).
		SetIsProfileComplete(isComplete).
		Save(ctx)
	if err != nil {
		return user{}, err
	}

	return mapEntUserToUser(newEu), nil
}

func (r *Repository) CheckMemberExists(ctx context.Context, email string) (bool, error) {
	return r.db.Member.Query().
		Where(member.Email(email)).
		Exist(ctx)
}

var postgresErrNotProfiled = errors.New("email is not registered in the members directory")
