package contracts

import (
	"context"
	"time"
)

type VisitorStatus string

const (
	VisitorStatusFirstTimer              VisitorStatus = "first_timer"
	VisitorStatusReturningVisitor        VisitorStatus = "returning_visitor"
	VisitorStatusFoundationCandidate     VisitorStatus = "foundation_class_candidate"
	VisitorStatusProfiled                VisitorStatus = "profiled"
)

type VisitorDTO struct {
	ID                  string        `json:"visitor_id"`
	ChurchID            string        `json:"church_id"`
	FirstName           string        `json:"first_name"`
	LastName            string        `json:"last_name"`
	PhoneNumber         string        `json:"phone_number"`
	Gender              string        `json:"gender"`
	Email               *string       `json:"email,omitempty"`
	Address             string        `json:"address"`
	FirstAttendanceDate time.Time     `json:"first_attendance_date"`
	PrayerRequest       *string       `json:"prayer_request,omitempty"`
	InvitedByMemberID   *string       `json:"invited_by_member_id,omitempty"`
	InvitedByText       *string       `json:"invited_by_text,omitempty"`
	VisitCount          int           `json:"visit_count"`
	LastAttendedDate    time.Time     `json:"last_attended_date"`
	Status              VisitorStatus `json:"status"`
	Notes               *string       `json:"notes,omitempty"`
	CreatedBy           string        `json:"created_by"`
	ProfiledMemberID    *string       `json:"profiled_member_id,omitempty"`
	CreatedAt           time.Time     `json:"created_at"`
	UpdatedAt           time.Time     `json:"updated_at"`
}

type CreateVisitorDTO struct {
	FirstName         string  `json:"first_name"`
	LastName          string  `json:"last_name"`
	PhoneNumber       string  `json:"phone_number"`
	Gender            string  `json:"gender"`
	Email             *string `json:"email,omitempty"`
	Address           string  `json:"address"`
	PrayerRequest     *string `json:"prayer_request,omitempty"`
	InvitedByMemberID *string `json:"invited_by_member_id,omitempty"`
	InvitedByText     *string `json:"invited_by_text,omitempty"`
	Notes             *string `json:"notes,omitempty"`
}

type UpdateVisitorDTO struct {
	FirstName     *string `json:"first_name,omitempty"`
	LastName      *string `json:"last_name,omitempty"`
	PhoneNumber   *string `json:"phone_number,omitempty"`
	Gender        *string `json:"gender,omitempty"`
	Email         *string `json:"email,omitempty"`
	Address       *string `json:"address,omitempty"`
	PrayerRequest *string `json:"prayer_request,omitempty"`
	Notes         *string `json:"notes,omitempty"`
}

type VisitorFilter struct {
	ChurchID string
	Query    string
	Status   *VisitorStatus
}

type AttendanceRecordDTO struct {
	ID          string    `json:"attendance_id"`
	ChurchID    string    `json:"church_id"`
	VisitorID   string    `json:"visitor_id"`
	ServiceDate time.Time `json:"service_date"`
	ServiceType *string   `json:"service_type,omitempty"`
	RecordedBy  string    `json:"recorded_by"`
	CreatedAt   time.Time `json:"created_at"`
}

type MarkAttendanceDTO struct {
	VisitorID   string  `json:"visitor_id"`
	ServiceType *string `json:"service_type,omitempty"`
}

type ChurchSettingDTO struct {
	ID                            string `json:"id"`
	ChurchID                      string `json:"church_id"`
	FoundationClassMinAttendance  int    `json:"foundation_class_min_attendance"`
}

type UpdateChurchSettingDTO struct {
	FoundationClassMinAttendance *int `json:"foundation_class_min_attendance,omitempty"`
}

type TeamTodoDTO struct {
	ID          string     `json:"id"`
	ChurchID    string     `json:"church_id"`
	TargetTeam  string     `json:"target_team"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	EntityType  string     `json:"entity_type"`
	EntityID    string     `json:"entity_id"`
	Status      string     `json:"status"`
	CreatedBy   string     `json:"created_by"`
	CompletedBy *string    `json:"completed_by,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type FoundationRecommendationDTO struct {
	VisitorID string  `json:"visitor_id"`
	Notes     *string `json:"notes,omitempty"`
}

type InfoCenterReader interface {
	GetVisitor(ctx context.Context, id string) (VisitorDTO, error)
	ListVisitors(ctx context.Context, filter VisitorFilter) ([]VisitorDTO, error)
}

type InfoCenterProfiler interface {
	MarkVisitorProfiled(ctx context.Context, visitorID string, memberID string) error
}
