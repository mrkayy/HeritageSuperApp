package infocenter

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ---------------------------------------------------------------------------
// InfoCenterReader interface implementation
// ---------------------------------------------------------------------------

func (s *Service) GetVisitor(ctx context.Context, id string) (contracts.VisitorDTO, error) {
	if id == "" {
		return contracts.VisitorDTO{}, errors.New("id is required")
	}
	return s.repo.GetVisitorByID(ctx, id)
}

func (s *Service) ListVisitors(ctx context.Context, filter contracts.VisitorFilter) ([]contracts.VisitorDTO, error) {
	return s.repo.ListVisitors(ctx, filter)
}

// ---------------------------------------------------------------------------
// Visitor CRUD
// ---------------------------------------------------------------------------

func (s *Service) CreateVisitor(ctx context.Context, input contracts.CreateVisitorDTO, userID string) (contracts.VisitorDTO, error) {
	if input.FirstName == "" {
		return contracts.VisitorDTO{}, errors.New("first_name is required")
	}
	if input.LastName == "" {
		return contracts.VisitorDTO{}, errors.New("last_name is required")
	}
	if input.PhoneNumber == "" {
		return contracts.VisitorDTO{}, errors.New("phone_number is required")
	}
	if input.Gender == "" {
		return contracts.VisitorDTO{}, errors.New("gender is required")
	}
	if input.Address == "" {
		return contracts.VisitorDTO{}, errors.New("address is required")
	}

	churchID, err := s.repo.GetUserChurchID(ctx, userID)
	if err != nil {
		return contracts.VisitorDTO{}, fmt.Errorf("resolving church: %w", err)
	}

	createdBy, err := uuid.Parse(userID)
	if err != nil {
		return contracts.VisitorDTO{}, fmt.Errorf("invalid user id: %w", err)
	}

	return s.repo.CreateVisitor(ctx, input, churchID, createdBy)
}

func (s *Service) UpdateVisitor(ctx context.Context, id string, input contracts.UpdateVisitorDTO) (contracts.VisitorDTO, error) {
	if id == "" {
		return contracts.VisitorDTO{}, errors.New("id is required")
	}
	return s.repo.UpdateVisitor(ctx, id, input)
}

func (s *Service) CheckPhone(ctx context.Context, userID string, phone string) (*contracts.VisitorDTO, error) {
	if phone == "" {
		return nil, errors.New("phone is required")
	}

	churchID, err := s.repo.GetUserChurchID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("resolving church: %w", err)
	}

	return s.repo.CheckPhone(ctx, churchID, phone)
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

func (s *Service) MarkAttendance(ctx context.Context, input contracts.MarkAttendanceDTO, userID string) (contracts.AttendanceRecordDTO, error) {
	if input.VisitorID == "" {
		return contracts.AttendanceRecordDTO{}, errors.New("visitor_id is required")
	}

	visitorID, err := uuid.Parse(input.VisitorID)
	if err != nil {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("invalid visitor_id: %w", err)
	}

	// Get the visitor to determine the church_id
	v, err := s.repo.GetVisitorByID(ctx, input.VisitorID)
	if err != nil {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("visitor not found: %w", err)
	}

	churchID, err := uuid.Parse(v.ChurchID)
	if err != nil {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("invalid church_id on visitor: %w", err)
	}

	recordedBy, err := uuid.Parse(userID)
	if err != nil {
		return contracts.AttendanceRecordDTO{}, fmt.Errorf("invalid user id: %w", err)
	}

	// Use today's date (truncated to midnight)
	today := time.Now().Truncate(24 * time.Hour)

	return s.repo.MarkAttendance(ctx, churchID, visitorID, today, input.ServiceType, recordedBy)
}

func (s *Service) GetVisitorAttendance(ctx context.Context, visitorID string) ([]contracts.AttendanceRecordDTO, error) {
	if visitorID == "" {
		return nil, errors.New("visitor_id is required")
	}
	return s.repo.GetVisitorAttendance(ctx, visitorID)
}

// ---------------------------------------------------------------------------
// Foundation class
// ---------------------------------------------------------------------------

func (s *Service) GetFoundationCandidates(ctx context.Context, userID string) ([]contracts.VisitorDTO, error) {
	churchID, err := s.repo.GetUserChurchID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("resolving church: %w", err)
	}

	// Get church settings for threshold
	settings, err := s.repo.GetOrCreateSettings(ctx, churchID)
	if err != nil {
		return nil, fmt.Errorf("getting church settings: %w", err)
	}

	return s.repo.GetFoundationCandidates(ctx, churchID, settings.FoundationClassMinAttendance)
}

func (s *Service) RecommendForFoundationClass(ctx context.Context, visitorID string, userID string, notes *string) (contracts.TeamTodoDTO, error) {
	if visitorID == "" {
		return contracts.TeamTodoDTO{}, errors.New("visitor_id is required")
	}

	vid, err := uuid.Parse(visitorID)
	if err != nil {
		return contracts.TeamTodoDTO{}, fmt.Errorf("invalid visitor_id: %w", err)
	}

	// Get the visitor to determine the church_id
	v, err := s.repo.GetVisitorByID(ctx, visitorID)
	if err != nil {
		return contracts.TeamTodoDTO{}, fmt.Errorf("visitor not found: %w", err)
	}

	churchID, err := uuid.Parse(v.ChurchID)
	if err != nil {
		return contracts.TeamTodoDTO{}, fmt.Errorf("invalid church_id on visitor: %w", err)
	}

	createdBy, err := uuid.Parse(userID)
	if err != nil {
		return contracts.TeamTodoDTO{}, fmt.Errorf("invalid user id: %w", err)
	}

	return s.repo.RecommendForFoundationClass(ctx, vid, churchID, createdBy, notes)
}

// ---------------------------------------------------------------------------
// InfoCenterProfiler interface implementation
// ---------------------------------------------------------------------------

func (s *Service) MarkVisitorProfiled(ctx context.Context, visitorID string, memberID string) error {
	if visitorID == "" {
		return errors.New("visitor_id is required")
	}
	if memberID == "" {
		return errors.New("member_id is required")
	}
	return s.repo.MarkVisitorProfiled(ctx, visitorID, memberID)
}

// ---------------------------------------------------------------------------
// Church settings
// ---------------------------------------------------------------------------

func (s *Service) GetSettings(ctx context.Context, userID string) (contracts.ChurchSettingDTO, error) {
	churchID, err := s.repo.GetUserChurchID(ctx, userID)
	if err != nil {
		return contracts.ChurchSettingDTO{}, fmt.Errorf("resolving church: %w", err)
	}
	return s.repo.GetOrCreateSettings(ctx, churchID)
}

func (s *Service) UpdateSettings(ctx context.Context, userID string, input contracts.UpdateChurchSettingDTO) (contracts.ChurchSettingDTO, error) {
	churchID, err := s.repo.GetUserChurchID(ctx, userID)
	if err != nil {
		return contracts.ChurchSettingDTO{}, fmt.Errorf("resolving church: %w", err)
	}
	return s.repo.UpdateSettings(ctx, churchID, input)
}
