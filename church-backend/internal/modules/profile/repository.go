package profile

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/guardianrelationship"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/jackc/pgx/v5"
)

type profileRow struct {
	UserID                  string
	FirstName               string
	LastName                string
	ProfileImageURL         string
	DateOfBirth             *time.Time
	Address                 string
	Email                   string
	PhoneNumber             string
	TeamID                  *string
	SectorID                *string
	ChurchID                *string
	MaritalStatus           *string
	WeddingAnniversaryDay   *int16
	WeddingAnniversaryMonth *int16
	JobOccupation           *string
	Allergies               *string
	MedicalNotes            *string
	EmergencyContactName    *string
	EmergencyContactPhone   *string
	DateOfBirthDay          *int16
	DateOfBirthMonth        *int16
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

	var churchID *string
	var maritalStatus *string
	var anniversaryDay *int16
	var anniversaryMonth *int16
	var jobOccupation *string
	var allergies *string
	var medicalNotes *string
	var emergencyContactName *string
	var emergencyContactPhone *string
	var dateOfBirthDay *int16
	var dateOfBirthMonth *int16

	if m, err := r.db.Member.Query().Where(member.Email(u.Email)).Only(ctx); err == nil && m != nil {
		if m.LocalChurchID != nil {
			c := m.LocalChurchID.String()
			churchID = &c
		}
		if m.SectorID != nil {
			s := m.SectorID.String()
			sectorID = &s
		}
		if m.TeamID != nil {
			t := m.TeamID.String()
			teamID = &t
		}
		if m.MaritalStatus != nil {
			ms := string(*m.MaritalStatus)
			maritalStatus = &ms
		}
		anniversaryDay = m.WeddingAnniversaryDay
		anniversaryMonth = m.WeddingAnniversaryMonth
		jobOccupation = m.JobOccupation
		allergies = m.Allergies
		medicalNotes = m.MedicalNotes
		emergencyContactName = m.EmergencyContactName
		emergencyContactPhone = m.EmergencyContactPhone
		dateOfBirthDay = m.DateOfBirthDay
		dateOfBirthMonth = m.DateOfBirthMonth
	}

	return profileRow{
		UserID:                  u.ID.String(),
		FirstName:               u.FirstName,
		LastName:                u.LastName,
		ProfileImageURL:         getString(u.ProfileImageURL),
		DateOfBirth:             u.DateOfBirth,
		Address:                 getString(u.Address),
		Email:                   u.Email,
		PhoneNumber:             getString(u.PhoneNumber),
		TeamID:                  teamID,
		SectorID:                sectorID,
		ChurchID:                churchID,
		MaritalStatus:           maritalStatus,
		WeddingAnniversaryDay:   anniversaryDay,
		WeddingAnniversaryMonth: anniversaryMonth,
		JobOccupation:           jobOccupation,
		Allergies:               allergies,
		MedicalNotes:            medicalNotes,
		EmergencyContactName:    emergencyContactName,
		EmergencyContactPhone:   emergencyContactPhone,
		DateOfBirthDay:          dateOfBirthDay,
		DateOfBirthMonth:        dateOfBirthMonth,
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
		uBuilder := r.db.Member.Update().
			Where(member.Email(p.Email)).
			SetFirstName(p.FirstName).
			SetSurname(p.LastName).
			SetHomeAddress(p.Address).
			SetPhoneNumber(p.PhoneNumber)

		if p.MaritalStatus != nil && *p.MaritalStatus != "" {
			uBuilder.SetMaritalStatus(member.MaritalStatus(*p.MaritalStatus))
		} else {
			uBuilder.ClearMaritalStatus()
		}

		if p.WeddingAnniversaryDay != nil {
			uBuilder.SetWeddingAnniversaryDay(*p.WeddingAnniversaryDay)
		} else {
			uBuilder.ClearWeddingAnniversaryDay()
		}

		if p.WeddingAnniversaryMonth != nil {
			uBuilder.SetWeddingAnniversaryMonth(*p.WeddingAnniversaryMonth)
		} else {
			uBuilder.ClearWeddingAnniversaryMonth()
		}

		if p.JobOccupation != nil && *p.JobOccupation != "" {
			uBuilder.SetJobOccupation(*p.JobOccupation)
		} else {
			uBuilder.ClearJobOccupation()
		}

		if p.Allergies != nil && *p.Allergies != "" {
			uBuilder.SetAllergies(*p.Allergies)
		} else {
			uBuilder.ClearAllergies()
		}

		if p.MedicalNotes != nil && *p.MedicalNotes != "" {
			uBuilder.SetMedicalNotes(*p.MedicalNotes)
		} else {
			uBuilder.ClearMedicalNotes()
		}

		if p.EmergencyContactName != nil && *p.EmergencyContactName != "" {
			uBuilder.SetEmergencyContactName(*p.EmergencyContactName)
		} else {
			uBuilder.ClearEmergencyContactName()
		}

		if p.EmergencyContactPhone != nil && *p.EmergencyContactPhone != "" {
			uBuilder.SetEmergencyContactPhone(*p.EmergencyContactPhone)
		} else {
			uBuilder.ClearEmergencyContactPhone()
		}

		if p.DateOfBirthDay != nil {
			uBuilder.SetDateOfBirthDay(*p.DateOfBirthDay)
		} else {
			uBuilder.ClearDateOfBirthDay()
		}

		if p.DateOfBirthMonth != nil {
			uBuilder.SetDateOfBirthMonth(*p.DateOfBirthMonth)
		} else {
			uBuilder.ClearDateOfBirthMonth()
		}

		_ = uBuilder.Exec(ctx)
	}

	return err
}

var ErrNotFound = pgx.ErrNoRows

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

func (r *Repository) FindMemberByEmail(ctx context.Context, email string) (*ent.Member, error) {
	return r.db.Member.Query().Where(member.Email(email)).Only(ctx)
}

func (r *Repository) ListKids(ctx context.Context, parentMemberID uuid.UUID) ([]contracts.Member, error) {
	kids, err := r.db.Member.Query().
		Where(member.HasGuardianRelationshipsAsChildWith(
			guardianrelationship.GuardianMemberIDEQ(parentMemberID),
		)).
		WithLocalChurch().
		WithSector().
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.Member, 0, len(kids))
	for _, k := range kids {
		out = append(out, mapEntMemberToContract(k))
	}
	return out, nil
}

func (r *Repository) GetKid(ctx context.Context, parentMemberID, childMemberID uuid.UUID) (contracts.Member, error) {
	exists, err := r.db.GuardianRelationship.Query().
		Where(
			guardianrelationship.ChildMemberIDEQ(childMemberID),
			guardianrelationship.GuardianMemberIDEQ(parentMemberID),
		).
		Exist(ctx)
	if err != nil {
		return contracts.Member{}, err
	}
	if !exists {
		return contracts.Member{}, errors.New("child relationship not found")
	}

	k, err := r.db.Member.Query().
		Where(member.IDEQ(childMemberID)).
		WithLocalChurch().
		WithSector().
		WithTeam().
		Only(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	return mapEntMemberToContract(k), nil
}

func (r *Repository) AddKid(ctx context.Context, parentMemberID uuid.UUID, child contracts.Member) (contracts.Member, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	builder := tx.Member.Create().
		SetFirstName(child.FirstName).
		SetSurname(child.Surname).
		SetIsPlaceholder(true)

	if child.Email != nil && *child.Email != "" {
		builder.SetEmail(*child.Email)
	}
	if child.PhoneNumber != nil && *child.PhoneNumber != "" {
		builder.SetPhoneNumber(*child.PhoneNumber)
	}
	if child.HomeAddress != nil && *child.HomeAddress != "" {
		builder.SetHomeAddress(*child.HomeAddress)
	}
	if child.Gender != nil && *child.Gender != "" {
		builder.SetGender(member.Gender(*child.Gender))
	}
	if child.DateOfBirthDay != nil {
		builder.SetDateOfBirthDay(*child.DateOfBirthDay)
	}
	if child.DateOfBirthMonth != nil {
		builder.SetDateOfBirthMonth(*child.DateOfBirthMonth)
	}
	if child.MaritalStatus != nil && *child.MaritalStatus != "" {
		builder.SetMaritalStatus(member.MaritalStatus(*child.MaritalStatus))
	}
	if child.WeddingAnniversaryDay != nil {
		builder.SetWeddingAnniversaryDay(*child.WeddingAnniversaryDay)
	}
	if child.WeddingAnniversaryMonth != nil {
		builder.SetWeddingAnniversaryMonth(*child.WeddingAnniversaryMonth)
	}
	if child.JobOccupation != nil && *child.JobOccupation != "" {
		builder.SetJobOccupation(*child.JobOccupation)
	}
	if child.PhotoURL != nil && *child.PhotoURL != "" {
		builder.SetPhotoURL(*child.PhotoURL)
	}
	if child.EmergencyContactName != nil && *child.EmergencyContactName != "" {
		builder.SetEmergencyContactName(*child.EmergencyContactName)
	}
	if child.EmergencyContactPhone != nil && *child.EmergencyContactPhone != "" {
		builder.SetEmergencyContactPhone(*child.EmergencyContactPhone)
	}
	if child.Allergies != nil && *child.Allergies != "" {
		builder.SetAllergies(*child.Allergies)
	}
	if child.MedicalNotes != nil && *child.MedicalNotes != "" {
		builder.SetMedicalNotes(*child.MedicalNotes)
	}
	if child.SourceTeam != nil && *child.SourceTeam != "" {
		builder.SetSourceTeam(*child.SourceTeam)
	}
	if child.LocalChurchID != nil && *child.LocalChurchID != "" {
		lcid, err := uuid.Parse(*child.LocalChurchID)
		if err == nil {
			builder.SetLocalChurchID(lcid)
		}
	}
	if child.SectorID != nil && *child.SectorID != "" {
		scid, err := uuid.Parse(*child.SectorID)
		if err == nil {
			builder.SetSectorID(scid)
		}
	}
	if child.TeamID != nil && *child.TeamID != "" {
		tmid, err := uuid.Parse(*child.TeamID)
		if err == nil {
			builder.SetTeamID(tmid)
		}
	}

	cMember, err := builder.Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	parent, err := tx.Member.Get(ctx, parentMemberID)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	_, err = tx.GuardianRelationship.Create().
		SetChildMemberID(cMember.ID).
		SetGuardianMemberID(parentMemberID).
		SetRelationship(guardianrelationship.RelationshipParent).
		Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	// Auto-associate child with spouse if parent is married and has same surname + address
	if parent.MaritalStatus != nil && *parent.MaritalStatus == member.MaritalStatusMarried && parent.Surname != "" {
		spouseQuery := tx.Member.Query().
			Where(
				member.SurnameEQ(parent.Surname),
				member.MaritalStatusEQ(member.MaritalStatusMarried),
				member.IDNEQ(parent.ID),
			)
		if parent.HomeAddress != nil && *parent.HomeAddress != "" {
			spouseQuery = spouseQuery.Where(member.HomeAddressEQ(*parent.HomeAddress))
		}

		spouse, err := spouseQuery.First(ctx)
		if err == nil && spouse != nil {
			_, _ = tx.GuardianRelationship.Create().
				SetChildMemberID(cMember.ID).
				SetGuardianMemberID(spouse.ID).
				SetRelationship(guardianrelationship.RelationshipParent).
				Save(ctx)
		}
	}

	if err := tx.Commit(); err != nil {
		return contracts.Member{}, err
	}

	return r.GetKid(ctx, parentMemberID, cMember.ID)
}

func (r *Repository) UpdateKid(ctx context.Context, parentMemberID, childMemberID uuid.UUID, child contracts.Member) (contracts.Member, error) {
	exists, err := r.db.GuardianRelationship.Query().
		Where(
			guardianrelationship.ChildMemberIDEQ(childMemberID),
			guardianrelationship.GuardianMemberIDEQ(parentMemberID),
		).
		Exist(ctx)
	if err != nil {
		return contracts.Member{}, err
	}
	if !exists {
		return contracts.Member{}, errors.New("child relationship not found")
	}

	u := r.db.Member.UpdateOneID(childMemberID).
		SetFirstName(child.FirstName).
		SetSurname(child.Surname)

	if child.Email != nil && *child.Email != "" {
		u.SetEmail(*child.Email)
	} else {
		u.ClearEmail()
	}
	if child.PhoneNumber != nil && *child.PhoneNumber != "" {
		u.SetPhoneNumber(*child.PhoneNumber)
	} else {
		u.ClearPhoneNumber()
	}
	if child.HomeAddress != nil && *child.HomeAddress != "" {
		u.SetHomeAddress(*child.HomeAddress)
	} else {
		u.ClearHomeAddress()
	}
	if child.Gender != nil && *child.Gender != "" {
		u.SetGender(member.Gender(*child.Gender))
	} else {
		u.ClearGender()
	}
	if child.DateOfBirthDay != nil {
		u.SetDateOfBirthDay(*child.DateOfBirthDay)
	} else {
		u.ClearDateOfBirthDay()
	}
	if child.DateOfBirthMonth != nil {
		u.SetDateOfBirthMonth(*child.DateOfBirthMonth)
	} else {
		u.ClearDateOfBirthMonth()
	}
	if child.MaritalStatus != nil && *child.MaritalStatus != "" {
		u.SetMaritalStatus(member.MaritalStatus(*child.MaritalStatus))
	} else {
		u.ClearMaritalStatus()
	}
	if child.WeddingAnniversaryDay != nil {
		u.SetWeddingAnniversaryDay(*child.WeddingAnniversaryDay)
	} else {
		u.ClearWeddingAnniversaryDay()
	}
	if child.WeddingAnniversaryMonth != nil {
		u.SetWeddingAnniversaryMonth(*child.WeddingAnniversaryMonth)
	} else {
		u.ClearWeddingAnniversaryMonth()
	}
	if child.JobOccupation != nil && *child.JobOccupation != "" {
		u.SetJobOccupation(*child.JobOccupation)
	} else {
		u.ClearJobOccupation()
	}
	if child.PhotoURL != nil && *child.PhotoURL != "" {
		u.SetPhotoURL(*child.PhotoURL)
	} else {
		u.ClearPhotoURL()
	}
	if child.EmergencyContactName != nil && *child.EmergencyContactName != "" {
		u.SetEmergencyContactName(*child.EmergencyContactName)
	} else {
		u.ClearEmergencyContactName()
	}
	if child.EmergencyContactPhone != nil && *child.EmergencyContactPhone != "" {
		u.SetEmergencyContactPhone(*child.EmergencyContactPhone)
	} else {
		u.ClearEmergencyContactPhone()
	}
	if child.Allergies != nil && *child.Allergies != "" {
		u.SetAllergies(*child.Allergies)
	} else {
		u.ClearAllergies()
	}
	if child.MedicalNotes != nil && *child.MedicalNotes != "" {
		u.SetMedicalNotes(*child.MedicalNotes)
	} else {
		u.ClearMedicalNotes()
	}
	if child.SourceTeam != nil && *child.SourceTeam != "" {
		u.SetSourceTeam(*child.SourceTeam)
	} else {
		u.ClearSourceTeam()
	}

	if child.LocalChurchID != nil && *child.LocalChurchID != "" {
		lcid, err := uuid.Parse(*child.LocalChurchID)
		if err == nil {
			u.SetLocalChurchID(lcid)
		}
	} else {
		u.ClearLocalChurch()
	}

	if child.SectorID != nil && *child.SectorID != "" {
		scid, err := uuid.Parse(*child.SectorID)
		if err == nil {
			u.SetSectorID(scid)
		}
	} else {
		u.ClearSector()
	}

	if child.TeamID != nil && *child.TeamID != "" {
		tmid, err := uuid.Parse(*child.TeamID)
		if err == nil {
			u.SetTeamID(tmid)
		}
	} else {
		u.ClearTeam()
	}

	cMember, err := u.Save(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	return r.GetKid(ctx, parentMemberID, cMember.ID)
}

func (r *Repository) DeleteKid(ctx context.Context, parentMemberID, childMemberID uuid.UUID) error {
	exists, err := r.db.GuardianRelationship.Query().
		Where(
			guardianrelationship.ChildMemberIDEQ(childMemberID),
			guardianrelationship.GuardianMemberIDEQ(parentMemberID),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("child relationship not found")
	}

	tx, err := r.db.Tx(ctx)
	if err != nil {
		return err
	}

	_, err = tx.GuardianRelationship.Delete().
		Where(
			guardianrelationship.ChildMemberIDEQ(childMemberID),
			guardianrelationship.GuardianMemberIDEQ(parentMemberID),
		).
		Exec(ctx)
	if err != nil {
		tx.Rollback()
		return err
	}

	err = tx.Member.DeleteOneID(childMemberID).Exec(ctx)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
