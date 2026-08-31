package contracts

import (
	"time"
)

// ---------------------------------------------------------------------------
// Local Church Branch DTOs
// ---------------------------------------------------------------------------

type LocalChurchDTO struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Center             string    `json:"center"`
	Slug               string    `json:"slug"`
	Description        *string   `json:"description,omitempty"`
	Address            *string   `json:"address,omitempty"`
	City               *string   `json:"city,omitempty"`
	State              *string   `json:"state,omitempty"`
	ResidentPastorID   *string   `json:"resident_pastor_id,omitempty"`
	ResidentPastorName *string   `json:"resident_pastor_name,omitempty"`
	ChurchAdminID      *string   `json:"church_admin_id,omitempty"`
	ChurchAdminName    *string   `json:"church_admin_name,omitempty"`
	IsActive           bool      `json:"is_active"`
	TotalMembers       int       `json:"total_members"`
	CreatedAt          time.Time `json:"created_at"`
}

type CreateLocalChurchDTO struct {
	Name             string  `json:"name"`
	Center           string  `json:"center"`
	Slug             string  `json:"slug"`
	Description      *string `json:"description,omitempty"`
	Address          *string `json:"address,omitempty"`
	City             *string `json:"city,omitempty"`
	State            *string `json:"state,omitempty"`
	ResidentPastorID *string `json:"resident_pastor_id,omitempty"`
	ChurchAdminID    *string `json:"church_admin_id,omitempty"`
}

type UpdateLocalChurchDTO struct {
	Name        *string `json:"name,omitempty"`
	Center      *string `json:"center,omitempty"`
	Slug        *string `json:"slug,omitempty"`
	Description *string `json:"description,omitempty"`
	Address     *string `json:"address,omitempty"`
	City        *string `json:"city,omitempty"`
	State       *string `json:"state,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type ReassignLeadershipDTO struct {
	ResidentPastorID *string `json:"resident_pastor_id,omitempty"`
	ChurchAdminID    *string `json:"church_admin_id,omitempty"`
}

// ---------------------------------------------------------------------------
// Leadership Invitation DTOs
// ---------------------------------------------------------------------------

type LeadershipInviteDTO struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Role      string    `json:"role"`
	ChurchID  *string   `json:"church_id,omitempty"`
	ChurchName *string  `json:"church_name,omitempty"`
	SectorID  *string   `json:"sector_id,omitempty"`
	OtpCode   string    `json:"otp_code"`
	Used      bool      `json:"used"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateLeadershipInviteDTO struct {
	Email     string  `json:"email"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Role      string  `json:"role"`
	ChurchID  *string `json:"church_id,omitempty"`
	SectorID  *string `json:"sector_id,omitempty"`
}

// ---------------------------------------------------------------------------
// Feature Flag & Module Matrix DTOs
// ---------------------------------------------------------------------------

type BranchModuleMatrixDTO struct {
	ChurchID   string          `json:"church_id"`
	ChurchName string          `json:"church_name"`
	Flags      map[string]bool `json:"flags"`
}

// ---------------------------------------------------------------------------
// General Overseer Universal Member Dossier DTOs
// ---------------------------------------------------------------------------

type UniversalMemberSearchResultDTO struct {
	ID           string  `json:"id"`
	FirstName    string  `json:"first_name"`
	Surname      string  `json:"surname"`
	Email        *string `json:"email,omitempty"`
	PhoneNumber  *string `json:"phone_number,omitempty"`
	ChurchID     string  `json:"church_id"`
	ChurchName   string  `json:"church_name"`
	CurrentStage string  `json:"current_stage"`
	Role         string  `json:"role"`
}

type Member360DossierDTO struct {
	Member       Member               `json:"member"`
	ChurchName   string               `json:"church_name"`
	Stages       []StageHistoryDTO    `json:"stages"`
	Attendance   []AttendanceRecordDTO `json:"attendance"`
	Teams        []string             `json:"teams"`
	TotalVisits  int                  `json:"total_visits"`
	SitReps      []SitRepItemDTO      `json:"sit_reps"`
}

type StageHistoryDTO struct {
	Stage     string    `json:"stage"`
	ChangedAt time.Time `json:"changed_at"`
}

type SitRepItemDTO struct {
	Category    string    `json:"category"`
	Notes       string    `json:"notes"`
	ReportedAt  time.Time `json:"reported_at"`
	ReportedBy  string    `json:"reported_by"`
}

// ---------------------------------------------------------------------------
// Executive Analytics DTOs
// ---------------------------------------------------------------------------

type ExecutiveSummaryDTO struct {
	TotalActiveMembers   int                   `json:"total_active_members"`
	TotalVisitors        int                   `json:"total_visitors"`
	TotalFirstTimers     int                   `json:"total_first_timers"`
	TotalFoundationClass int                   `json:"total_foundation_class"`
	TotalStewards        int                   `json:"total_stewards"`
	TotalSoulsWon        int                   `json:"total_souls_won"`
	BranchPerformance    []BranchPerformanceDTO `json:"branch_performance"`
}

type BranchPerformanceDTO struct {
	ChurchID       string `json:"church_id"`
	ChurchName     string `json:"church_name"`
	MemberCount    int    `json:"member_count"`
	VisitorCount   int    `json:"visitor_count"`
	FirstTimerCount int   `json:"first_timer_count"`
	SoulsWonCount  int    `json:"souls_won_count"`
}

// ---------------------------------------------------------------------------
// Platform Security & Audit Log DTOs
// ---------------------------------------------------------------------------

type AuditLogDTO struct {
	ID           string    `json:"id"`
	ActorUserID  *string   `json:"actor_user_id,omitempty"`
	ActorName    string    `json:"actor_name"`
	ActorEmail   string    `json:"actor_email"`
	ActorRole    string    `json:"actor_role"`
	ChurchID     *string   `json:"church_id,omitempty"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resource_type"`
	ResourceID   string    `json:"resource_id"`
	Details      string    `json:"details"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	CreatedAt    time.Time `json:"created_at"`
}
