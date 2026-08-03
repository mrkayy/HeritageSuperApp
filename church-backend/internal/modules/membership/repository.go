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

	m, err := r.db.Member.Get(ctx, uid)
	if err != nil {
		return contracts.Member{}, err
	}

	return mapEntMemberToContract(m), nil
}

func (r *Repository) List(ctx context.Context) ([]contracts.Member, error) {
	members, err := r.db.Member.Query().
		Order(ent.Asc(member.FieldFirstName), ent.Asc(member.FieldSurname)).
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
		CurrentStage:            string(m.CurrentStage),
		CreatedAt:               m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:               m.UpdatedAt.Format(time.RFC3339),
		Name:                    name,
	}
}
