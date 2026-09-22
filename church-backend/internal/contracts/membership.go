package contracts

import (
	"context"
	"time"
)

// Member is the shape other modules are allowed to know about a member.
type Member struct {
	ID                      string   `json:"id"`
	FirstName               string   `json:"firstName"`
	Surname                 string   `json:"surname"`
	Email                   *string  `json:"email"`
	PhoneNumber             *string  `json:"phoneNumber"`
	HomeAddress             *string  `json:"homeAddress"`
	Gender                  *string  `json:"gender"`
	DateOfBirthDay          *int16   `json:"dateOfBirthDay"`
	DateOfBirthMonth        *int16   `json:"dateOfBirthMonth"`
	MaritalStatus           *string  `json:"maritalStatus"`
	WeddingAnniversaryDay   *int16   `json:"weddingAnniversaryDay"`
	WeddingAnniversaryMonth *int16   `json:"weddingAnniversaryMonth"`
	JobOccupation           *string  `json:"jobOccupation"`
	PhotoURL                *string  `json:"photoUrl"`
	EmergencyContactName    *string  `json:"emergencyContactName"`
	EmergencyContactPhone   *string  `json:"emergencyContactPhone"`
	Allergies               *string  `json:"allergies"`
	MedicalNotes            *string  `json:"medicalNotes"`
	IsPlaceholder           bool     `json:"isPlaceholder"`
	IsProfiled              bool     `json:"isProfiled"`
	ProfiledByUserID        *string  `json:"profiledByUserId,omitempty"`
	ProfiledAt              *string  `json:"profiledAt,omitempty"`
	SourceTeam              *string  `json:"sourceTeam"`
	CreatedBy               *string  `json:"createdBy"`
	LocalChurchID           *string  `json:"localChurchId"`
	LocalChurchName         *string  `json:"localChurchName"`
	SectorID                *string  `json:"sectorId"`
	SectorName              *string  `json:"sectorName"`
	TeamID                  *string  `json:"teamId"`
	TeamName                *string  `json:"teamName"`
	VolunteeringTeamID      *string  `json:"volunteeringTeamId,omitempty"`
	VolunteeringTeamName    *string  `json:"volunteeringTeamName,omitempty"`
	CurrentStage            string   `json:"currentStage"`
	Role                    string   `json:"role,omitempty"`
	Roles                   []string `json:"roles,omitempty"`
	JoinedAt                string   `json:"joinedAt,omitempty"`
	CreatedAt               string   `json:"createdAt"`
	UpdatedAt               string   `json:"updatedAt"`
	Name                    string   `json:"name"` // Computed first_name + surname for compatibility
}

// MembershipReader is implemented by the membership module and consumed
// by any other module that needs member data.
type MembershipReader interface {
	GetMember(ctx context.Context, id string) (Member, error)
}

// ---------------------------------------------------------------------------
// 1. Maker-Checker Profile Change Requests
// ---------------------------------------------------------------------------

type ProfileChangeRequestDTO struct {
	ID                 string     `json:"id"`
	ChurchID           string     `json:"church_id"`
	MemberID           string     `json:"member_id"`
	MemberName         string     `json:"member_name"`
	RequestedByUserID string     `json:"requested_by_user_id"`
	RequestedByName   string     `json:"requested_by_name"`
	ReviewedByUserID *string    `json:"reviewed_by_user_id,omitempty"`
	ReviewedByName   *string    `json:"reviewed_by_name,omitempty"`
	Status             string     `json:"status"` // pending, approved, rejected
	PayloadJSON        string     `json:"payload_json"`
	RejectionReason    string     `json:"rejection_reason"`
	CreatedAt          time.Time  `json:"created_at"`
	ReviewedAt        *time.Time `json:"reviewed_at,omitempty"`
}

type ProposeProfileUpdateDTO struct {
	FirstName               *string `json:"first_name,omitempty"`
	Surname                 *string `json:"surname,omitempty"`
	Email                   *string `json:"email,omitempty"`
	PhoneNumber             *string `json:"phone_number,omitempty"`
	HomeAddress             *string `json:"home_address,omitempty"`
	Gender                  *string `json:"gender,omitempty"`
	DateOfBirthDay          *int16  `json:"date_of_birth_day,omitempty"`
	DateOfBirthMonth        *int16  `json:"date_of_birth_month,omitempty"`
	MaritalStatus           *string `json:"marital_status,omitempty"`
	WeddingAnniversaryDay   *int16  `json:"wedding_anniversary_day,omitempty"`
	WeddingAnniversaryMonth *int16  `json:"wedding_anniversary_month,omitempty"`
	JobOccupation           *string `json:"job_occupation,omitempty"`
	EmergencyContactName    *string `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone   *string `json:"emergency_contact_phone,omitempty"`
	Allergies               *string `json:"allergies,omitempty"`
	MedicalNotes            *string `json:"medical_notes,omitempty"`
	CurrentStage            *string `json:"current_stage,omitempty"`
	SectorID                *string `json:"sector_id,omitempty"`
	TeamID                  *string `json:"team_id,omitempty"`
}

type ReviewChangeRequestDTO struct {
	Approved        bool   `json:"approved"`
	RejectionReason string `json:"rejection_reason"`
}

// ---------------------------------------------------------------------------
// 2. First-Timer CRM Call Allocation & Weekly Pastoral Summary
// ---------------------------------------------------------------------------

type FirstTimerAssignmentDTO struct {
	ID                string    `json:"id"`
	ChurchID          string    `json:"church_id"`
	MemberID          string    `json:"member_id"`
	MemberName        string    `json:"member_name"`
	MemberPhone       string    `json:"member_phone"`
	FirstVisitDate    string    `json:"first_visit_date"`
	AssignedToUserID string    `json:"assigned_to_user_id"`
	AssignedToName   string    `json:"assigned_to_name"`
	AssignedByUserID string    `json:"assigned_by_user_id"`
	Status            string    `json:"status"` // pending, contacted, unreachable, completed
	CurrentStage      string    `json:"current_stage"`
	CreatedAt         time.Time `json:"created_at"`
}

type AssignCallersDTO struct {
	VisitorIDs   []string `json:"visitor_ids"`
	AssignedToID string   `json:"assigned_to_id"`
}

type CallLogDTO struct {
	ID                        string    `json:"id"`
	ChurchID                  string    `json:"church_id"`
	MemberID                  string    `json:"member_id"`
	MemberName                string    `json:"member_name"`
	CallerID                  string    `json:"caller_id"`
	CallerName                string    `json:"caller_name"`
	CallDate                  time.Time `json:"call_date"`
	Outcome                   string    `json:"outcome"` // reached_welcomed, unreachable, requested_callback, pastoral_attention
	SummaryNotes              string    `json:"summary_notes"`
	PastoralEscalationNeeded bool      `json:"pastoral_escalation_needed"`
	CreatedAt                 time.Time `json:"created_at"`
}

type LogCallDTO struct {
	MemberID                  string `json:"member_id"`
	Outcome                   string `json:"outcome"`
	SummaryNotes              string `json:"summary_notes"`
	PastoralEscalationNeeded bool   `json:"pastoral_escalation_needed"`
}

type WeeklyPastoralSummaryDTO struct {
	WeekLabel               string       `json:"week_label"`
	TotalFirstTimersReceived int          `json:"total_first_timers_received"`
	TotalCallsCompleted      int          `json:"total_calls_completed"`
	TotalUnreachable         int          `json:"total_unreachable"`
	PastoralEscalationCount  int          `json:"pastoral_escalation_count"`
	RecentLogs               []CallLogDTO `json:"recent_logs"`
}

// ---------------------------------------------------------------------------
// 3. Discipleship Academy Pipeline
// ---------------------------------------------------------------------------

type AcademyCohortDTO struct {
	ID         string     `json:"id"`
	ChurchID   string     `json:"church_id"`
	ModuleType string     `json:"module_type"`
	CohortName string     `json:"cohort_name"`
	StartDate  time.Time  `json:"start_date"`
	EndDate    *time.Time `json:"end_date,omitempty"`
	Status     string     `json:"status"` // enrolling, active, completed
	TotalCount int        `json:"total_count"`
	CreatedAt  time.Time  `json:"created_at"`
}

type CreateCohortDTO struct {
	ModuleType string `json:"module_type"`
	CohortName string `json:"cohort_name"`
	StartDate  string `json:"start_date"`
}

type CohortEnrollmentDTO struct {
	ID          string                   `json:"id"`
	CohortID    string                   `json:"cohort_id"`
	MemberID    string                   `json:"member_id"`
	MemberName  string                   `json:"member_name"`
	TeacherID   *string                  `json:"teacher_id,omitempty"`
	TeacherName *string                  `json:"teacher_name,omitempty"`
	Status      string                   `json:"status"` // enrolled, passed, makeup_required, retake_required, dropped
	Assessment  *ContinuousAssessmentDTO `json:"assessment,omitempty"`
	CreatedAt   time.Time                `json:"created_at"`
}

type EnrollStudentDTO struct {
	MemberID  string  `json:"member_id"`
	TeacherID *string `json:"teacher_id,omitempty"`
}

type ContinuousAssessmentDTO struct {
	ID                        string    `json:"id"`
	EnrollmentID              string    `json:"enrollment_id"`
	AssignmentScore           float64   `json:"assignment_score"`          // Max 20
	VerbalAssessmentScore     float64   `json:"verbal_assessment_score"`    // Max 20
	ParticipationScore        float64   `json:"participation_score"`       // Max 20
	DisciplersReportScore     float64   `json:"disciplers_report_score"`    // Max 20
	ProofOfNoteScore          float64   `json:"proof_of_note_score"`        // Max 10
	AttendanceScore           float64   `json:"attendance_score"`          // Max 10
	TotalScore                float64   `json:"total_score"`               // Max 100, Pass >= 50
	DisciplerDevotionRating   int       `json:"discipler_devotion_rating"`
	DisciplerEvangelismRating int       `json:"discipler_evangelism_rating"`
	MakeupCompleted           bool      `json:"makeup_completed"`
	GradedByUserID            *string   `json:"graded_by_user_id,omitempty"`
	UpdatedAt                 time.Time `json:"updated_at"`
}

type GradeAssessmentDTO struct {
	AssignmentScore           float64 `json:"assignment_score"`
	VerbalAssessmentScore     float64 `json:"verbal_assessment_score"`
	ParticipationScore        float64 `json:"participation_score"`
	DisciplersReportScore     float64 `json:"disciplers_report_score"`
	ProofOfNoteScore          float64 `json:"proof_of_note_score"`
	AttendanceScore           float64 `json:"attendance_score"`
	DisciplerDevotionRating   int     `json:"discipler_devotion_rating"`
	DisciplerEvangelismRating int     `json:"discipler_evangelism_rating"`
	MakeupCompleted           bool    `json:"makeup_completed"`
}

// ---------------------------------------------------------------------------
// 4. Pseudo-Team Volunteering Intake & Placement (Post-Module 2)
// ---------------------------------------------------------------------------

type VolunteerApplicationDTO struct {
	ID                 string     `json:"id"`
	ChurchID           string     `json:"church_id"`
	MemberID           string     `json:"member_id"`
	MemberName         string     `json:"member_name"`
	PreferredTeam1ID  *string    `json:"preferred_team_1_id,omitempty"`
	PreferredTeam1Name *string    `json:"preferred_team_1_name,omitempty"`
	PreferredTeam2ID  *string    `json:"preferred_team_2_id,omitempty"`
	PreferredTeam2Name *string    `json:"preferred_team_2_name,omitempty"`
	SkillsNotes        string     `json:"skills_notes"`
	Status             string     `json:"status"` // pending, placed
	PlacedByUserID    *string    `json:"placed_by_user_id,omitempty"`
	PlacedAt          *time.Time `json:"placed_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

type ApplyVolunteerDTO struct {
	PreferredTeam1ID *string `json:"preferred_team_1_id,omitempty"`
	PreferredTeam2ID *string `json:"preferred_team_2_id,omitempty"`
	SkillsNotes       string  `json:"skills_notes"`
}

type PlaceVolunteerDTO struct {
	ApplicationID string `json:"application_id"`
	TargetTeamID  string `json:"target_team_id"`
}

// ---------------------------------------------------------------------------
// 5. Milestone Celebrations & 3-Day Alert Engine
// ---------------------------------------------------------------------------

type CelebrationAlertDTO struct {
	MemberID        string  `json:"member_id"`
	MemberName      string  `json:"member_name"`
	Phone           string  `json:"phone"`
	Email           *string `json:"email,omitempty"`
	Type            string  `json:"type"` // birthday, anniversary, landmark
	DateLabel       string  `json:"date_label"`
	DaysRemaining   int     `json:"days_remaining"`
	PhotoURL        *string `json:"photo_url,omitempty"`
	LandmarkDetails *string `json:"landmark_details,omitempty"`
}

type MemberLandmarkDTO struct {
	ID               string    `json:"id"`
	ChurchID         string    `json:"church_id"`
	MemberID         string    `json:"member_id"`
	MemberName       string    `json:"member_name"`
	LandmarkType     string    `json:"landmark_type"` // graduation, childbirth, wedding, career, custom
	Title            string    `json:"title"`
	InstitutionOrOrg string    `json:"institution_or_org"`
	EventDate        time.Time `json:"event_date"`
	Notes            string    `json:"notes"`
	CreatedByUserID  *string   `json:"created_by_user_id,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

type CreateLandmarkDTO struct {
	MemberID         string `json:"member_id"`
	LandmarkType     string `json:"landmark_type"`
	Title            string `json:"title"`
	InstitutionOrOrg string `json:"institution_or_org"`
	EventDate        string `json:"event_date"`
	Notes            string `json:"notes"`
}

// ---------------------------------------------------------------------------
// 6. Pastoral Situation Reports (SitRep)
// ---------------------------------------------------------------------------

type SituationReportDTO struct {
	ID             string    `json:"id"`
	ChurchID       string    `json:"church_id"`
	MemberID       string    `json:"member_id"`
	MemberName     string    `json:"member_name"`
	Category       string    `json:"category"` // health, bereavement, childbirth, academic_distress, job_loss, counseling, relocation, general
	Notes          string    `json:"notes"`
	ActionTaken    string    `json:"action_taken"`
	IsUrgent       bool      `json:"is_urgent"`
	FiledByUserID string    `json:"filed_by_user_id"`
	FiledByName   string    `json:"filed_by_name"`
	PastorReviewed bool      `json:"pastor_reviewed"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateSitRepDTO struct {
	MemberID    string `json:"member_id"`
	Category    string `json:"category"`
	Notes       string `json:"notes"`
	ActionTaken string `json:"action_taken"`
	IsUrgent    bool   `json:"is_urgent"`
}

// ---------------------------------------------------------------------------
// 7. Gatekeeper Visitor Profiling Pipeline
// ---------------------------------------------------------------------------

type UnprofiledVisitorDTO struct {
	ID                    string    `json:"id"`
	ChurchID              string    `json:"church_id"`
	FirstName             string    `json:"first_name"`
	LastName              string    `json:"last_name"`
	PhoneNumber           string    `json:"phone_number"`
	Gender                string    `json:"gender"`
	FirstAttendanceDate   time.Time `json:"first_attendance_date"`
	Address               string    `json:"address"`
	Email                 *string   `json:"email,omitempty"`
	VisitCount            int       `json:"visit_count"`
	FoundationRecommended bool      `json:"foundation_recommended"`
}

type ProfileVisitorPayloadDTO struct {
	Email                   string  `json:"email"`
	DateOfBirthDay          int16   `json:"date_of_birth_day"`
	DateOfBirthMonth        int16   `json:"date_of_birth_month"`
	MaritalStatus           string  `json:"marital_status"`
	WeddingAnniversaryDay   *int16  `json:"wedding_anniversary_day,omitempty"`
	WeddingAnniversaryMonth *int16  `json:"wedding_anniversary_month,omitempty"`
	Occupation              *string `json:"occupation,omitempty"`
	SectorID                *string `json:"sector_id,omitempty"`
	SendClaimMagicLink      bool    `json:"send_claim_magic_link"`
}

// ---------------------------------------------------------------------------
// 8. Inter-Branch Member Transfer & Longitudinal Migration
// ---------------------------------------------------------------------------

type MemberTransferDTO struct {
	ID                     string     `json:"id"`
	MemberID               string     `json:"member_id"`
	MemberName             string     `json:"member_name"`
	OriginChurchID         string     `json:"origin_church_id"`
	OriginChurchName       string     `json:"origin_church_name"`
	DestinationChurchID    string     `json:"destination_church_id"`
	DestinationChurchName  string     `json:"destination_church_name"`
	TransferReason         string     `json:"transfer_reason"`
	PastoralRecommendation string     `json:"pastoral_recommendation"`
	Status                 string     `json:"status"` // pending, approved, rejected
	InitiatedByUserID     string     `json:"initiated_by_user_id"`
	InitiatedByName       string     `json:"initiated_by_name"`
	ReviewedByUserID       *string    `json:"reviewed_by_user_id,omitempty"`
	ReviewedByName         *string    `json:"reviewed_by_name,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	ReviewedAt            *time.Time `json:"reviewed_at,omitempty"`
}

type InitiateTransferDTO struct {
	MemberID               string `json:"member_id"`
	DestinationChurchID    string `json:"destination_church_id"`
	TransferReason         string `json:"transfer_reason"`
	PastoralRecommendation string `json:"pastoral_recommendation"`
}

type ReviewTransferDTO struct {
	Approved bool    `json:"approved"`
	SectorID *string `json:"sector_id,omitempty"`
}
