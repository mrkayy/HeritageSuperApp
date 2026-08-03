package profile

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/jackc/pgx/v5"
)

type Service struct {
	repo    *Repository
	teams   contracts.TeamReader
	sectors contracts.SectorReader
}

func NewService(repo *Repository, teams contracts.TeamReader, sectors contracts.SectorReader) *Service {
	return &Service{repo: repo, teams: teams, sectors: sectors}
}

type UpdateProfileInput struct {
	FirstName               string
	LastName                string
	ProfileImageURL         string
	DateOfBirth             *time.Time
	Address                 string
	Email                   string
	PhoneNumber             string
	TeamID                  *string
	SectorID                *string
	MaritalStatus           *string
	WeddingAnniversaryDay   *int16
	WeddingAnniversaryMonth *int16
	JobOccupation           *string
	Allergies               *string
	MedicalNotes            *string
	EmergencyContactName    *string
	EmergencyContactPhone   *string
}

type OwnProfileView struct {
	UserID                  string
	FirstName               string
	LastName                string
	ProfileImageURL         string
	DateOfBirth             *time.Time
	Address                 string
	Email                   string
	PhoneNumber             string
	TeamID                  *string
	TeamName                string
	SectorID                *string
	SectorName              string
	MaritalStatus           *string
	WeddingAnniversaryDay   *int16
	WeddingAnniversaryMonth *int16
	JobOccupation           *string
	Allergies               *string
	MedicalNotes            *string
	EmergencyContactName    *string
	EmergencyContactPhone   *string
}

var (
	ErrProfileNotFound = errors.New("profile not found")
	ErrInvalidTeam     = errors.New("invalid team")
	ErrInvalidSector   = errors.New("invalid sector")
)

func (s *Service) UpdateProfile(ctx context.Context, userID string, in UpdateProfileInput) error {
	if in.TeamID != nil && *in.TeamID != "" {
		if _, err := s.teams.GetTeam(ctx, *in.TeamID); err != nil {
			return ErrInvalidTeam
		}
	} else {
		in.TeamID = nil
	}

	if in.SectorID != nil && *in.SectorID != "" {
		if _, err := s.sectors.GetSector(ctx, *in.SectorID); err != nil {
			return ErrInvalidSector
		}
	} else {
		in.SectorID = nil
	}

	return s.repo.Upsert(ctx, profileRow{
		UserID:                  userID,
		FirstName:               in.FirstName,
		LastName:                in.LastName,
		ProfileImageURL:         in.ProfileImageURL,
		DateOfBirth:             in.DateOfBirth,
		Address:                 in.Address,
		Email:                   in.Email,
		PhoneNumber:             in.PhoneNumber,
		TeamID:                  in.TeamID,
		SectorID:                in.SectorID,
		MaritalStatus:           in.MaritalStatus,
		WeddingAnniversaryDay:   in.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: in.WeddingAnniversaryMonth,
		JobOccupation:           in.JobOccupation,
		Allergies:               in.Allergies,
		MedicalNotes:            in.MedicalNotes,
		EmergencyContactName:    in.EmergencyContactName,
		EmergencyContactPhone:   in.EmergencyContactPhone,
	})
}

func (s *Service) GetOwnProfile(ctx context.Context, userID string) (OwnProfileView, error) {
	row, err := s.repo.GetByUserID(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return OwnProfileView{UserID: userID}, nil
	}
	if err != nil {
		return OwnProfileView{}, err
	}

	view := OwnProfileView{
		UserID:                  row.UserID,
		FirstName:               row.FirstName,
		LastName:                row.LastName,
		ProfileImageURL:         row.ProfileImageURL,
		DateOfBirth:             row.DateOfBirth,
		Address:                 row.Address,
		Email:                   row.Email,
		PhoneNumber:             row.PhoneNumber,
		TeamID:                  row.TeamID,
		SectorID:                row.SectorID,
		MaritalStatus:           row.MaritalStatus,
		WeddingAnniversaryDay:   row.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: row.WeddingAnniversaryMonth,
		JobOccupation:           row.JobOccupation,
		Allergies:               row.Allergies,
		MedicalNotes:            row.MedicalNotes,
		EmergencyContactName:    row.EmergencyContactName,
		EmergencyContactPhone:   row.EmergencyContactPhone,
	}
	if row.TeamID != nil {
		if team, err := s.teams.GetTeam(ctx, *row.TeamID); err == nil {
			view.TeamName = team.Name
		}
	}
	if row.SectorID != nil {
		if sector, err := s.sectors.GetSector(ctx, *row.SectorID); err == nil {
			view.SectorName = sector.Name
		}
	}
	return view, nil
}

func (s *Service) GetProfile(ctx context.Context, userID string) (contracts.Profile, error) {
	row, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return contracts.Profile{}, err
	}
	p := contracts.Profile{
		UserID:          row.UserID,
		FirstName:       row.FirstName,
		LastName:        row.LastName,
		ProfileImageURL: row.ProfileImageURL,
		Address:         row.Address,
		Email:           row.Email,
		PhoneNumber:     row.PhoneNumber,
		TeamID:          row.TeamID,
		SectorID:        row.SectorID,
	}
	if row.TeamID != nil {
		if team, err := s.teams.GetTeam(ctx, *row.TeamID); err == nil {
			p.TeamName = team.Name
		}
	}
	if row.SectorID != nil {
		if sector, err := s.sectors.GetSector(ctx, *row.SectorID); err == nil {
			p.SectorName = sector.Name
		}
	}
	return p, nil
}

func (s *Service) ListKids(ctx context.Context, email string) ([]contracts.Member, error) {
	parent, err := s.repo.FindMemberByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	return s.repo.ListKids(ctx, parent.ID)
}

func (s *Service) AddKid(ctx context.Context, email string, child contracts.Member) (contracts.Member, error) {
	parent, err := s.repo.FindMemberByEmail(ctx, email)
	if err != nil {
		return contracts.Member{}, err
	}
	return s.repo.AddKid(ctx, parent.ID, child)
}

func (s *Service) UpdateKid(ctx context.Context, email string, kidID string, child contracts.Member) (contracts.Member, error) {
	parent, err := s.repo.FindMemberByEmail(ctx, email)
	if err != nil {
		return contracts.Member{}, err
	}
	kidUUID, err := uuid.Parse(kidID)
	if err != nil {
		return contracts.Member{}, err
	}
	return s.repo.UpdateKid(ctx, parent.ID, kidUUID, child)
}

func (s *Service) DeleteKid(ctx context.Context, email string, kidID string) error {
	parent, err := s.repo.FindMemberByEmail(ctx, email)
	if err != nil {
		return err
	}
	kidUUID, err := uuid.Parse(kidID)
	if err != nil {
		return err
	}
	return s.repo.DeleteKid(ctx, parent.ID, kidUUID)
}
