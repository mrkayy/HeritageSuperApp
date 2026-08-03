package profile

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/jackc/pgx/v5"
)

type profileRow struct {
	UserID          string
	FirstName       string
	LastName        string
	ProfileImageURL string
	DateOfBirth     *time.Time
	Address         string
	Email           string
	PhoneNumber     string
	TeamID          *string
	SectorID        *string
}

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func getString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func (r *Repository) GetByUserID(ctx context.Context, userID string) (profileRow, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return profileRow{}, err
	}

	u, err := r.db.User.Get(ctx, uid)
	if err != nil {
		if ent.IsNotFound(err) {
			return profileRow{}, pgx.ErrNoRows
		}
		return profileRow{}, err
	}

	var teamID *string
	if u.TeamID != nil {
		t := u.TeamID.String()
		teamID = &t
	}

	var sectorID *string
	if u.SectorID != nil {
		s := u.SectorID.String()
		sectorID = &s
	}

	return profileRow{
		UserID:          u.ID.String(),
		FirstName:       u.FirstName,
		LastName:        u.LastName,
		ProfileImageURL: getString(u.ProfileImageURL),
		DateOfBirth:     u.DateOfBirth,
		Address:         getString(u.Address),
		Email:           u.Email,
		PhoneNumber:     getString(u.PhoneNumber),
		TeamID:          teamID,
		SectorID:        sectorID,
	}, nil
}

func (r *Repository) Upsert(ctx context.Context, p profileRow) error {
	uid, err := uuid.Parse(p.UserID)
	if err != nil {
		return err
	}

	var teamUUID *uuid.UUID
	if p.TeamID != nil && *p.TeamID != "" {
		tu, err := uuid.Parse(*p.TeamID)
		if err != nil {
			return err
		}
		teamUUID = &tu
	}

	var sectorUUID *uuid.UUID
	if p.SectorID != nil && *p.SectorID != "" {
		su, err := uuid.Parse(*p.SectorID)
		if err != nil {
			return err
		}
		sectorUUID = &su
	}

	err = r.db.User.UpdateOneID(uid).
		SetFirstName(p.FirstName).
		SetLastName(p.LastName).
		SetNillableProfileImageURL(&p.ProfileImageURL).
		SetNillableDateOfBirth(p.DateOfBirth).
		SetNillableAddress(&p.Address).
		SetEmail(p.Email).
		SetNillablePhoneNumber(&p.PhoneNumber).
		SetNillableTeamID(teamUUID).
		SetNillableSectorID(sectorUUID).
		SetIsProfileComplete(true).
		Exec(ctx)

	if err == nil {
		// Sync details back to corresponding Member directory record if email matches
		_ = r.db.Member.Update().
			Where(member.Email(p.Email)).
			SetFirstName(p.FirstName).
			SetSurname(p.LastName).
			SetHomeAddress(p.Address).
			SetPhoneNumber(p.PhoneNumber).
			Exec(ctx)
	}

	return err
}

var ErrNotFound = pgx.ErrNoRows
