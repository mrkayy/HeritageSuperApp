package membership

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/guardianrelationship"
	"github.com/hofchurchng/church-backend/internal/ent/kidsministryprofile"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/membershipstagehistory"
	"github.com/hofchurchng/church-backend/internal/ent/memberteam"
	"github.com/hofchurchng/church-backend/internal/ent/user"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
	"github.com/hofchurchng/church-backend/internal/ent/usersector"
	"github.com/hofchurchng/church-backend/internal/ent/userteam"
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
	Role                    string
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

var StageProgression = []membershipstagehistory.Stage{
	membershipstagehistory.StageFirstTimeGuest,
	membershipstagehistory.StageFoundationClass,
	membershipstagehistory.StageSundaySchoolModule1,
	membershipstagehistory.StageSundaySchoolModule2,
	membershipstagehistory.StageSundaySchoolModule3,
	membershipstagehistory.StageMembershipClass,
	membershipstagehistory.StageStewardship,
	membershipstagehistory.StageMit,
	membershipstagehistory.StageResidentPastor,
}

// GetStagesUpTo returns all stages in order up to and including targetStage.
func GetStagesUpTo(targetStage string) []membershipstagehistory.Stage {
	target := membershipstagehistory.Stage(targetStage)
	targetIdx := -1
	for i, s := range StageProgression {
		if s == target {
			targetIdx = i
			break
		}
	}
	if targetIdx == -1 {
		return []membershipstagehistory.Stage{membershipstagehistory.StageFirstTimeGuest}
	}
	return StageProgression[:targetIdx+1]
}

func (r *Repository) recordStageHistoriesUpTo(ctx context.Context, tx *ent.Tx, memberID uuid.UUID, targetStage string, recordedBy *uuid.UUID) error {
	existingHistories, err := tx.MembershipStageHistory.Query().
		Where(membershipstagehistory.MemberIDEQ(memberID)).
		All(ctx)
	if err != nil {
		return err
	}

	existingMap := make(map[membershipstagehistory.Stage]bool)
	for _, h := range existingHistories {
		existingMap[h.Stage] = true
	}

	stages := GetStagesUpTo(targetStage)
	now := time.Now()
	for i, stg := range stages {
		if !existingMap[stg] {
			shBuilder := tx.MembershipStageHistory.Create().
				SetMemberID(memberID).
				SetStage(stg).
				SetEnteredAt(now.Add(time.Duration(i) * time.Second))
			if recordedBy != nil {
				shBuilder.SetRecordedBy(*recordedBy)
			}
			if _, err := shBuilder.Save(ctx); err != nil {
				return err
			}
		}
	}
	return nil
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

	stage := string(membershipstagehistory.StageFirstTimeGuest)
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

	// 2. Create stage history progression up to current stage
	stages := GetStagesUpTo(stage)
	now := time.Now()
	for i, stg := range stages {
		shBuilder := tx.MembershipStageHistory.Create().
			SetMemberID(m.ID).
			SetStage(stg).
			SetEnteredAt(now.Add(time.Duration(i) * time.Second))
		if in.CreatedBy != nil {
			shBuilder.SetRecordedBy(*in.CreatedBy)
		}
		if _, err := shBuilder.Save(ctx); err != nil {
			tx.Rollback()
			return contracts.Member{}, err
		}
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

	tx, err := r.db.Tx(ctx)
	if err != nil {
		return err
	}

	// 1. Get member to retrieve email for cleaning up linked user account
	m, err := tx.Member.Get(ctx, uid)
	if err != nil {
		_ = tx.Rollback()
		if ent.IsNotFound(err) {
			return fmt.Errorf("member not found")
		}
		return err
	}

	// 2. Delete membership stage histories
	_, err = tx.MembershipStageHistory.Delete().
		Where(membershipstagehistory.MemberIDEQ(uid)).
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	// 3. Delete member teams
	_, err = tx.MemberTeam.Delete().
		Where(memberteam.MemberIDEQ(uid)).
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	// 4. Delete kids ministry profile
	_, err = tx.KidsMinistryProfile.Delete().
		Where(kidsministryprofile.MemberIDEQ(uid)).
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	// 5. Delete guardian relationships (as child or guardian)
	_, err = tx.GuardianRelationship.Delete().
		Where(
			guardianrelationship.Or(
				guardianrelationship.ChildMemberIDEQ(uid),
				guardianrelationship.GuardianMemberIDEQ(uid),
			),
		).
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	// 6. Delete the member
	if err := tx.Member.DeleteOneID(uid).Exec(ctx); err != nil {
		_ = tx.Rollback()
		return err
	}

	// 7. If there's an associated user account created for this member's email, delete it and its junction records
	if m.Email != nil && *m.Email != "" {
		if u, err := tx.User.Query().Where(entuser.EmailEQ(*m.Email)).Only(ctx); err == nil {
			_, _ = tx.UserTeam.Delete().Where(userteam.UserIDEQ(u.ID)).Exec(ctx)
			_, _ = tx.UserSector.Delete().Where(usersector.UserIDEQ(u.ID)).Exec(ctx)
			_ = tx.User.DeleteOneID(u.ID).Exec(ctx)
		}
	}

	return tx.Commit()
}

func (r *Repository) ProfileNewMember(ctx context.Context, in ProfileMemberInput) (contracts.Member, error) {
	firstName := strings.TrimSpace(in.FirstName)
	surname := strings.TrimSpace(in.Surname)
	if surname == "" && strings.Contains(firstName, " ") {
		parts := strings.SplitN(firstName, " ", 2)
		firstName = parts[0]
		surname = parts[1]
	}
	if firstName == "" && in.Name != "" {
		parts := strings.SplitN(strings.TrimSpace(in.Name), " ", 2)
		firstName = parts[0]
		if len(parts) > 1 {
			surname = parts[1]
		}
	}
	email := strings.TrimSpace(in.Email)
	role := strings.TrimSpace(in.Role)

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

	stage := string(membershipstagehistory.StageFirstTimeGuest)
	if in.CurrentStage != nil && *in.CurrentStage != "" {
		stage = *in.CurrentStage
	}

	// 3. Create Member
	mBuilder := tx.Member.Create().
		SetFirstName(firstName).
		SetSurname(surname).
		SetEmail(email).
		SetCurrentStage(member.CurrentStage(stage))

	if in.CreatedBy != nil {
		mBuilder.SetCreatedBy(*in.CreatedBy)
	}
	if in.ChurchID != nil && *in.ChurchID != "" {
		if cu, err := uuid.Parse(*in.ChurchID); err == nil {
			mBuilder.SetLocalChurchID(cu)
		}
	}
	if in.SectorID != nil && *in.SectorID != "" {
		if su, err := uuid.Parse(*in.SectorID); err == nil {
			mBuilder.SetSectorID(su)
		}
	}
	if in.TeamID != nil && *in.TeamID != "" {
		if tu, err := uuid.Parse(*in.TeamID); err == nil {
			mBuilder.SetTeamID(tu)
		}
	}

	m, err := mBuilder.Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	// 4. Create stage history progression up to current stage
	stages := GetStagesUpTo(stage)
	now := time.Now()
	for i, stg := range stages {
		shBuilder := tx.MembershipStageHistory.Create().
			SetMemberID(m.ID).
			SetStage(stg).
			SetEnteredAt(now.Add(time.Duration(i) * time.Second))
		if in.CreatedBy != nil {
			shBuilder.SetRecordedBy(*in.CreatedBy)
		}
		if _, err := shBuilder.Save(ctx); err != nil {
			tx.Rollback()
			return contracts.Member{}, err
		}
	}

	genUsername := firstName
	if surname != "" {
		genUsername = fmt.Sprintf("%s. %s", strings.ToUpper(string([]rune(surname)[0])), firstName)
	}

	// 5. Create User
	uBuilder := tx.User.Create().
		SetEmail(email).
		SetFirstName(firstName).
		SetLastName(surname).
		SetUsername(genUsername).
		SetPasswordHash("oauth-managed-account").
		SetRole(entuser.Role(role)).
		SetAccountStatus(entuser.AccountStatusActive).
		SetIsProfileComplete(false)

	var teamUUID *uuid.UUID
	if in.TeamID != nil && *in.TeamID != "" {
		tu, err := uuid.Parse(*in.TeamID)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, fmt.Errorf("invalid team ID: %w", err)
		}
		teamUUID = &tu
		uBuilder.SetTeamID(tu)
	}
	var sectorUUID *uuid.UUID
	if in.SectorID != nil && *in.SectorID != "" {
		su, err := uuid.Parse(*in.SectorID)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, fmt.Errorf("invalid sector ID: %w", err)
		}
		sectorUUID = &su
		uBuilder.SetSectorID(su)
	}
	if in.ChurchID != nil && *in.ChurchID != "" {
		cu, err := uuid.Parse(*in.ChurchID)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, fmt.Errorf("invalid church ID: %w", err)
		}
		uBuilder.SetChurchID(cu)
	}

	u, err := uBuilder.Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	// Link into UserTeam and UserSector junction tables
	if teamUUID != nil {
		_, err = tx.UserTeam.Create().
			SetUserID(u.ID).
			SetTeamID(*teamUUID).
			Save(ctx)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, err
		}
	}
	if sectorUUID != nil {
		_, err = tx.UserSector.Create().
			SetUserID(u.ID).
			SetSectorID(*sectorUUID).
			Save(ctx)
		if err != nil {
			tx.Rollback()
			return contracts.Member{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return contracts.Member{}, err
	}

	return r.Get(ctx, m.ID.String())
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
		JoinedAt:                m.JoinedAt.Format(time.RFC3339),
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

	tx, err := r.db.Tx(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	u := tx.Member.UpdateOneID(uid).
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
		if err := r.recordStageHistoriesUpTo(ctx, tx, uid, *in.CurrentStage, in.CreatedBy); err != nil {
			tx.Rollback()
			return contracts.Member{}, err
		}
	}

	m, err := u.Save(ctx)
	if err != nil {
		tx.Rollback()
		return contracts.Member{}, err
	}

	// Sync back to User account if one exists with the same email
	if m.Email != nil && *m.Email != "" {
		userUpdate := tx.User.Update().Where(entuser.EmailEQ(*m.Email))
		if in.Role != "" {
			userUpdate.SetRole(user.Role(in.Role))
		}
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

	if err := tx.Commit(); err != nil {
		return contracts.Member{}, err
	}

	return r.Get(ctx, m.ID.String())
}
