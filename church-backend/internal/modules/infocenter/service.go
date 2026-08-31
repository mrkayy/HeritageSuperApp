package infocenter

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
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

func (s *Service) BulkImportVisitors(ctx context.Context, visitors []contracts.CreateVisitorDTO, userID string) (contracts.BulkVisitorImportResult, error) {
	if len(visitors) == 0 {
		return contracts.BulkVisitorImportResult{}, errors.New("no visitors provided")
	}

	churchID, err := s.repo.GetUserChurchID(ctx, userID)
	if err != nil {
		return contracts.BulkVisitorImportResult{}, fmt.Errorf("resolving church: %w", err)
	}

	createdBy, err := uuid.Parse(userID)
	if err != nil {
		return contracts.BulkVisitorImportResult{}, fmt.Errorf("invalid user id: %w", err)
	}

	totalRecords := len(visitors)
	jobs := make(chan struct {
		Index   int
		Visitor contracts.CreateVisitorDTO
	}, totalRecords)
	results := make(chan contracts.BulkRowErrorDetail, totalRecords)

	workerCount := 5
	if totalRecords < workerCount {
		workerCount = totalRecords
	}

	var wg sync.WaitGroup
	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				v := job.Visitor
				if strings.TrimSpace(v.FirstName) == "" {
					results <- contracts.BulkRowErrorDetail{
						Row:   job.Index + 1,
						Name:  v.FirstName + " " + v.LastName,
						Error: "first_name is required",
					}
					continue
				}
				if strings.TrimSpace(v.LastName) == "" {
					results <- contracts.BulkRowErrorDetail{
						Row:   job.Index + 1,
						Name:  v.FirstName + " " + v.LastName,
						Error: "last_name is required",
					}
					continue
				}
				if strings.TrimSpace(v.PhoneNumber) == "" {
					results <- contracts.BulkRowErrorDetail{
						Row:   job.Index + 1,
						Name:  v.FirstName + " " + v.LastName,
						Error: "phone_number is required",
					}
					continue
				}
				if strings.TrimSpace(v.Address) == "" {
					v.Address = "Not Specified"
				}
				if strings.TrimSpace(v.Gender) == "" {
					v.Gender = "male"
				}

				_, err := s.repo.CreateVisitor(ctx, v, churchID, createdBy)
				if err != nil {
					results <- contracts.BulkRowErrorDetail{
						Row:   job.Index + 1,
						Name:  v.FirstName + " " + v.LastName,
						Error: err.Error(),
					}
				} else {
					results <- contracts.BulkRowErrorDetail{Row: 0}
				}
			}
		}()
	}

	for i, v := range visitors {
		jobs <- struct {
			Index   int
			Visitor contracts.CreateVisitorDTO
		}{Index: i, Visitor: v}
	}
	close(jobs)

	wg.Wait()
	close(results)

	res := contracts.BulkVisitorImportResult{
		TotalRecords: totalRecords,
		Errors:       []contracts.BulkRowErrorDetail{},
	}

	for r := range results {
		if r.Row == 0 {
			res.SuccessCount++
		} else {
			res.ErrorCount++
			res.Errors = append(res.Errors, r)
		}
	}

	return res, nil
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

