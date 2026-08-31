package infocenter

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/attendancerecord"
	"github.com/hofchurchng/church-backend/internal/ent/churchsetting"
	"github.com/hofchurchng/church-backend/internal/ent/visitor"
)

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

func mapVisitorToDTO(v *ent.Visitor) contracts.VisitorDTO {
	var email *string
	if v.Email != nil {
		email = v.Email
	}

	var invitedByMemberID *string
	if v.InvitedByMemberID != nil {
		id := v.InvitedByMemberID.String()
		invitedByMemberID = &id
	}

	var invitedByText *string
	if v.InvitedByText != nil {
		invitedByText = v.InvitedByText
	}

	var profiledMemberID *string
	if v.ProfiledMemberID != nil {
		id := v.ProfiledMemberID.String()
		profiledMemberID = &id
	}

	return contracts.VisitorDTO{
		ID:                  v.ID.String(),
		ChurchID:            v.ChurchID.String(),
		FirstName:           v.FirstName,
		LastName:            v.LastName,
		PhoneNumber:         v.PhoneNumber,
		Gender:              string(v.Gender),
		Email:               email,
		Address:             v.Address,
		FirstAttendanceDate: v.FirstAttendanceDate,
		PrayerRequest:       v.PrayerRequest,
		InvitedByMemberID:   invitedByMemberID,
		InvitedByText:       invitedByText,
		VisitCount:          v.VisitCount,
		LastAttendedDate:    v.LastAttendedDate,
		Status:              contracts.VisitorStatus(string(v.Status)),
		Notes:               v.Notes,
		CreatedBy:           v.CreatedBy.String(),
		ProfiledMemberID:    profiledMemberID,
		CreatedAt:           v.CreatedAt,
		UpdatedAt:           v.UpdatedAt,
	}
}

func mapAttendanceToDTO(a *ent.AttendanceRecord) contracts.AttendanceRecordDTO {
	return contracts.AttendanceRecordDTO{
		ID:          a.ID.String(),
		ChurchID:    a.ChurchID.String(),
		VisitorID:   a.VisitorID.String(),
		ServiceDate: a.ServiceDate,
		ServiceType: a.ServiceType,
		RecordedBy:  a.RecordedBy.String(),
		CreatedAt:   a.CreatedAt,
	}
}

func mapSettingToDTO(s *ent.ChurchSetting) contracts.ChurchSettingDTO {
	return contracts.ChurchSettingDTO{
		ID:                           s.ID.String(),
		ChurchID:                     s.ChurchID.String(),
		FoundationClassMinAttendance: s.FoundationClassMinAttendance,
	}
}

func mapTodoToDTO(t *ent.TeamTodo) contracts.TeamTodoDTO {
	var completedBy *string
	if t.CompletedBy != nil {
		id := t.CompletedBy.String()
		completedBy = &id
	}

	return contracts.TeamTodoDTO{
		ID:          t.ID.String(),
		ChurchID:    t.ChurchID.String(),
		TargetTeam:  t.TargetTeam,
		Title:       t.Title,
		Description: t.Description,
		EntityType:  t.EntityType,
		EntityID:    t.EntityID.String(),
		Status:      string(t.Status),
		CreatedBy:   t.CreatedBy.String(),
		CompletedBy: completedBy,
		CreatedAt:   t.CreatedAt,
		CompletedAt: t.CompletedAt,
	}
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

// GetUserChurchID looks up the church_id for a user from the users table.
func (r *Repository) GetUserChurchID(ctx context.Context, userID string) (uuid.UUID, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user id: %w", err)
	}
	u, err := r.db.User.Get(ctx, uid)
	if err != nil {
		return uuid.Nil, fmt.Errorf("user not found: %w", err)
	}
	if u.ChurchID == nil {
		return uuid.Nil, fmt.Errorf("user has no church assigned")
	}
	return *u.ChurchID, nil
}

// ---------------------------------------------------------------------------
// Visitor CRUD
// ---------------------------------------------------------------------------

func (r *Repository) CreateVisitor(ctx context.Context, input contracts.CreateVisitorDTO, churchID uuid.UUID, createdBy uuid.UUID) (contracts.VisitorDTO, error) {
	builder := r.db.Visitor.Create().
		SetChurchID(churchID).
		SetFirstName(input.FirstName).
		SetLastName(input.LastName).
		SetPhoneNumber(input.PhoneNumber).
		SetGender(visitor.Gender(input.Gender)).
		SetAddress(input.Address).
		SetCreatedBy(createdBy).
		SetNillableEmail(input.Email).
		SetNillablePrayerRequest(input.PrayerRequest).
		SetNillableInvitedByText(input.InvitedByText).
		SetNillableNotes(input.Notes)

	if input.InvitedByMemberID != nil && *input.InvitedByMemberID != "" {
		mid, err := uuid.Parse(*input.InvitedByMemberID)
		if err == nil {
			builder.SetInvitedByMemberID(mid)
		}
	}

	v, err := builder.Save(ctx)
	if err != nil {
		return contracts.VisitorDTO{}, err
	}
	return mapVisitorToDTO(v), nil
}

func (r *Repository) GetVisitorByID(ctx context.Context, id string) (contracts.VisitorDTO, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.VisitorDTO{}, err
	}
	v, err := r.db.Visitor.Get(ctx, uid)
	if err != nil {
		return contracts.VisitorDTO{}, err
	}
	return mapVisitorToDTO(v), nil
}

func (r *Repository) ListVisitors(ctx context.Context, filter contracts.VisitorFilter) ([]contracts.VisitorDTO, error) {
	query := r.db.Visitor.Query()

	if filter.ChurchID != "" {
		cid, err := uuid.Parse(filter.ChurchID)
		if err == nil {
			query.Where(visitor.ChurchIDEQ(cid))
		}
	}

	if filter.Status != nil && *filter.Status != "" {
		query.Where(visitor.StatusEQ(visitor.Status(string(*filter.Status))))
	}

	if filter.Query != "" {
		query.Where(
			visitor.Or(
				visitor.FirstNameContainsFold(filter.Query),
				visitor.LastNameContainsFold(filter.Query),
				visitor.PhoneNumberContainsFold(filter.Query),
			),
		)
	}

	visitors, err := query.Order(ent.Desc(visitor.FieldCreatedAt)).All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.VisitorDTO, 0, len(visitors))
	for _, v := range visitors {
		out = append(out, mapVisitorToDTO(v))
	}
	return out, nil
}

func (r *Repository) UpdateVisitor(ctx context.Context, id string, input contracts.UpdateVisitorDTO) (contracts.VisitorDTO, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.VisitorDTO{}, err
	}

	updater := r.db.Visitor.UpdateOneID(uid)

	if input.FirstName != nil {
		updater.SetFirstName(*input.FirstName)
	}
	if input.LastName != nil {
		updater.SetLastName(*input.LastName)
	}
	if input.PhoneNumber != nil {
		updater.SetPhoneNumber(*input.PhoneNumber)
	}
	if input.Gender != nil {
		updater.SetGender(visitor.Gender(*input.Gender))
	}
	if input.Email != nil {
		updater.SetEmail(*input.Email)
	}
	if input.Address != nil {
		updater.SetAddress(*input.Address)
	}
	if input.PrayerRequest != nil {
		updater.SetPrayerRequest(*input.PrayerRequest)
	}
	if input.Notes != nil {
		updater.SetNotes(*input.Notes)
	}

	v, err := updater.Save(ctx)
	if err != nil {
		return contracts.VisitorDTO{}, err
	}
	return mapVisitorToDTO(v), nil
}

func (r *Repository) CheckPhone(ctx context.Context, churchID uuid.UUID, phone string) (*contracts.VisitorDTO, error) {
	v, err := r.db.Visitor.Query().
		Where(
			visitor.ChurchIDEQ(churchID),
			visitor.PhoneNumberEQ(phone),
		).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	dto := mapVisitorToDTO(v)
	return &dto, nil
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

func (r *Repository) MarkAttendance(ctx context.Context, churchID uuid.UUID, visitorID uuid.UUID, serviceDate time.Time, serviceType *string, recordedBy uuid.UUID) (contracts.AttendanceRecordDTO, error) {
	// Check for duplicate attendance on the same date
	exists, err := r.db.AttendanceRecord.Query().
		Where(
			attendancerecord.VisitorIDEQ(visitorID),
			attendancerecord.ServiceDateEQ(serviceDate),
		).
		Exist(ctx)
	if err != nil {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("checking existing attendance: %w", err)
	}
	if exists {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("visitor already marked present for this date")
	}

	// Use a transaction to atomically create the record and update visitor
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("starting transaction: %w", err)
	}

	// Create attendance record
	record, err := tx.AttendanceRecord.Create().
		SetChurchID(churchID).
		SetVisitorID(visitorID).
		SetServiceDate(serviceDate).
		SetNillableServiceType(serviceType).
		SetRecordedBy(recordedBy).
		Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("creating attendance record: %w", err)
	}

	// Get current visitor to check visit count before increment
	currentVisitor, err := tx.Visitor.Get(ctx, visitorID)
	if err != nil {
		_ = tx.Rollback()
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("fetching visitor: %w", err)
	}

	// Increment visit count and update last attended date
	updater := tx.Visitor.UpdateOneID(visitorID).
		AddVisitCount(1).
		SetLastAttendedDate(serviceDate)

	// If visit count was 1 (first timer visited once), update status to returning visitor
	if currentVisitor.VisitCount == 1 && currentVisitor.Status == visitor.StatusFirstTimer {
		updater.SetStatus(visitor.StatusReturningVisitor)
	}

	_, err = updater.Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("updating visitor: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("committing transaction: %w", err)
	}

	return mapAttendanceToDTO(record), nil
}

func (r *Repository) GetVisitorAttendance(ctx context.Context, visitorID string) ([]contracts.AttendanceRecordDTO, error) {
	vid, err := uuid.Parse(visitorID)
	if err != nil {
		return nil, err
	}

	records, err := r.db.AttendanceRecord.Query().
		Where(attendancerecord.VisitorIDEQ(vid)).
		Order(ent.Desc(attendancerecord.FieldServiceDate)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.AttendanceRecordDTO, 0, len(records))
	for _, a := range records {
		out = append(out, mapAttendanceToDTO(a))
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Foundation class candidates
// ---------------------------------------------------------------------------

func (r *Repository) GetFoundationCandidates(ctx context.Context, churchID uuid.UUID, minAttendance int) ([]contracts.VisitorDTO, error) {
	visitors, err := r.db.Visitor.Query().
		Where(
			visitor.ChurchIDEQ(churchID),
			visitor.VisitCountGTE(minAttendance),
			visitor.StatusNotIn(
				visitor.StatusFoundationClassCandidate,
				visitor.StatusProfiled,
			),
		).
		Order(ent.Desc(visitor.FieldVisitCount)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.VisitorDTO, 0, len(visitors))
	for _, v := range visitors {
		out = append(out, mapVisitorToDTO(v))
	}
	return out, nil
}

func (r *Repository) RecommendForFoundationClass(ctx context.Context, visitorID uuid.UUID, churchID uuid.UUID, createdBy uuid.UUID, notes *string) (contracts.TeamTodoDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return contracts.TeamTodoDTO{}, fmt.Errorf("starting transaction: %w", err)
	}

	// Update visitor status to foundation_class_candidate
	v, err := tx.Visitor.UpdateOneID(visitorID).
		SetStatus(visitor.StatusFoundationClassCandidate).
		Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		return contracts.TeamTodoDTO{}, fmt.Errorf("updating visitor status: %w", err)
	}

	// Build todo description
	desc := fmt.Sprintf("Visitor %s %s has been recommended for foundation class.", v.FirstName, v.LastName)
	if notes != nil && *notes != "" {
		desc += " Notes: " + *notes
	}

	// Create team todo for membership team
	todo, err := tx.TeamTodo.Create().
		SetChurchID(churchID).
		SetTargetTeam("membership").
		SetTitle(fmt.Sprintf("Foundation class recommendation: %s %s", v.FirstName, v.LastName)).
		SetDescription(desc).
		SetEntityType("visitor").
		SetEntityID(visitorID).
		SetCreatedBy(createdBy).
		Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		return contracts.TeamTodoDTO{}, fmt.Errorf("creating team todo: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return contracts.TeamTodoDTO{}, fmt.Errorf("committing transaction: %w", err)
	}

	return mapTodoToDTO(todo), nil
}

// ---------------------------------------------------------------------------
// Profiling pipeline
// ---------------------------------------------------------------------------

func (r *Repository) MarkVisitorProfiled(ctx context.Context, visitorID string, memberID string) error {
	vid, err := uuid.Parse(visitorID)
	if err != nil {
		return fmt.Errorf("invalid visitor ID: %w", err)
	}
	mid, err := uuid.Parse(memberID)
	if err != nil {
		return fmt.Errorf("invalid member ID: %w", err)
	}

	_, err = r.db.Visitor.UpdateOneID(vid).
		SetStatus(visitor.StatusProfiled).
		SetProfiledMemberID(mid).
		Save(ctx)
	return err
}

// ---------------------------------------------------------------------------
// Church Settings
// ---------------------------------------------------------------------------

func (r *Repository) GetOrCreateSettings(ctx context.Context, churchID uuid.UUID) (contracts.ChurchSettingDTO, error) {
	// Try to find existing settings
	s, err := r.db.ChurchSetting.Query().
		Where(churchsetting.ChurchIDEQ(churchID)).
		Only(ctx)
	if err != nil {
		if !ent.IsNotFound(err) {
			return contracts.ChurchSettingDTO{}, err
		}
		// Create default settings
		s, err = r.db.ChurchSetting.Create().
			SetChurchID(churchID).
			Save(ctx)
		if err != nil {
			return contracts.ChurchSettingDTO{}, fmt.Errorf("creating default settings: %w", err)
		}
	}
	return mapSettingToDTO(s), nil
}

func (r *Repository) UpdateSettings(ctx context.Context, churchID uuid.UUID, input contracts.UpdateChurchSettingDTO) (contracts.ChurchSettingDTO, error) {
	// Ensure settings exist first
	s, err := r.db.ChurchSetting.Query().
		Where(churchsetting.ChurchIDEQ(churchID)).
		Only(ctx)
	if err != nil {
		if !ent.IsNotFound(err) {
			return contracts.ChurchSettingDTO{}, err
		}
		// Create with the provided value
		builder := r.db.ChurchSetting.Create().SetChurchID(churchID)
		if input.FoundationClassMinAttendance != nil {
			builder.SetFoundationClassMinAttendance(*input.FoundationClassMinAttendance)
		}
		s, err = builder.Save(ctx)
		if err != nil {
			return contracts.ChurchSettingDTO{}, fmt.Errorf("creating settings: %w", err)
		}
		return mapSettingToDTO(s), nil
	}

	updater := s.Update()
	if input.FoundationClassMinAttendance != nil {
		updater.SetFoundationClassMinAttendance(*input.FoundationClassMinAttendance)
	}

	s, err = updater.Save(ctx)
	if err != nil {
		return contracts.ChurchSettingDTO{}, err
	}
	return mapSettingToDTO(s), nil
}
