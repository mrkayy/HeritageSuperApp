package membership

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/membershipstagehistory"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
)

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Get(ctx context.Context, id string) (contracts.Member, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.Member{}, err
	}

	m, err := r.db.Member.Query().
		Where(member.IDEQ(uid)).
		WithLocalChurch().
		WithSector().
		WithTeam().
		Only(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	return mapEntMemberToContract(m), nil
}

func (r *Repository) List(ctx context.Context) ([]contracts.Member, error) {
	members, err := r.db.Member.Query().
		Order(ent.Asc(member.FieldFirstName), ent.Asc(member.FieldSurname)).
		WithLocalChurch().
		WithSector().
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.Member, 0, len(members))
	for _, m := range members {
		out = append(out, mapEntMemberToContract(m))
	}
	return out, nil
}

type AddMemberInput struct {
	FirstName               string
	Surname                 string
	Email                   *string
	PhoneNumber             *string
	HomeAddress             *string
	Gender                  *string
	DateOfBirthDay          *int16
	DateOfBirthMonth        *int16
	MaritalStatus           *string
	WeddingAnniversaryDay   *int16
	WeddingAnniversaryMonth *int16
	JobOccupation           *string
	PhotoURL                *string
	EmergencyContactName    *string
	EmergencyContactPhone   *string
	Allergies               *string
	MedicalNotes            *string
	IsPlaceholder           bool
	SourceTeam              *string
	CreatedBy               *uuid.UUID
	CurrentStage            *string
	LocalChurchID           *string
	SectorID                *string
	TeamID                  *string
}

func (r *Repository) Add(ctx context.Context, in AddMemberInput) (contracts.Member, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	// 1. Create member builder
	builder := tx.Member.Create().
		SetFirstName(in.FirstName).
		SetSurname(in.Surname).
		SetIsPlaceholder(in.IsPlaceholder)

	if in.Email != nil && *in.Email != "" {
		builder.SetEmail(*in.Email)
	}
	if in.PhoneNumber != nil && *in.PhoneNumber != "" {
		builder.SetPhoneNumber(*in.PhoneNumber)
	}
	if in.HomeAddress != nil && *in.HomeAddress != "" {
		builder.SetHomeAddress(*in.HomeAddress)
	}
	if in.Gender != nil && *in.Gender != "" {
		builder.SetGender(member.Gender(*in.Gender))
	}
	if in.DateOfBirthDay != nil {
		builder.SetDateOfBirthDay(*in.DateOfBirthDay)
	}
	if in.DateOfBirthMonth != nil {
		builder.SetDateOfBirthMonth(*in.DateOfBirthMonth)
	}
	if in.MaritalStatus != nil && *in.MaritalStatus != "" {
		builder.SetMaritalStatus(member.MaritalStatus(*in.MaritalStatus))
	}
	if in.WeddingAnniversaryDay != nil {
		builder.SetWeddingAnniversaryDay(*in.WeddingAnniversaryDay)
	}
	if in.WeddingAnniversaryMonth != nil {
		builder.SetWeddingAnniversaryMonth(*in.WeddingAnniversaryMonth)
	}
	if in.JobOccupation != nil && *in.JobOccupation != "" {
		builder.SetJobOccupation(*in.JobOccupation)
	}
	if in.PhotoURL != nil && *in.PhotoURL != "" {
		builder.SetPhotoURL(*in.PhotoURL)
	}
	if in.EmergencyContactName != nil && *in.EmergencyContactName != "" {
		builder.SetEmergencyContactName(*in.EmergencyContactName)
	}
	if in.EmergencyContactPhone != nil && *in.EmergencyContactPhone != "" {
		builder.SetEmergencyContactPhone(*in.EmergencyContactPhone)
	}
	if in.Allergies != nil && *in.Allergies != "" {
		builder.SetAllergies(*in.Allergies)
	}
	if in.MedicalNotes != nil && *in.MedicalNotes != "" {
		builder.SetMedicalNotes(*in.MedicalNotes)
	}
	if in.SourceTeam != nil && *in.SourceTeam != "" {
		builder.SetSourceTeam(*in.SourceTeam)
	}
	if in.CreatedBy != nil {
		builder.SetCreatedBy(*in.CreatedBy)
	}

	stage := "first_time_guest"
	if in.CurrentStage != nil && *in.CurrentStage != "" {
		stage = *in.CurrentStage
	}
	builder.SetCurrentStage(member.CurrentStage(stage))

	if in.LocalChurchID != nil && *in.LocalChurchID != "" {
		lcid, err := uuid.Parse(*in.LocalChurchID)
		if err == nil {
			builder.SetLocalChurchID(lcid)
		}
	}
	if in.SectorID != nil && *in.SectorID != "" {
		scid, err := uuid.Parse(*in.SectorID)
		if err == nil {
			builder.SetSectorID(scid)
		}
	}
	if in.TeamID != nil && *in.TeamID != "" {
		tmid, err := uuid.Parse(*in.TeamID)
		if err == nil {
			builder.SetTeamID(tmid)
		}
	}

	m, err := builder.Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	// 2. Create initial stage history
	shBuilder := tx.MembershipStageHistory.Create().
		SetMemberID(m.ID).
		SetStage(membershipstagehistory.Stage(stage))
	if in.CreatedBy != nil {
		shBuilder.SetRecordedBy(*in.CreatedBy)
	}
	_, err = shBuilder.Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	if err := tx.Commit(); err != nil {
		return contracts.Member{}, err
	}

	return mapEntMemberToContract(m), nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	return r.db.Member.DeleteOneID(uid).Exec(ctx)
}

func (r *Repository) Profile(ctx context.Context, name string, email string, role string, teamID, sectorID, churchID *string) (contracts.Member, error) {
	// 1. Check if user already exists
	exists, err := r.db.User.Query().
		Where(entuser.Email(email)).
		Exist(ctx)
	if err != nil {
		return contracts.Member{}, err
	}
	if exists {
		return contracts.Member{}, fmt.Errorf("user with email %s already exists", email)
	}

	// 2. Start a transaction so Member and User creation are atomic
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	// 3. Parse name
	parts := strings.SplitN(name, " ", 2)
	firstName := parts[0]
	lastName := ""
	if len(parts) > 1 {
		lastName = parts[1]
	}

	// 4. Create Member
	m, err := tx.Member.Create().
		SetFirstName(firstName).
		SetSurname(lastName).
		SetEmail(email).
		SetCurrentStage(member.CurrentStageFirstTimeGuest).
		Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	// 5. Create initial stage history
	_, err = tx.MembershipStageHistory.Create().
		SetMemberID(m.ID).
		SetStage(membershipstagehistory.StageFirstTimeGuest).
		Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	// 6. Create User
	uBuilder := tx.User.Create().
		SetEmail(email).
		SetFirstName(firstName).
		SetLastName(lastName).
		SetPasswordHash("oauth-managed-account").
		SetRole(entuser.Role(role)).
		SetAccountStatus(entuser.AccountStatusActive).
		SetIsProfileComplete(false)

	if teamID != nil && *teamID != "" {
		tu, err := uuid.Parse(*teamID)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, fmt.Errorf("invalid team ID: %w", err)
		}
		uBuilder.SetTeamID(tu)
	}
	if sectorID != nil && *sectorID != "" {
		su, err := uuid.Parse(*sectorID)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, fmt.Errorf("invalid sector ID: %w", err)
		}
		uBuilder.SetSectorID(su)
	}
	if churchID != nil && *churchID != "" {
		cu, err := uuid.Parse(*churchID)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, fmt.Errorf("invalid church ID: %w", err)
		}
		uBuilder.SetChurchID(cu)
	}

	_, err = uBuilder.Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	if err := tx.Commit(); err != nil {
		return contracts.Member{}, err
	}

	return mapEntMemberToContract(m), nil
}

func mapEntMemberToContract(m *ent.Member) contracts.Member {
	name := m.FirstName
	if m.Surname != "" {
		name = name + " " + m.Surname
	}

	var gender *string
	if m.Gender != nil {
		g := string(*m.Gender)
		gender = &g
	}

	var marital *string
	if m.MaritalStatus != nil {
		ms := string(*m.MaritalStatus)
		marital = &ms
	}

	var createdBy *string
	if m.CreatedBy != nil {
		cb := m.CreatedBy.String()
		createdBy = &cb
	}

	var localChurchID *string
	var localChurchName *string
	if m.Edges.LocalChurch != nil {
		id := m.Edges.LocalChurch.ID.String()
		localChurchID = &id
		nm := m.Edges.LocalChurch.Name
		if m.Edges.LocalChurch.Center != "" {
			nm = nm + " (" + m.Edges.LocalChurch.Center + ")"
		}
		localChurchName = &nm
	} else if m.LocalChurchID != nil {
		id := m.LocalChurchID.String()
		localChurchID = &id
	}

	var sectorID *string
	var sectorName *string
	if m.Edges.Sector != nil {
		id := m.Edges.Sector.ID.String()
		sectorID = &id
		nm := m.Edges.Sector.SectorName
		sectorName = &nm
	} else if m.SectorID != nil {
		id := m.SectorID.String()
		sectorID = &id
	}

	var teamID *string
	var teamName *string
	if m.Edges.Team != nil {
		id := m.Edges.Team.ID.String()
		teamID = &id
		nm := m.Edges.Team.Name
		teamName = &nm
	} else if m.TeamID != nil {
		id := m.TeamID.String()
		teamID = &id
	}

	return contracts.Member{
		ID:                      m.ID.String(),
		FirstName:               m.FirstName,
		Surname:                 m.Surname,
		Email:                   m.Email,
		PhoneNumber:             m.PhoneNumber,
		HomeAddress:             m.HomeAddress,
		Gender:                  gender,
		DateOfBirthDay:          m.DateOfBirthDay,
		DateOfBirthMonth:        m.DateOfBirthMonth,
		MaritalStatus:           marital,
		WeddingAnniversaryDay:   m.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: m.WeddingAnniversaryMonth,
		JobOccupation:           m.JobOccupation,
		PhotoURL:                m.PhotoURL,
		EmergencyContactName:    m.EmergencyContactName,
		EmergencyContactPhone:   m.EmergencyContactPhone,
		Allergies:               m.Allergies,
		MedicalNotes:            m.MedicalNotes,
		IsPlaceholder:           m.IsPlaceholder,
		SourceTeam:              m.SourceTeam,
		CreatedBy:               createdBy,
		LocalChurchID:           localChurchID,
		LocalChurchName:         localChurchName,
		SectorID:                sectorID,
		SectorName:              sectorName,
		TeamID:                  teamID,
		TeamName:                teamName,
		CurrentStage:            string(m.CurrentStage),
		CreatedAt:               m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:               m.UpdatedAt.Format(time.RFC3339),
		Name:                    name,
	}
}

func (r *Repository) Update(ctx context.Context, id string, in AddMemberInput) (contracts.Member, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.Member{}, err
	}

	u := r.db.Member.UpdateOneID(uid).
		SetFirstName(in.FirstName).
		SetSurname(in.Surname).
		SetIsPlaceholder(in.IsPlaceholder)

	if in.Email != nil && *in.Email != "" {
		u.SetEmail(*in.Email)
	} else {
		u.ClearEmail()
	}
	if in.PhoneNumber != nil && *in.PhoneNumber != "" {
		u.SetPhoneNumber(*in.PhoneNumber)
	} else {
		u.ClearPhoneNumber()
	}
	if in.HomeAddress != nil && *in.HomeAddress != "" {
		u.SetHomeAddress(*in.HomeAddress)
	} else {
		u.ClearHomeAddress()
	}
	if in.Gender != nil && *in.Gender != "" {
		u.SetGender(member.Gender(*in.Gender))
	} else {
		u.ClearGender()
	}
	if in.DateOfBirthDay != nil {
		u.SetDateOfBirthDay(*in.DateOfBirthDay)
	} else {
		u.ClearDateOfBirthDay()
	}
	if in.DateOfBirthMonth != nil {
		u.SetDateOfBirthMonth(*in.DateOfBirthMonth)
	} else {
		u.ClearDateOfBirthMonth()
	}
	if in.MaritalStatus != nil && *in.MaritalStatus != "" {
		u.SetMaritalStatus(member.MaritalStatus(*in.MaritalStatus))
	} else {
		u.ClearMaritalStatus()
	}
	if in.WeddingAnniversaryDay != nil {
		u.SetWeddingAnniversaryDay(*in.WeddingAnniversaryDay)
	} else {
		u.ClearWeddingAnniversaryDay()
	}
	if in.WeddingAnniversaryMonth != nil {
		u.SetWeddingAnniversaryMonth(*in.WeddingAnniversaryMonth)
	} else {
		u.ClearWeddingAnniversaryMonth()
	}
	if in.JobOccupation != nil && *in.JobOccupation != "" {
		u.SetJobOccupation(*in.JobOccupation)
	} else {
		u.ClearJobOccupation()
	}
	if in.PhotoURL != nil && *in.PhotoURL != "" {
		u.SetPhotoURL(*in.PhotoURL)
	} else {
		u.ClearPhotoURL()
	}
	if in.EmergencyContactName != nil && *in.EmergencyContactName != "" {
		u.SetEmergencyContactName(*in.EmergencyContactName)
	} else {
		u.ClearEmergencyContactName()
	}
	if in.EmergencyContactPhone != nil && *in.EmergencyContactPhone != "" {
		u.SetEmergencyContactPhone(*in.EmergencyContactPhone)
	} else {
		u.ClearEmergencyContactPhone()
	}
	if in.Allergies != nil && *in.Allergies != "" {
		u.SetAllergies(*in.Allergies)
	} else {
		u.ClearAllergies()
	}
	if in.MedicalNotes != nil && *in.MedicalNotes != "" {
		u.SetMedicalNotes(*in.MedicalNotes)
	} else {
		u.ClearMedicalNotes()
	}
	if in.SourceTeam != nil && *in.SourceTeam != "" {
		u.SetSourceTeam(*in.SourceTeam)
	} else {
		u.ClearSourceTeam()
	}

	if in.LocalChurchID != nil && *in.LocalChurchID != "" {
		lcid, err := uuid.Parse(*in.LocalChurchID)
		if err == nil {
			u.SetLocalChurchID(lcid)
		}
	} else {
		u.ClearLocalChurch()
	}

	if in.SectorID != nil && *in.SectorID != "" {
		scid, err := uuid.Parse(*in.SectorID)
		if err == nil {
			u.SetSectorID(scid)
		}
	} else {
		u.ClearSector()
	}

	if in.TeamID != nil && *in.TeamID != "" {
		tmid, err := uuid.Parse(*in.TeamID)
		if err == nil {
			u.SetTeamID(tmid)
		}
	} else {
		u.ClearTeam()
	}

	if in.CurrentStage != nil && *in.CurrentStage != "" {
		u.SetCurrentStage(member.CurrentStage(*in.CurrentStage))
	}

	m, err := u.Save(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	// Sync back to User account if one exists with the same email
	if m.Email != nil && *m.Email != "" {
		userUpdate := r.db.User.Update().Where(entuser.EmailEQ(*m.Email))
		if m.TeamID != nil {
			userUpdate.SetTeamID(*m.TeamID)
		} else {
			userUpdate.ClearTeamID()
		}
		if m.SectorID != nil {
			userUpdate.SetSectorID(*m.SectorID)
		} else {
			userUpdate.ClearSectorID()
		}
		if m.LocalChurchID != nil {
			userUpdate.SetChurchID(*m.LocalChurchID)
		} else {
			userUpdate.ClearChurchID()
		}
		_ = userUpdate.Exec(ctx)
	}

	return r.Get(ctx, m.ID.String())
}
