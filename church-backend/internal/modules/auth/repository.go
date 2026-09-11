package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/otpinvites"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
	"golang.org/x/crypto/bcrypt"
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

func (r *Repository) FindMemberStageByEmail(ctx context.Context, email string) string {
	m, err := r.db.Member.Query().
		Where(member.EmailEqualFold(email)).
		Select(member.FieldCurrentStage).
		Only(ctx)
	if err != nil || m == nil {
		return ""
	}
	return string(m.CurrentStage)
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

func (r *Repository) CompleteMagicLinkOnboarding(ctx context.Context, code, email, firstName, lastName, pinHash string) (user, error) {
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
		if invite.TeamID != nil {
			upM.SetTeamID(*invite.TeamID)
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
		if invite.TeamID != nil {
			cpM.SetTeamID(*invite.TeamID)
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
			SetPasswordHash("magic-link-activated").
			SetPinHash(pinHash).
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
		if invite.TeamID != nil {
			up.SetTeamID(*invite.TeamID)
		}

		eu, err = up.Save(ctx)
		if err != nil {
			return user{}, err
		}
		eu, err = r.db.User.Query().Where(entuser.ID(eu.ID)).WithTeam().Only(ctx)
		if err != nil {
			return user{}, err
		}
	} else {
		cp := r.db.User.Create().
			SetEmail(email).
			SetPasswordHash("magic-link-activated").
			SetPinHash(pinHash).
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
		if invite.TeamID != nil {
			cp.SetTeamID(*invite.TeamID)
		}

		eu, err = cp.Save(ctx)
		if err != nil {
			return user{}, err
		}
		eu, err = r.db.User.Query().Where(entuser.ID(eu.ID)).WithTeam().Only(ctx)
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

func (r *Repository) GetMemberFirstName(ctx context.Context, email string) (string, error) {
	m, err := r.db.Member.Query().
		Where(member.EmailEqualFold(email)).
		Select(member.FieldFirstName).
		Only(ctx)
	if err != nil || m == nil {
		return "", err
	}
	return m.FirstName, nil
}

func (r *Repository) CreateLoginMagicLink(ctx context.Context, email string) (string, error) {
	exists, err := r.db.Member.Query().Where(member.EmailEqualFold(email)).Exist(ctx)
	if err != nil || !exists {
		return "", errors.New("email is not registered in the members directory")
	}

	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	code := hex.EncodeToString(raw)

	_, err = r.db.OtpInvites.Create().
		SetEmail(strings.ToLower(strings.TrimSpace(email))).
		SetOtpCode(code).
		SetRole(otpinvites.RoleMember).
		SetExpiresAt(time.Now().Add(24 * time.Hour)).
		Save(ctx)
	if err != nil {
		return "", err
	}
	return code, nil
}

func (r *Repository) VerifyPin(ctx context.Context, email, pin string) (user, error) {
	eu, err := r.db.User.Query().
		Where(entuser.EmailEqualFold(email)).
		WithTeam().
		Only(ctx)
	if err != nil {
		return user{}, ErrInvalidCredentials
	}

	if eu.PinHash == nil {
		return user{}, errors.New("no PIN set for this account")
	}

	if eu.PinLockedUntil != nil && time.Now().Before(*eu.PinLockedUntil) {
		return user{}, ErrPinLocked
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*eu.PinHash), []byte(pin)); err != nil {
		newCount := eu.FailedPinAttempts + 1
		up := r.db.User.UpdateOneID(eu.ID).SetFailedPinAttempts(newCount)
		if newCount >= 5 {
			lockUntil := time.Now().Add(15 * time.Minute)
			up.SetPinLockedUntil(lockUntil)
		}
		_ = up.Exec(ctx)
		return user{}, ErrInvalidPin
	}

	_ = r.db.User.UpdateOneID(eu.ID).
		SetFailedPinAttempts(0).
		ClearPinLockedUntil().
		Exec(ctx)

	return mapEntUserToUser(eu), nil
}

var postgresErrNotProfiled = errors.New("email is not registered in the members directory")
