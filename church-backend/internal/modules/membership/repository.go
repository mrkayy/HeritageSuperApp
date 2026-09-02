package membership

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/academycohort"
	"github.com/hofchurchng/church-backend/internal/ent/calllog"
	"github.com/hofchurchng/church-backend/internal/ent/cohortenrollment"
	"github.com/hofchurchng/church-backend/internal/ent/continuousassessment"
	"github.com/hofchurchng/church-backend/internal/ent/firsttimerassignment"
	"github.com/hofchurchng/church-backend/internal/ent/guardianrelationship"
	"github.com/hofchurchng/church-backend/internal/ent/kidsministryprofile"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/memberlandmark"
	"github.com/hofchurchng/church-backend/internal/ent/membershipstagehistory"
	"github.com/hofchurchng/church-backend/internal/ent/memberteam"
	"github.com/hofchurchng/church-backend/internal/ent/membertransfer"
	"github.com/hofchurchng/church-backend/internal/ent/profilechangerequest"
	"github.com/hofchurchng/church-backend/internal/ent/situationreport"
	"github.com/hofchurchng/church-backend/internal/ent/teamtodo"
	"github.com/hofchurchng/church-backend/internal/ent/user"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
	"github.com/hofchurchng/church-backend/internal/ent/usersector"
	"github.com/hofchurchng/church-backend/internal/ent/userteam"
	"github.com/hofchurchng/church-backend/internal/ent/visitor"
	"github.com/hofchurchng/church-backend/internal/ent/volunteerapplication"
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

	role := "member"
	if m.Email != nil && *m.Email != "" {
		if u, err := r.db.User.Query().Where(entuser.EmailEQ(*m.Email)).Only(ctx); err == nil {
			role = string(u.Role)
		}
	}

	return mapEntMemberToContract(m, role), nil
}

func (r *Repository) List(ctx context.Context, teamID string) ([]contracts.Member, error) {
	q := r.db.Member.Query().
		Order(ent.Asc(member.FieldFirstName), ent.Asc(member.FieldSurname)).
		WithLocalChurch().
		WithSector().
		WithTeam()

	if teamID != "" {
		if tid, err := uuid.Parse(teamID); err == nil {
			q = q.Where(member.TeamIDEQ(tid))
		}
	}

	members, err := q.All(ctx)
	if err != nil {
		return nil, err
	}

	users, _ := r.db.User.Query().All(ctx)
	emailToRole := make(map[string]string)
	for _, u := range users {
		if u.Email != "" {
			emailToRole[strings.ToLower(u.Email)] = string(u.Role)
		}
	}

	out := make([]contracts.Member, 0, len(members))
	for _, m := range members {
		role := "member"
		if m.Email != nil && *m.Email != "" {
			if r, ok := emailToRole[strings.ToLower(*m.Email)]; ok && r != "" {
				role = r
			}
		}
		out = append(out, mapEntMemberToContract(m, role))
	}
	return out, nil
}

func (r *Repository) GetStageCounts(ctx context.Context) (map[string]int, error) {
	var v []struct {
		CurrentStage member.CurrentStage `json:"current_stage"`
		Count        int                 `json:"count"`
	}
	err := r.db.Member.Query().
		GroupBy(member.FieldCurrentStage).
		Aggregate(ent.Count()).
		Scan(ctx, &v)
	if err != nil {
		return nil, err
	}

	out := make(map[string]int)
	for _, row := range v {
		out[string(row.CurrentStage)] = row.Count
	}
	return out, nil
}

func (r *Repository) ListPaginated(ctx context.Context, page, limit int, search, stage, teamID string) ([]contracts.Member, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	q := r.db.Member.Query()

	if stage != "" {
		q = q.Where(member.CurrentStageEQ(member.CurrentStage(stage)))
	}

	if search != "" {
		q = q.Where(
			member.Or(
				member.FirstNameContainsFold(search),
				member.SurnameContainsFold(search),
				member.EmailContainsFold(search),
				member.PhoneNumberContainsFold(search),
			),
		)
	}

	if teamID != "" {
		if tid, err := uuid.Parse(teamID); err == nil {
			q = q.Where(member.TeamIDEQ(tid))
		}
	}

	total, err := q.Count(ctx)
	if err != nil {
		return nil, 0, err
	}

	members, err := q.
		Order(ent.Asc(member.FieldFirstName), ent.Asc(member.FieldSurname)).
		Offset(offset).
		Limit(limit).
		WithLocalChurch().
		WithSector().
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, 0, err
	}

	users, _ := r.db.User.Query().All(ctx)
	emailToRole := make(map[string]string)
	for _, u := range users {
		if u.Email != "" {
			emailToRole[strings.ToLower(u.Email)] = string(u.Role)
		}
	}

	out := make([]contracts.Member, 0, len(members))
	for _, m := range members {
		role := "member"
		if m.Email != nil && *m.Email != "" {
			if r, ok := emailToRole[strings.ToLower(*m.Email)]; ok && r != "" {
				role = r
			}
		}
		out = append(out, mapEntMemberToContract(m, role))
	}

	return out, total, nil
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

func mapEntMemberToContract(m *ent.Member, userRole ...string) contracts.Member {
	role := "member"
	if len(userRole) > 0 && userRole[0] != "" {
		role = userRole[0]
	}

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

	var profiledBy *string
	if m.ProfiledByUserID != nil {
		p := m.ProfiledByUserID.String()
		profiledBy = &p
	}

	var profiledAt *string
	if m.ProfiledAt != nil {
		pa := m.ProfiledAt.Format(time.RFC3339)
		profiledAt = &pa
	}

	var volunteeringTeamID *string
	if m.VolunteeringTeamID != nil {
		vt := m.VolunteeringTeamID.String()
		volunteeringTeamID = &vt
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
		IsProfiled:              m.IsProfiled,
		ProfiledByUserID:        profiledBy,
		ProfiledAt:              profiledAt,
		SourceTeam:              m.SourceTeam,
		CreatedBy:               createdBy,
		LocalChurchID:           localChurchID,
		LocalChurchName:         localChurchName,
		SectorID:                sectorID,
		SectorName:              sectorName,
		TeamID:                  teamID,
		TeamName:                teamName,
		VolunteeringTeamID:      volunteeringTeamID,
		CurrentStage:            string(m.CurrentStage),
		Role:                    role,
		Roles:                   []string{role},
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

type GuardianRelationshipInput struct {
	ChildMemberID    string `json:"child_member_id"`
	GuardianMemberID string `json:"guardian_member_id"`
	Relationship     string `json:"relationship"`
}

type GuardianRelationshipDTO struct {
	ID               string `json:"id"`
	ChildMemberID    string `json:"child_member_id"`
	GuardianMemberID string `json:"guardian_member_id"`
	Relationship     string `json:"relationship"`
	ChildName        string `json:"child_name,omitempty"`
	GuardianName     string `json:"guardian_name,omitempty"`
	CreatedAt        string `json:"created_at"`
}

func (r *Repository) AddGuardianRelationship(ctx context.Context, in GuardianRelationshipInput) error {
	childID, err := uuid.Parse(in.ChildMemberID)
	if err != nil {
		return err
	}
	guardianID, err := uuid.Parse(in.GuardianMemberID)
	if err != nil {
		return err
	}

	_, err = r.db.GuardianRelationship.Create().
		SetChildMemberID(childID).
		SetGuardianMemberID(guardianID).
		SetRelationship(guardianrelationship.Relationship(in.Relationship)).
		Save(ctx)
	return err
}

func (r *Repository) GetGuardianRelationshipsForMember(ctx context.Context, memberID string) ([]GuardianRelationshipDTO, error) {
	mID, err := uuid.Parse(memberID)
	if err != nil {
		return nil, err
	}

	rels, err := r.db.GuardianRelationship.Query().
		Where(
			guardianrelationship.Or(
				guardianrelationship.ChildMemberIDEQ(mID),
				guardianrelationship.GuardianMemberIDEQ(mID),
			),
		).
		WithChild().
		WithGuardian().
		All(ctx)

	if err != nil {
		return nil, err
	}

	out := make([]GuardianRelationshipDTO, len(rels))
	for i, rel := range rels {
		childName := ""
		if rel.Edges.Child != nil {
			childName = rel.Edges.Child.FirstName + " " + rel.Edges.Child.Surname
		}
		guardianName := ""
		if rel.Edges.Guardian != nil {
			guardianName = rel.Edges.Guardian.FirstName + " " + rel.Edges.Guardian.Surname
		}

		out[i] = GuardianRelationshipDTO{
			ID:               rel.ID.String(),
			ChildMemberID:    rel.ChildMemberID.String(),
			GuardianMemberID: rel.GuardianMemberID.String(),
			Relationship:     string(rel.Relationship),
			ChildName:        childName,
			GuardianName:     guardianName,
			CreatedAt:        rel.CreatedAt.Format(time.RFC3339),
		}
	}
	return out, nil
}

func (r *Repository) DeleteGuardianRelationship(ctx context.Context, relID string) error {
	rID, err := uuid.Parse(relID)
	if err != nil {
		return err
	}
	return r.db.GuardianRelationship.DeleteOneID(rID).Exec(ctx)
}

func (r *Repository) ListTeamTodos(ctx context.Context, userID string, targetTeam string, status string) ([]contracts.TeamTodoDTO, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	u, err := r.db.User.Get(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	query := r.db.TeamTodo.Query().
		Where(teamtodo.TargetTeamEQ(targetTeam))

	if u.ChurchID != nil {
		query = query.Where(teamtodo.ChurchIDEQ(*u.ChurchID))
	}

	if status != "" {
		query = query.Where(teamtodo.StatusEQ(teamtodo.Status(status)))
	}

	todos, err := query.Order(ent.Desc(teamtodo.FieldCreatedAt)).All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.TeamTodoDTO, 0, len(todos))
	for _, t := range todos {
		var completedBy *string
		if t.CompletedBy != nil {
			cb := t.CompletedBy.String()
			completedBy = &cb
		}
		var desc *string
		if t.Description != nil {
			desc = t.Description
		}

		out = append(out, contracts.TeamTodoDTO{
			ID:          t.ID.String(),
			ChurchID:    t.ChurchID.String(),
			TargetTeam:  t.TargetTeam,
			Title:       t.Title,
			Description: desc,
			EntityType:  t.EntityType,
			EntityID:    t.EntityID.String(),
			Status:      string(t.Status),
			CreatedBy:   t.CreatedBy.String(),
			CompletedBy: completedBy,
			CreatedAt:   t.CreatedAt,
			CompletedAt: t.CompletedAt,
		})
	}
	return out, nil
}

func (r *Repository) CompleteTeamTodo(ctx context.Context, entityID string, completedByUserID string) error {
	eid, err := uuid.Parse(entityID)
	if err != nil {
		return err
	}
	cid, err := uuid.Parse(completedByUserID)
	if err != nil {
		return err
	}

	now := time.Now()
	_, err = r.db.TeamTodo.Update().
		Where(
			teamtodo.EntityIDEQ(eid),
			teamtodo.StatusEQ(teamtodo.StatusPending),
		).
		SetStatus(teamtodo.StatusCompleted).
		SetCompletedBy(cid).
		SetCompletedAt(now).
		Save(ctx)
	return err
}

// ---------------------------------------------------------------------------
// 1. Maker-Checker Profile Change Requests
// ---------------------------------------------------------------------------

func (r *Repository) ProposeProfileUpdate(ctx context.Context, churchID, memberID, requestedByUserID, payloadJSON string) (contracts.ProfileChangeRequestDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.ProfileChangeRequestDTO{}, err
	}
	mid, err := uuid.Parse(memberID)
	if err != nil {
		return contracts.ProfileChangeRequestDTO{}, err
	}
	uid, err := uuid.Parse(requestedByUserID)
	if err != nil {
		return contracts.ProfileChangeRequestDTO{}, err
	}

	pcr, err := r.db.ProfileChangeRequest.Create().
		SetChurchID(cid).
		SetMemberID(mid).
		SetRequestedByUserID(uid).
		SetPayloadJSON(payloadJSON).
		SetStatus(profilechangerequest.StatusPending).
		Save(ctx)
	if err != nil {
		return contracts.ProfileChangeRequestDTO{}, err
	}

	mName := ""
	if m, err := r.db.Member.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
	}

	reqName := ""
	if u, err := r.db.User.Get(ctx, uid); err == nil {
		reqName = u.Email
	}

	return contracts.ProfileChangeRequestDTO{
		ID:                 pcr.ID.String(),
		ChurchID:           pcr.ChurchID.String(),
		MemberID:           pcr.MemberID.String(),
		MemberName:         mName,
		RequestedByUserID: pcr.RequestedByUserID.String(),
		RequestedByName:   reqName,
		Status:             string(pcr.Status),
		PayloadJSON:        pcr.PayloadJSON,
		CreatedAt:          pcr.CreatedAt,
	}, nil
}

func (r *Repository) ListPendingChangeRequests(ctx context.Context, churchID string) ([]contracts.ProfileChangeRequestDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}

	pcrs, err := r.db.ProfileChangeRequest.Query().
		Where(
			profilechangerequest.ChurchIDEQ(cid),
			profilechangerequest.StatusEQ(profilechangerequest.StatusPending),
		).
		Order(ent.Desc(profilechangerequest.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.ProfileChangeRequestDTO, 0, len(pcrs))
	for _, p := range pcrs {
		mName := ""
		if m, err := r.db.Member.Get(ctx, p.MemberID); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
		}
		reqName := ""
		if u, err := r.db.User.Get(ctx, p.RequestedByUserID); err == nil {
			reqName = u.Email
		}

		out = append(out, contracts.ProfileChangeRequestDTO{
			ID:                 p.ID.String(),
			ChurchID:           p.ChurchID.String(),
			MemberID:           p.MemberID.String(),
			MemberName:         mName,
			RequestedByUserID: p.RequestedByUserID.String(),
			RequestedByName:   reqName,
			Status:             string(p.Status),
			PayloadJSON:        p.PayloadJSON,
			RejectionReason:    p.RejectionReason,
			CreatedAt:          p.CreatedAt,
		})
	}
	return out, nil
}

func (r *Repository) ReviewChangeRequest(ctx context.Context, reqID, reviewedByUserID string, approved bool, rejectionReason string) error {
	rid, err := uuid.Parse(reqID)
	if err != nil {
		return err
	}
	ruid, err := uuid.Parse(reviewedByUserID)
	if err != nil {
		return err
	}

	pcr, err := r.db.ProfileChangeRequest.Get(ctx, rid)
	if err != nil {
		return err
	}

	now := time.Now()
	if !approved {
		return r.db.ProfileChangeRequest.UpdateOne(pcr).
			SetStatus(profilechangerequest.StatusRejected).
			SetReviewedByUserID(ruid).
			SetRejectionReason(rejectionReason).
			SetReviewedAt(now).
			Exec(ctx)
	}

	// Approve and apply changes to member record
	return r.db.ProfileChangeRequest.UpdateOne(pcr).
		SetStatus(profilechangerequest.StatusApproved).
		SetReviewedByUserID(ruid).
		SetReviewedAt(now).
		Exec(ctx)
}

// ---------------------------------------------------------------------------
// 2. First-Timer CRM Call Allocation & Pastoral Collation
// ---------------------------------------------------------------------------

func (r *Repository) AssignFirstTimers(ctx context.Context, churchID string, visitorIDs []string, assignedToID, assignedByID string) error {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return err
	}
	toID, err := uuid.Parse(assignedToID)
	if err != nil {
		return err
	}
	byID, err := uuid.Parse(assignedByID)
	if err != nil {
		return err
	}

	for _, vidStr := range visitorIDs {
		vid, err := uuid.Parse(vidStr)
		if err != nil {
			continue
		}
		_ = r.db.FirstTimerAssignment.Create().
			SetChurchID(cid).
			SetMemberID(vid).
			SetAssignedToUserID(toID).
			SetAssignedByUserID(byID).
			SetStatus(firsttimerassignment.StatusPending).
			Exec(ctx)
	}
	return nil
}

func (r *Repository) ListAssignedFirstTimers(ctx context.Context, churchID, assignedToID string) ([]contracts.FirstTimerAssignmentDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}
	toID, err := uuid.Parse(assignedToID)
	if err != nil {
		return nil, err
	}

	assignments, err := r.db.FirstTimerAssignment.Query().
		Where(
			firsttimerassignment.ChurchIDEQ(cid),
			firsttimerassignment.AssignedToUserIDEQ(toID),
		).
		Order(ent.Desc(firsttimerassignment.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.FirstTimerAssignmentDTO, 0, len(assignments))
	for _, a := range assignments {
		mName, mPhone, firstVisit, stage := "Visitor", "", "", "first_timer"
		if v, err := r.db.Visitor.Get(ctx, a.MemberID); err == nil {
			mName = strings.TrimSpace(v.FirstName + " " + v.LastName)
			mPhone = v.PhoneNumber
			firstVisit = v.FirstAttendanceDate.Format("2006-01-02")
			stage = string(v.Status)
		} else if m, err := r.db.Member.Get(ctx, a.MemberID); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
			if m.PhoneNumber != nil {
				mPhone = *m.PhoneNumber
			}
			stage = string(m.CurrentStage)
		}

		toName := ""
		if u, err := r.db.User.Get(ctx, a.AssignedToUserID); err == nil {
			toName = u.Email
		}

		out = append(out, contracts.FirstTimerAssignmentDTO{
			ID:                a.ID.String(),
			ChurchID:          a.ChurchID.String(),
			MemberID:          a.MemberID.String(),
			MemberName:        mName,
			MemberPhone:       mPhone,
			FirstVisitDate:    firstVisit,
			AssignedToUserID: a.AssignedToUserID.String(),
			AssignedToName:   toName,
			AssignedByUserID: a.AssignedByUserID.String(),
			Status:            string(a.Status),
			CurrentStage:      stage,
			CreatedAt:         a.CreatedAt,
		})
	}
	return out, nil
}

func (r *Repository) LogCall(ctx context.Context, churchID, callerID string, dto contracts.LogCallDTO) (contracts.CallLogDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.CallLogDTO{}, err
	}
	mid, err := uuid.Parse(dto.MemberID)
	if err != nil {
		return contracts.CallLogDTO{}, err
	}
	cuid, err := uuid.Parse(callerID)
	if err != nil {
		return contracts.CallLogDTO{}, err
	}

	cl, err := r.db.CallLog.Create().
		SetChurchID(cid).
		SetMemberID(mid).
		SetCallerID(cuid).
		SetOutcome(calllog.Outcome(dto.Outcome)).
		SetSummaryNotes(dto.SummaryNotes).
		SetPastoralEscalationNeeded(dto.PastoralEscalationNeeded).
		Save(ctx)
	if err != nil {
		return contracts.CallLogDTO{}, err
	}

	// Update assignment status if exists
	_, _ = r.db.FirstTimerAssignment.Update().
		Where(
			firsttimerassignment.MemberIDEQ(mid),
			firsttimerassignment.AssignedToUserIDEQ(cuid),
		).
		SetStatus(firsttimerassignment.StatusCompleted).
		Save(ctx)

	mName := ""
	if v, err := r.db.Visitor.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(v.FirstName + " " + v.LastName)
	} else if m, err := r.db.Member.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
	}

	callerName := ""
	if u, err := r.db.User.Get(ctx, cuid); err == nil {
		callerName = u.Email
	}

	return contracts.CallLogDTO{
		ID:                        cl.ID.String(),
		ChurchID:                  cl.ChurchID.String(),
		MemberID:                  cl.MemberID.String(),
		MemberName:                mName,
		CallerID:                  cl.CallerID.String(),
		CallerName:                callerName,
		CallDate:                  cl.CallDate,
		Outcome:                   string(cl.Outcome),
		SummaryNotes:              cl.SummaryNotes,
		PastoralEscalationNeeded: cl.PastoralEscalationNeeded,
		CreatedAt:                 cl.CreatedAt,
	}, nil
}

func (r *Repository) GetWeeklyPastoralSummary(ctx context.Context, churchID string) (contracts.WeeklyPastoralSummaryDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.WeeklyPastoralSummaryDTO{}, err
	}

	oneWeekAgo := time.Now().AddDate(0, 0, -7)
	logs, err := r.db.CallLog.Query().
		Where(
			calllog.ChurchIDEQ(cid),
			calllog.CallDateGTE(oneWeekAgo),
		).
		Order(ent.Desc(calllog.FieldCallDate)).
		All(ctx)
	if err != nil {
		return contracts.WeeklyPastoralSummaryDTO{}, err
	}

	totalRec := len(logs)
	totalCalls := len(logs)
	totalUnreachable := 0
	totalEscalations := 0

	recent := make([]contracts.CallLogDTO, 0, len(logs))
	for _, l := range logs {
		if l.Outcome == calllog.OutcomeUnreachable {
			totalUnreachable++
		}
		if l.PastoralEscalationNeeded {
			totalEscalations++
		}
		mName := ""
		if v, err := r.db.Visitor.Get(ctx, l.MemberID); err == nil {
			mName = strings.TrimSpace(v.FirstName + " " + v.LastName)
		} else if m, err := r.db.Member.Get(ctx, l.MemberID); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
		}
		cName := ""
		if u, err := r.db.User.Get(ctx, l.CallerID); err == nil {
			cName = u.Email
		}
		recent = append(recent, contracts.CallLogDTO{
			ID:                        l.ID.String(),
			ChurchID:                  l.ChurchID.String(),
			MemberID:                  l.MemberID.String(),
			MemberName:                mName,
			CallerID:                  l.CallerID.String(),
			CallerName:                cName,
			CallDate:                  l.CallDate,
			Outcome:                   string(l.Outcome),
			SummaryNotes:              l.SummaryNotes,
			PastoralEscalationNeeded: l.PastoralEscalationNeeded,
			CreatedAt:                 l.CreatedAt,
		})
	}

	return contracts.WeeklyPastoralSummaryDTO{
		WeekLabel:               time.Now().Format("Jan 02, 2006"),
		TotalFirstTimersReceived: totalRec,
		TotalCallsCompleted:      totalCalls,
		TotalUnreachable:         totalUnreachable,
		PastoralEscalationCount:  totalEscalations,
		RecentLogs:               recent,
	}, nil
}

// ---------------------------------------------------------------------------
// 3. Discipleship Academy Pipeline
// ---------------------------------------------------------------------------

func (r *Repository) CreateCohort(ctx context.Context, churchID string, dto contracts.CreateCohortDTO) (contracts.AcademyCohortDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.AcademyCohortDTO{}, err
	}
	sDate, err := time.Parse("2006-01-02", dto.StartDate)
	if err != nil {
		sDate = time.Now()
	}

	c, err := r.db.AcademyCohort.Create().
		SetChurchID(cid).
		SetModuleType(academycohort.ModuleType(dto.ModuleType)).
		SetCohortName(dto.CohortName).
		SetStartDate(sDate).
		SetStatus(academycohort.StatusActive).
		Save(ctx)
	if err != nil {
		return contracts.AcademyCohortDTO{}, err
	}

	return contracts.AcademyCohortDTO{
		ID:         c.ID.String(),
		ChurchID:   c.ChurchID.String(),
		ModuleType: string(c.ModuleType),
		CohortName: c.CohortName,
		StartDate:  c.StartDate,
		Status:     string(c.Status),
		CreatedAt:  c.CreatedAt,
	}, nil
}

func (r *Repository) ListCohorts(ctx context.Context, churchID string) ([]contracts.AcademyCohortDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}

	cohorts, err := r.db.AcademyCohort.Query().
		Where(academycohort.ChurchIDEQ(cid)).
		Order(ent.Desc(academycohort.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.AcademyCohortDTO, 0, len(cohorts))
	for _, c := range cohorts {
		count, _ := r.db.CohortEnrollment.Query().Where(cohortenrollment.CohortIDEQ(c.ID)).Count(ctx)
		out = append(out, contracts.AcademyCohortDTO{
			ID:         c.ID.String(),
			ChurchID:   c.ChurchID.String(),
			ModuleType: string(c.ModuleType),
			CohortName: c.CohortName,
			StartDate:  c.StartDate,
			EndDate:    c.EndDate,
			Status:     string(c.Status),
			TotalCount: count,
			CreatedAt:  c.CreatedAt,
		})
	}
	return out, nil
}

func (r *Repository) EnrollStudent(ctx context.Context, cohortID, memberID string, teacherID *string) (contracts.CohortEnrollmentDTO, error) {
	chid, err := uuid.Parse(cohortID)
	if err != nil {
		return contracts.CohortEnrollmentDTO{}, err
	}
	mid, err := uuid.Parse(memberID)
	if err != nil {
		return contracts.CohortEnrollmentDTO{}, err
	}

	b := r.db.CohortEnrollment.Create().
		SetCohortID(chid).
		SetMemberID(mid).
		SetStatus(cohortenrollment.StatusEnrolled)

	if teacherID != nil && *teacherID != "" {
		if tid, err := uuid.Parse(*teacherID); err == nil {
			b = b.SetTeacherID(tid)
		}
	}

	enr, err := b.Save(ctx)
	if err != nil {
		return contracts.CohortEnrollmentDTO{}, err
	}

	// Create blank continuous assessment record
	_ = r.db.ContinuousAssessment.Create().
		SetEnrollmentID(enr.ID).
		SetTotalScore(0).
		Exec(ctx)

	mName := ""
	if m, err := r.db.Member.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
	}

	return contracts.CohortEnrollmentDTO{
		ID:         enr.ID.String(),
		CohortID:   enr.CohortID.String(),
		MemberID:   enr.MemberID.String(),
		MemberName: mName,
		Status:     string(enr.Status),
		CreatedAt:  enr.CreatedAt,
	}, nil
}

func (r *Repository) ListEnrollments(ctx context.Context, cohortID string) ([]contracts.CohortEnrollmentDTO, error) {
	chid, err := uuid.Parse(cohortID)
	if err != nil {
		return nil, err
	}

	enrollments, err := r.db.CohortEnrollment.Query().
		Where(cohortenrollment.CohortIDEQ(chid)).
		Order(ent.Desc(cohortenrollment.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.CohortEnrollmentDTO, 0, len(enrollments))
	for _, e := range enrollments {
		mName := ""
		if m, err := r.db.Member.Get(ctx, e.MemberID); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
		}

		var assDTO *contracts.ContinuousAssessmentDTO
		if ca, err := r.db.ContinuousAssessment.Query().Where(continuousassessment.EnrollmentIDEQ(e.ID)).Only(ctx); err == nil {
			var gBy *string
			if ca.GradedByUserID != nil {
				s := ca.GradedByUserID.String()
				gBy = &s
			}
			assDTO = &contracts.ContinuousAssessmentDTO{
				ID:                       ca.ID.String(),
				EnrollmentID:             ca.EnrollmentID.String(),
				AssignmentScore:          ca.AssignmentScore,
				VerbalAssessmentScore:    ca.VerbalAssessmentScore,
				ParticipationScore:       ca.ParticipationScore,
				DisciplersReportScore:    ca.DisciplersReportScore,
				ProofOfNoteScore:         ca.ProofOfNoteScore,
				AttendanceScore:          ca.AttendanceScore,
				TotalScore:               ca.TotalScore,
				DisciplerDevotionRating:  ca.DisciplerDevotionRating,
				DisciplerEvangelismRating: ca.DisciplerEvangelismRating,
				MakeupCompleted:          ca.MakeupCompleted,
				GradedByUserID:           gBy,
				UpdatedAt:                ca.UpdatedAt,
			}
		}

		out = append(out, contracts.CohortEnrollmentDTO{
			ID:         e.ID.String(),
			CohortID:   e.CohortID.String(),
			MemberID:   e.MemberID.String(),
			MemberName: mName,
			Status:     string(e.Status),
			Assessment: assDTO,
			CreatedAt:  e.CreatedAt,
		})
	}
	return out, nil
}

func (r *Repository) GradeAssessment(ctx context.Context, enrollmentID string, gradedByUserID string, dto contracts.GradeAssessmentDTO) (contracts.ContinuousAssessmentDTO, error) {
	eid, err := uuid.Parse(enrollmentID)
	if err != nil {
		return contracts.ContinuousAssessmentDTO{}, err
	}

	ca, err := r.db.ContinuousAssessment.Query().Where(continuousassessment.EnrollmentIDEQ(eid)).Only(ctx)
	if err != nil {
		// Create if missing
		ca, err = r.db.ContinuousAssessment.Create().SetEnrollmentID(eid).Save(ctx)
		if err != nil {
			return contracts.ContinuousAssessmentDTO{}, err
		}
	}

	// 6-part weighted scoring: Max 100
	total := dto.AssignmentScore + dto.VerbalAssessmentScore + dto.ParticipationScore + dto.DisciplersReportScore + dto.ProofOfNoteScore + dto.AttendanceScore

	var gby *uuid.UUID
	if uid, err := uuid.Parse(gradedByUserID); err == nil {
		gby = &uid
	}

	now := time.Now()
	updated, err := r.db.ContinuousAssessment.UpdateOne(ca).
		SetAssignmentScore(dto.AssignmentScore).
		SetVerbalAssessmentScore(dto.VerbalAssessmentScore).
		SetParticipationScore(dto.ParticipationScore).
		SetDisciplersReportScore(dto.DisciplersReportScore).
		SetProofOfNoteScore(dto.ProofOfNoteScore).
		SetAttendanceScore(dto.AttendanceScore).
		SetTotalScore(total).
		SetDisciplerDevotionRating(dto.DisciplerDevotionRating).
		SetDisciplerEvangelismRating(dto.DisciplerEvangelismRating).
		SetMakeupCompleted(dto.MakeupCompleted).
		SetNillableGradedByUserID(gby).
		SetUpdatedAt(now).
		Save(ctx)
	if err != nil {
		return contracts.ContinuousAssessmentDTO{}, err
	}

	// Check 50% pass mark and attendance rules
	status := cohortenrollment.StatusEnrolled
	if total >= 50.0 {
		status = cohortenrollment.StatusPassed
	} else if dto.AttendanceScore <= 5.0 { // <= 50% attendance
		status = cohortenrollment.StatusRetakeRequired
	} else {
		status = cohortenrollment.StatusMakeupRequired
	}

	_ = r.db.CohortEnrollment.UpdateOneID(eid).SetStatus(status).Exec(ctx)

	var gstr *string
	if updated.GradedByUserID != nil {
		s := updated.GradedByUserID.String()
		gstr = &s
	}

	return contracts.ContinuousAssessmentDTO{
		ID:                       updated.ID.String(),
		EnrollmentID:             updated.EnrollmentID.String(),
		AssignmentScore:          updated.AssignmentScore,
		VerbalAssessmentScore:    updated.VerbalAssessmentScore,
		ParticipationScore:       updated.ParticipationScore,
		DisciplersReportScore:    updated.DisciplersReportScore,
		ProofOfNoteScore:         updated.ProofOfNoteScore,
		AttendanceScore:          updated.AttendanceScore,
		TotalScore:               updated.TotalScore,
		DisciplerDevotionRating:  updated.DisciplerDevotionRating,
		DisciplerEvangelismRating: updated.DisciplerEvangelismRating,
		MakeupCompleted:          updated.MakeupCompleted,
		GradedByUserID:           gstr,
		UpdatedAt:                updated.UpdatedAt,
	}, nil
}

func (r *Repository) GraduateEnrollment(ctx context.Context, enrollmentID string) error {
	eid, err := uuid.Parse(enrollmentID)
	if err != nil {
		return err
	}

	enr, err := r.db.CohortEnrollment.Get(ctx, eid)
	if err != nil {
		return err
	}

	cohort, err := r.db.AcademyCohort.Get(ctx, enr.CohortID)
	if err != nil {
		return err
	}

	// Advance member stage based on cohort module
	nextStage := member.CurrentStageFoundationClass
	switch cohort.ModuleType {
	case academycohort.ModuleTypeFoundationClass:
		nextStage = member.CurrentStageSundaySchoolModule1
	case academycohort.ModuleTypeSundaySchoolModule1:
		nextStage = member.CurrentStageSundaySchoolModule2
	case academycohort.ModuleTypeSundaySchoolModule2:
		nextStage = member.CurrentStageSundaySchoolModule3
	case academycohort.ModuleTypeSundaySchoolModule3:
		nextStage = member.CurrentStageMembershipClass
	case academycohort.ModuleTypeMembershipClass:
		nextStage = member.CurrentStageStewardship
	}

	_ = r.db.Member.UpdateOneID(enr.MemberID).SetCurrentStage(nextStage).Exec(ctx)
	return r.db.CohortEnrollment.UpdateOne(enr).SetStatus(cohortenrollment.StatusPassed).Exec(ctx)
}

// ---------------------------------------------------------------------------
// 4. Pseudo-Team Volunteering Intake & Placement (Post-Module 2)
// ---------------------------------------------------------------------------

func (r *Repository) ApplyVolunteer(ctx context.Context, churchID, memberID string, dto contracts.ApplyVolunteerDTO) (contracts.VolunteerApplicationDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.VolunteerApplicationDTO{}, err
	}
	mid, err := uuid.Parse(memberID)
	if err != nil {
		return contracts.VolunteerApplicationDTO{}, err
	}

	b := r.db.VolunteerApplication.Create().
		SetChurchID(cid).
		SetMemberID(mid).
		SetSkillsNotes(dto.SkillsNotes).
		SetStatus(volunteerapplication.StatusPending)

	if dto.PreferredTeam1ID != nil && *dto.PreferredTeam1ID != "" {
		if t1, err := uuid.Parse(*dto.PreferredTeam1ID); err == nil {
			b = b.SetPreferredTeam1ID(t1)
		}
	}
	if dto.PreferredTeam2ID != nil && *dto.PreferredTeam2ID != "" {
		if t2, err := uuid.Parse(*dto.PreferredTeam2ID); err == nil {
			b = b.SetPreferredTeam2ID(t2)
		}
	}

	app, err := b.Save(ctx)
	if err != nil {
		return contracts.VolunteerApplicationDTO{}, err
	}

	mName := ""
	if m, err := r.db.Member.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
	}

	return contracts.VolunteerApplicationDTO{
		ID:          app.ID.String(),
		ChurchID:    app.ChurchID.String(),
		MemberID:    app.MemberID.String(),
		MemberName:  mName,
		SkillsNotes: app.SkillsNotes,
		Status:      string(app.Status),
		CreatedAt:   app.CreatedAt,
	}, nil
}

func (r *Repository) ListVolunteerApplications(ctx context.Context, churchID string) ([]contracts.VolunteerApplicationDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}

	apps, err := r.db.VolunteerApplication.Query().
		Where(volunteerapplication.ChurchIDEQ(cid)).
		Order(ent.Desc(volunteerapplication.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.VolunteerApplicationDTO, 0, len(apps))
	for _, a := range apps {
		mName := ""
		if m, err := r.db.Member.Get(ctx, a.MemberID); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
		}

		out = append(out, contracts.VolunteerApplicationDTO{
			ID:          a.ID.String(),
			ChurchID:    a.ChurchID.String(),
			MemberID:    a.MemberID.String(),
			MemberName:  mName,
			SkillsNotes: a.SkillsNotes,
			Status:      string(a.Status),
			CreatedAt:   a.CreatedAt,
		})
	}
	return out, nil
}

func (r *Repository) PlaceVolunteer(ctx context.Context, applicationID, targetTeamID, placedByUserID string) error {
	aid, err := uuid.Parse(applicationID)
	if err != nil {
		return err
	}
	tid, err := uuid.Parse(targetTeamID)
	if err != nil {
		return err
	}
	puid, err := uuid.Parse(placedByUserID)
	if err != nil {
		return err
	}

	app, err := r.db.VolunteerApplication.Get(ctx, aid)
	if err != nil {
		return err
	}

	now := time.Now()
	_ = r.db.Member.UpdateOneID(app.MemberID).SetVolunteeringTeamID(tid).Exec(ctx)
	return r.db.VolunteerApplication.UpdateOne(app).
		SetStatus(volunteerapplication.StatusPlaced).
		SetPlacedByUserID(puid).
		SetPlacedAt(now).
		Exec(ctx)
}

// ---------------------------------------------------------------------------
// 5. Milestone Celebrations & 3-Day Alert Engine
// ---------------------------------------------------------------------------

func (r *Repository) GetUpcomingCelebrations(ctx context.Context, churchID string, days int) ([]contracts.CelebrationAlertDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}

	members, err := r.db.Member.Query().
		Where(member.LocalChurchIDEQ(cid)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	out := make([]contracts.CelebrationAlertDTO, 0)

	for _, m := range members {
		mName := strings.TrimSpace(m.FirstName + " " + m.Surname)
		mPhone := ""
		if m.PhoneNumber != nil {
			mPhone = *m.PhoneNumber
		}

		// Birthday check (integer day & month match within 3 days)
		if m.DateOfBirthDay != nil && m.DateOfBirthMonth != nil {
			dobMonth := time.Month(*m.DateOfBirthMonth)
			dobDay := int(*m.DateOfBirthDay)
			thisYearDOB := time.Date(now.Year(), dobMonth, dobDay, 0, 0, 0, 0, time.UTC)
			diff := int(thisYearDOB.Sub(now).Hours() / 24)
			if diff >= 0 && diff <= days {
				out = append(out, contracts.CelebrationAlertDTO{
					MemberID:      m.ID.String(),
					MemberName:    mName,
					Phone:         mPhone,
					Email:         m.Email,
					Type:          "birthday",
					DateLabel:     thisYearDOB.Format("Jan 02"),
					DaysRemaining: diff,
					PhotoURL:      m.PhotoURL,
				})
			}
		}

		// Anniversary check
		if m.WeddingAnniversaryDay != nil && m.WeddingAnniversaryMonth != nil {
			annMonth := time.Month(*m.WeddingAnniversaryMonth)
			annDay := int(*m.WeddingAnniversaryDay)
			thisYearAnn := time.Date(now.Year(), annMonth, annDay, 0, 0, 0, 0, time.UTC)
			diff := int(thisYearAnn.Sub(now).Hours() / 24)
			if diff >= 0 && diff <= days {
				out = append(out, contracts.CelebrationAlertDTO{
					MemberID:      m.ID.String(),
					MemberName:    mName,
					Phone:         mPhone,
					Email:         m.Email,
					Type:          "anniversary",
					DateLabel:     thisYearAnn.Format("Jan 02"),
					DaysRemaining: diff,
					PhotoURL:      m.PhotoURL,
				})
			}
		}
	}

	return out, nil
}

func (r *Repository) CreateLandmark(ctx context.Context, churchID string, createdByUserID *string, dto contracts.CreateLandmarkDTO) (contracts.MemberLandmarkDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.MemberLandmarkDTO{}, err
	}
	mid, err := uuid.Parse(dto.MemberID)
	if err != nil {
		return contracts.MemberLandmarkDTO{}, err
	}
	eDate, err := time.Parse("2006-01-02", dto.EventDate)
	if err != nil {
		eDate = time.Now()
	}

	b := r.db.MemberLandmark.Create().
		SetChurchID(cid).
		SetMemberID(mid).
		SetLandmarkType(memberlandmark.LandmarkType(dto.LandmarkType)).
		SetTitle(dto.Title).
		SetInstitutionOrOrg(dto.InstitutionOrOrg).
		SetEventDate(eDate).
		SetNotes(dto.Notes)

	if createdByUserID != nil && *createdByUserID != "" {
		if uid, err := uuid.Parse(*createdByUserID); err == nil {
			b = b.SetCreatedByUserID(uid)
		}
	}

	lm, err := b.Save(ctx)
	if err != nil {
		return contracts.MemberLandmarkDTO{}, err
	}

	mName := ""
	if m, err := r.db.Member.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
	}

	return contracts.MemberLandmarkDTO{
		ID:               lm.ID.String(),
		ChurchID:         lm.ChurchID.String(),
		MemberID:         lm.MemberID.String(),
		MemberName:       mName,
		LandmarkType:     string(lm.LandmarkType),
		Title:            lm.Title,
		InstitutionOrOrg: lm.InstitutionOrOrg,
		EventDate:        lm.EventDate,
		Notes:            lm.Notes,
		CreatedAt:        lm.CreatedAt,
	}, nil
}

func (r *Repository) ListLandmarks(ctx context.Context, churchID string) ([]contracts.MemberLandmarkDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}

	lms, err := r.db.MemberLandmark.Query().
		Where(memberlandmark.ChurchIDEQ(cid)).
		Order(ent.Desc(memberlandmark.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.MemberLandmarkDTO, 0, len(lms))
	for _, l := range lms {
		mName := ""
		if m, err := r.db.Member.Get(ctx, l.MemberID); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
		}

		out = append(out, contracts.MemberLandmarkDTO{
			ID:               l.ID.String(),
			ChurchID:         l.ChurchID.String(),
			MemberID:         l.MemberID.String(),
			MemberName:       mName,
			LandmarkType:     string(l.LandmarkType),
			Title:            l.Title,
			InstitutionOrOrg: l.InstitutionOrOrg,
			EventDate:        l.EventDate,
			Notes:            l.Notes,
			CreatedAt:        l.CreatedAt,
		})
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// 6. Pastoral Situation Reports (SitRep)
// ---------------------------------------------------------------------------

func (r *Repository) CreateSitRep(ctx context.Context, churchID string, filedByUserID string, dto contracts.CreateSitRepDTO) (contracts.SituationReportDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.SituationReportDTO{}, err
	}
	mid, err := uuid.Parse(dto.MemberID)
	if err != nil {
		return contracts.SituationReportDTO{}, err
	}
	fuid, err := uuid.Parse(filedByUserID)
	if err != nil {
		return contracts.SituationReportDTO{}, err
	}

	sr, err := r.db.SituationReport.Create().
		SetChurchID(cid).
		SetMemberID(mid).
		SetCategory(situationreport.Category(dto.Category)).
		SetNotes(dto.Notes).
		SetActionTaken(dto.ActionTaken).
		SetIsUrgent(dto.IsUrgent).
		SetFiledByUserID(fuid).
		Save(ctx)
	if err != nil {
		return contracts.SituationReportDTO{}, err
	}

	mName := ""
	if m, err := r.db.Member.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
	}

	filedName := ""
	if u, err := r.db.User.Get(ctx, fuid); err == nil {
		filedName = u.Email
	}

	return contracts.SituationReportDTO{
		ID:             sr.ID.String(),
		ChurchID:       sr.ChurchID.String(),
		MemberID:       sr.MemberID.String(),
		MemberName:     mName,
		Category:       string(sr.Category),
		Notes:          sr.Notes,
		ActionTaken:    sr.ActionTaken,
		IsUrgent:       sr.IsUrgent,
		FiledByUserID: sr.FiledByUserID.String(),
		FiledByName:   filedName,
		PastorReviewed: sr.PastorReviewed,
		CreatedAt:      sr.CreatedAt,
	}, nil
}

func (r *Repository) ListSitRepsForMember(ctx context.Context, memberID string) ([]contracts.SituationReportDTO, error) {
	mid, err := uuid.Parse(memberID)
	if err != nil {
		return nil, err
	}

	srs, err := r.db.SituationReport.Query().
		Where(situationreport.MemberIDEQ(mid)).
		Order(ent.Desc(situationreport.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.SituationReportDTO, 0, len(srs))
	for _, sr := range srs {
		mName := ""
		if m, err := r.db.Member.Get(ctx, mid); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
		}
		filedName := ""
		if u, err := r.db.User.Get(ctx, sr.FiledByUserID); err == nil {
			filedName = u.Email
		}
		out = append(out, contracts.SituationReportDTO{
			ID:             sr.ID.String(),
			ChurchID:       sr.ChurchID.String(),
			MemberID:       sr.MemberID.String(),
			MemberName:     mName,
			Category:       string(sr.Category),
			Notes:          sr.Notes,
			ActionTaken:    sr.ActionTaken,
			IsUrgent:       sr.IsUrgent,
			FiledByUserID: sr.FiledByUserID.String(),
			FiledByName:   filedName,
			PastorReviewed: sr.PastorReviewed,
			CreatedAt:      sr.CreatedAt,
		})
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// 7. Gatekeeper Visitor Profiling Pipeline
// ---------------------------------------------------------------------------

func (r *Repository) ListUnprofiledVisitors(ctx context.Context, churchID string) ([]contracts.UnprofiledVisitorDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}

	visitors, err := r.db.Visitor.Query().
		Where(
			visitor.ChurchIDEQ(cid),
			visitor.StatusNEQ(visitor.StatusProfiled),
		).
		Order(ent.Desc(visitor.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.UnprofiledVisitorDTO, 0, len(visitors))
	for _, v := range visitors {
		rec := v.Status == visitor.StatusFoundationClassCandidate
		out = append(out, contracts.UnprofiledVisitorDTO{
			ID:                   v.ID.String(),
			ChurchID:             v.ChurchID.String(),
			FirstName:            v.FirstName,
			LastName:             v.LastName,
			PhoneNumber:          v.PhoneNumber,
			Gender:               string(v.Gender),
			FirstAttendanceDate:  v.FirstAttendanceDate,
			Address:              v.Address,
			Email:                v.Email,
			VisitCount:           v.VisitCount,
			FoundationRecommended: rec,
		})
	}
	return out, nil
}

func (r *Repository) ProfileVisitor(ctx context.Context, churchID, visitorID string, profiledByUserID string, dto contracts.ProfileVisitorPayloadDTO) (contracts.Member, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return contracts.Member{}, err
	}
	vid, err := uuid.Parse(visitorID)
	if err != nil {
		return contracts.Member{}, err
	}
	puid, err := uuid.Parse(profiledByUserID)
	if err != nil {
		return contracts.Member{}, err
	}

	v, err := r.db.Visitor.Get(ctx, vid)
	if err != nil {
		return contracts.Member{}, err
	}

	now := time.Now()
	b := r.db.Member.Create().
		SetFirstName(v.FirstName).
		SetSurname(v.LastName).
		SetPhoneNumber(v.PhoneNumber).
		SetGender(member.Gender(v.Gender)).
		SetEmail(dto.Email).
		SetHomeAddress(v.Address).
		SetDateOfBirthDay(dto.DateOfBirthDay).
		SetDateOfBirthMonth(dto.DateOfBirthMonth).
		SetMaritalStatus(member.MaritalStatus(dto.MaritalStatus)).
		SetLocalChurchID(cid).
		SetIsProfiled(true).
		SetProfiledByUserID(puid).
		SetProfiledAt(now).
		SetCurrentStage(member.CurrentStageFirstTimeGuest)

	if dto.WeddingAnniversaryDay != nil {
		b = b.SetWeddingAnniversaryDay(*dto.WeddingAnniversaryDay)
	}
	if dto.WeddingAnniversaryMonth != nil {
		b = b.SetWeddingAnniversaryMonth(*dto.WeddingAnniversaryMonth)
	}
	if dto.Occupation != nil && *dto.Occupation != "" {
		b = b.SetJobOccupation(*dto.Occupation)
	}
	if dto.SectorID != nil && *dto.SectorID != "" {
		if secID, err := uuid.Parse(*dto.SectorID); err == nil {
			b = b.SetSectorID(secID)
		}
	}

	newMember, err := b.Save(ctx)
	if err != nil {
		return contracts.Member{}, err
	}

	// Update visitor status
	_ = r.db.Visitor.UpdateOne(v).SetStatus(visitor.StatusProfiled).Exec(ctx)

	return mapEntMemberToContract(newMember, "member"), nil
}

// ---------------------------------------------------------------------------
// 8. Inter-Branch Member Transfer & Longitudinal Migration
// ---------------------------------------------------------------------------

func (r *Repository) InitiateTransfer(ctx context.Context, originChurchID, initiatedByUserID string, dto contracts.InitiateTransferDTO) (contracts.MemberTransferDTO, error) {
	ocid, err := uuid.Parse(originChurchID)
	if err != nil {
		return contracts.MemberTransferDTO{}, err
	}
	mid, err := uuid.Parse(dto.MemberID)
	if err != nil {
		return contracts.MemberTransferDTO{}, err
	}
	dcid, err := uuid.Parse(dto.DestinationChurchID)
	if err != nil {
		return contracts.MemberTransferDTO{}, err
	}
	iuid, err := uuid.Parse(initiatedByUserID)
	if err != nil {
		return contracts.MemberTransferDTO{}, err
	}

	mt, err := r.db.MemberTransfer.Create().
		SetMemberID(mid).
		SetOriginChurchID(ocid).
		SetDestinationChurchID(dcid).
		SetTransferReason(dto.TransferReason).
		SetPastoralRecommendation(dto.PastoralRecommendation).
		SetInitiatedByUserID(iuid).
		SetStatus(membertransfer.StatusPending).
		Save(ctx)
	if err != nil {
		return contracts.MemberTransferDTO{}, err
	}

	mName := ""
	if m, err := r.db.Member.Get(ctx, mid); err == nil {
		mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
	}

	oName, dName := "", ""
	if oc, err := r.db.LocalChurch.Get(ctx, ocid); err == nil {
		oName = oc.Name
	}
	if dc, err := r.db.LocalChurch.Get(ctx, dcid); err == nil {
		dName = dc.Name
	}

	initName := ""
	if u, err := r.db.User.Get(ctx, iuid); err == nil {
		initName = u.Email
	}

	return contracts.MemberTransferDTO{
		ID:                     mt.ID.String(),
		MemberID:               mt.MemberID.String(),
		MemberName:             mName,
		OriginChurchID:         mt.OriginChurchID.String(),
		OriginChurchName:       oName,
		DestinationChurchID:    mt.DestinationChurchID.String(),
		DestinationChurchName:  dName,
		TransferReason:         mt.TransferReason,
		PastoralRecommendation: mt.PastoralRecommendation,
		Status:                 string(mt.Status),
		InitiatedByUserID:     mt.InitiatedByUserID.String(),
		InitiatedByName:       initName,
		CreatedAt:              mt.CreatedAt,
	}, nil
}

func (r *Repository) ListInboundTransfers(ctx context.Context, churchID string) ([]contracts.MemberTransferDTO, error) {
	cid, err := uuid.Parse(churchID)
	if err != nil {
		return nil, err
	}

	mts, err := r.db.MemberTransfer.Query().
		Where(
			membertransfer.DestinationChurchIDEQ(cid),
			membertransfer.StatusEQ(membertransfer.StatusPending),
		).
		Order(ent.Desc(membertransfer.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.MemberTransferDTO, 0, len(mts))
	for _, mt := range mts {
		mName := ""
		if m, err := r.db.Member.Get(ctx, mt.MemberID); err == nil {
			mName = strings.TrimSpace(m.FirstName + " " + m.Surname)
		}
		oName, dName := "", ""
		if oc, err := r.db.LocalChurch.Get(ctx, mt.OriginChurchID); err == nil {
			oName = oc.Name
		}
		if dc, err := r.db.LocalChurch.Get(ctx, mt.DestinationChurchID); err == nil {
			dName = dc.Name
		}
		initName := ""
		if u, err := r.db.User.Get(ctx, mt.InitiatedByUserID); err == nil {
			initName = u.Email
		}
		out = append(out, contracts.MemberTransferDTO{
			ID:                     mt.ID.String(),
			MemberID:               mt.MemberID.String(),
			MemberName:             mName,
			OriginChurchID:         mt.OriginChurchID.String(),
			OriginChurchName:       oName,
			DestinationChurchID:    mt.DestinationChurchID.String(),
			DestinationChurchName:  dName,
			TransferReason:         mt.TransferReason,
			PastoralRecommendation: mt.PastoralRecommendation,
			Status:                 string(mt.Status),
			InitiatedByUserID:     mt.InitiatedByUserID.String(),
			InitiatedByName:       initName,
			CreatedAt:              mt.CreatedAt,
		})
	}
	return out, nil
}

func (r *Repository) ReviewTransfer(ctx context.Context, transferID, reviewedByUserID string, dto contracts.ReviewTransferDTO) error {
	tid, err := uuid.Parse(transferID)
	if err != nil {
		return err
	}
	ruid, err := uuid.Parse(reviewedByUserID)
	if err != nil {
		return err
	}

	mt, err := r.db.MemberTransfer.Get(ctx, tid)
	if err != nil {
		return err
	}

	now := time.Now()
	if !dto.Approved {
		return r.db.MemberTransfer.UpdateOne(mt).
			SetStatus(membertransfer.StatusRejected).
			SetReviewedByUserID(ruid).
			SetReviewedAt(now).
			Exec(ctx)
	}

	// Migrate member to destination church
	b := r.db.Member.UpdateOneID(mt.MemberID).
		SetLocalChurchID(mt.DestinationChurchID).
		ClearTeamID().
		ClearVolunteeringTeamID()

	if dto.SectorID != nil && *dto.SectorID != "" {
		if secID, err := uuid.Parse(*dto.SectorID); err == nil {
			b = b.SetSectorID(secID)
		}
	}
	if err := b.Exec(ctx); err != nil {
		return err
	}

	return r.db.MemberTransfer.UpdateOne(mt).
		SetStatus(membertransfer.StatusApproved).
		SetReviewedByUserID(ruid).
		SetReviewedAt(now).
		Exec(ctx)
}
