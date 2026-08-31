package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/otpinvites"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
)

type user struct {
	ID           string
	Email        string
	FirstName    string
	LastName     string
	PasswordHash string
	Roles        []string
	TeamID       string
	TeamName     string
}

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func mapEntUserToUser(eu *ent.User) user {
	u := user{
		ID:           eu.ID.String(),
		Email:        eu.Email,
		FirstName:    eu.FirstName,
		LastName:     eu.LastName,
		PasswordHash: eu.PasswordHash,
		Roles:        []string{string(eu.Role)},
	}
	if eu.Edges.Team != nil {
		u.TeamID = eu.Edges.Team.ID.String()
		u.TeamName = eu.Edges.Team.Name
	} else if eu.TeamID != nil {
		u.TeamID = eu.TeamID.String()
	}
	return u
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (user, error) {
	eu, err := r.db.User.Query().
		Where(entuser.Email(email)).
		WithTeam().
		Only(ctx)
	if err != nil {
		return user{}, err
	}
	return mapEntUserToUser(eu), nil
}

func (r *Repository) FindOrCreateByEmail(ctx context.Context, email string) (user, error) {
	eu, err := r.db.User.Query().
		Where(entuser.Email(email)).
		WithTeam().
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

func (r *Repository) VerifyMagicLink(ctx context.Context, code, email string) (*ent.OtpInvites, error) {
	code = strings.TrimSpace(code)
	email = strings.TrimSpace(email)

	// Search by OTP code first since code is a unique token
	invite, err := r.db.OtpInvites.Query().
		Where(otpinvites.OtpCode(code)).
		Only(ctx)

	if err != nil {
		// Fallback: search by case-insensitive email
		invite, err = r.db.OtpInvites.Query().
			Where(otpinvites.EmailEqualFold(email)).
			Only(ctx)
		if err != nil {
			return nil, errors.New("invalid magic link code or email")
		}
	}

	if invite.Used {
		return nil, errors.New("this magic link has already been redeemed")
	}
	if time.Now().After(invite.ExpiresAt) {
		return nil, errors.New("this magic link has expired")
	}
	return invite, nil
}

func (r *Repository) CompleteMagicLinkOnboarding(ctx context.Context, code, email, firstName, lastName, passwordHash string) (user, error) {
	invite, err := r.VerifyMagicLink(ctx, code, email)
	if err != nil {
		return user{}, err
	}

	roleStr := string(invite.Role)
	if roleStr == "" {
		roleStr = string(entuser.RoleMember)
	}

	if firstName == "" {
		firstName = invite.FirstName
	}
	if lastName == "" {
		lastName = invite.LastName
	}

	// 1. Sync Member record in members table
	m, err := r.db.Member.Query().
		Where(member.EmailEqualFold(email)).
		Only(ctx)

	if err == nil {
		upM := r.db.Member.UpdateOneID(m.ID).
			SetFirstName(firstName).
			SetSurname(lastName)

		if invite.ChurchID != nil {
			upM.SetLocalChurchID(*invite.ChurchID)
		}
		if invite.SectorID != nil {
			upM.SetSectorID(*invite.SectorID)
		}
		m, _ = upM.Save(ctx)
	} else {
		cpM := r.db.Member.Create().
			SetEmail(email).
			SetFirstName(firstName).
			SetSurname(lastName).
			SetCurrentStage(member.CurrentStageStewardship)

		if invite.ChurchID != nil {
			cpM.SetLocalChurchID(*invite.ChurchID)
		}
		if invite.SectorID != nil {
			cpM.SetSectorID(*invite.SectorID)
		}
		m, _ = cpM.Save(ctx)
	}

	// 2. Sync User record in users table
	eu, err := r.db.User.Query().
		Where(entuser.EmailEqualFold(email)).
		WithTeam().
		Only(ctx)

	if err == nil {
		up := r.db.User.UpdateOneID(eu.ID).
			SetPasswordHash(passwordHash).
			SetRole(entuser.Role(roleStr)).
			SetRoles([]string{roleStr}).
			SetAccountStatus(entuser.AccountStatusActive).
			SetIsProfileComplete(true)

		if firstName != "" {
			up.SetFirstName(firstName)
		}
		if lastName != "" {
			up.SetLastName(lastName)
		}
		if invite.ChurchID != nil {
			up.SetChurchID(*invite.ChurchID)
		}
		if invite.SectorID != nil {
			up.SetSectorID(*invite.SectorID)
		}

		eu, err = up.Save(ctx)
		if err != nil {
			return user{}, err
		}
	} else {
		cp := r.db.User.Create().
			SetEmail(email).
			SetPasswordHash(passwordHash).
			SetFirstName(firstName).
			SetLastName(lastName).
			SetRole(entuser.Role(roleStr)).
			SetRoles([]string{roleStr}).
			SetAccountStatus(entuser.AccountStatusActive).
			SetIsProfileComplete(true)

		if invite.ChurchID != nil {
			cp.SetChurchID(*invite.ChurchID)
		}
		if invite.SectorID != nil {
			cp.SetSectorID(*invite.SectorID)
		}

		eu, err = cp.Save(ctx)
		if err != nil {
			return user{}, err
		}
	}

	_ = r.db.OtpInvites.UpdateOneID(invite.ID).
		SetUsed(true).
		SetUsedByUserID(eu.ID).
		Exec(ctx)

	return mapEntUserToUser(eu), nil
}

var postgresErrNotProfiled = errors.New("email is not registered in the members directory")
