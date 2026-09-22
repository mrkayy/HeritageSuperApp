package membership

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Service struct {
	repo             *Repository
	infoCenterReader contracts.InfoCenterReader
	infoCenterProf   contracts.InfoCenterProfiler
}

func NewService(repo *Repository, icr contracts.InfoCenterReader, icp contracts.InfoCenterProfiler) *Service {
	return &Service{repo: repo, infoCenterReader: icr, infoCenterProf: icp}
}

// GetMember satisfies contracts.MembershipReader
func (s *Service) GetMember(ctx context.Context, id string) (contracts.Member, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) ListMembers(ctx context.Context, teamID string) ([]contracts.Member, error) {
	return s.repo.List(ctx, teamID)
}

func (s *Service) AddMember(ctx context.Context, in AddMemberInput) (contracts.Member, error) {
	if in.FirstName == "" || in.Surname == "" {
		return contracts.Member{}, fmt.Errorf("first name and surname are required")
	}
	return s.repo.Add(ctx, in)
}

func (s *Service) DeleteMember(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) UpdateMember(ctx context.Context, id string, in AddMemberInput) (contracts.Member, error) {
	if in.FirstName == "" || in.Surname == "" {
		return contracts.Member{}, fmt.Errorf("first name and surname are required")
	}
	if in.Role == "" {
		in.Role = string(contracts.RoleMember)
	}
	if !contracts.IsValidRole(in.Role) {
		return contracts.Member{}, fmt.Errorf("invalid role: %s", in.Role)
	}

	return s.repo.Update(ctx, id, in)
}

type ProfileMemberInput struct {
	FirstName    string
	Surname      string
	Name         string
	Email        string
	Role         string
	CurrentStage *string
	TeamID       *string
	SectorID     *string
	ChurchID     *string
	CreatedBy    *uuid.UUID
}

func (s *Service) ProfileMember(ctx context.Context, in ProfileMemberInput) (contracts.Member, error) {
	if (in.FirstName == "" && in.Name == "") || in.Email == "" {
		return contracts.Member{}, fmt.Errorf("name and email are required")
	}
	if in.Role == "" {
		in.Role = string(contracts.RoleMember)
	}
	if !contracts.IsValidRole(in.Role) {
		return contracts.Member{}, fmt.Errorf("invalid role: %s", in.Role)
	}

	return s.repo.ProfileNewMember(ctx, in)
}

func (s *Service) ListMembersPaginated(ctx context.Context, page, limit int, search, stage, teamID string) ([]contracts.Member, int, error) {
	return s.repo.ListPaginated(ctx, page, limit, search, stage, teamID)
}

func (s *Service) GetStageCounts(ctx context.Context) (map[string]int, error) {
	return s.repo.GetStageCounts(ctx)
}

func (s *Service) AddGuardianRelationship(ctx context.Context, in GuardianRelationshipInput) error {
	return s.repo.AddGuardianRelationship(ctx, in)
}

func (s *Service) GetGuardianRelationships(ctx context.Context, memberID string) ([]GuardianRelationshipDTO, error) {
	return s.repo.GetGuardianRelationshipsForMember(ctx, memberID)
}

func (s *Service) DeleteGuardianRelationship(ctx context.Context, relID string) error {
	return s.repo.DeleteGuardianRelationship(ctx, relID)
}

func (s *Service) ListProfilingQueue(ctx context.Context, userID string) ([]contracts.TeamTodoDTO, error) {
	return s.repo.ListTeamTodos(ctx, userID, "membership", "pending")
}

func (s *Service) ProfileVisitor(ctx context.Context, visitorID string, userID string) (contracts.Member, error) {
	visitor, err := s.infoCenterReader.GetVisitor(ctx, visitorID)
	if err != nil {
		return contracts.Member{}, fmt.Errorf("visitor not found: %w", err)
	}

	stage := "foundation_class"
	email := ""
	if visitor.Email != nil {
		email = *visitor.Email
	}

	creatorUUID, err := uuid.Parse(userID)
	if err != nil {
		return contracts.Member{}, fmt.Errorf("invalid user id: %w", err)
	}

	phone := visitor.PhoneNumber
	addr := visitor.Address

	member, err := s.repo.Add(ctx, AddMemberInput{
		FirstName:    visitor.FirstName,
		Surname:      visitor.LastName,
		Role:         "member",
		Email:        &email,
		PhoneNumber:  &phone,
		HomeAddress:  &addr,
		Gender:       &visitor.Gender,
		CurrentStage: &stage,
		SourceTeam:   strPtr("info_center"),
		CreatedBy:    &creatorUUID,
	})
	if err != nil {
		return contracts.Member{}, fmt.Errorf("creating member: %w", err)
	}

	if err := s.infoCenterProf.MarkVisitorProfiled(ctx, visitorID, member.ID); err != nil {
		return contracts.Member{}, fmt.Errorf("marking visitor profiled: %w", err)
	}

	_ = s.repo.CompleteTeamTodo(ctx, visitorID, userID)

	return member, nil
}

// ---------------------------------------------------------------------------
// 1. Maker-Checker Profile Change Requests
// ---------------------------------------------------------------------------

func (s *Service) ProposeProfileUpdate(ctx context.Context, churchID, memberID, requestedByUserID string, dto contracts.ProposeProfileUpdateDTO) (contracts.ProfileChangeRequestDTO, error) {
	bytes, err := json.Marshal(dto)
	if err != nil {
		return contracts.ProfileChangeRequestDTO{}, err
	}
	return s.repo.ProposeProfileUpdate(ctx, churchID, memberID, requestedByUserID, string(bytes))
}

func (s *Service) ListPendingChangeRequests(ctx context.Context, churchID string) ([]contracts.ProfileChangeRequestDTO, error) {
	return s.repo.ListPendingChangeRequests(ctx, churchID)
}

func (s *Service) ReviewChangeRequest(ctx context.Context, reqID, reviewedByUserID string, dto contracts.ReviewChangeRequestDTO) error {
	return s.repo.ReviewChangeRequest(ctx, reqID, reviewedByUserID, dto.Approved, dto.RejectionReason)
}

// ---------------------------------------------------------------------------
// 2. First-Timer CRM Call Allocation & Weekly Pastoral Summary
// ---------------------------------------------------------------------------

func (s *Service) AssignFirstTimers(ctx context.Context, churchID string, assignedByID string, dto contracts.AssignCallersDTO) error {
	return s.repo.AssignFirstTimers(ctx, churchID, dto.VisitorIDs, dto.AssignedToID, assignedByID)
}

func (s *Service) ListAssignedFirstTimers(ctx context.Context, churchID, assignedToID string) ([]contracts.FirstTimerAssignmentDTO, error) {
	return s.repo.ListAssignedFirstTimers(ctx, churchID, assignedToID)
}

func (s *Service) LogCall(ctx context.Context, churchID, callerID string, dto contracts.LogCallDTO) (contracts.CallLogDTO, error) {
	return s.repo.LogCall(ctx, churchID, callerID, dto)
}

func (s *Service) GetWeeklyPastoralSummary(ctx context.Context, churchID string) (contracts.WeeklyPastoralSummaryDTO, error) {
	return s.repo.GetWeeklyPastoralSummary(ctx, churchID)
}

// ---------------------------------------------------------------------------
// 3. Discipleship Academy Pipeline
// ---------------------------------------------------------------------------

func (s *Service) CreateCohort(ctx context.Context, churchID string, dto contracts.CreateCohortDTO) (contracts.AcademyCohortDTO, error) {
	return s.repo.CreateCohort(ctx, churchID, dto)
}

func (s *Service) ListCohorts(ctx context.Context, churchID string) ([]contracts.AcademyCohortDTO, error) {
	return s.repo.ListCohorts(ctx, churchID)
}

func (s *Service) EnrollStudent(ctx context.Context, cohortID string, dto contracts.EnrollStudentDTO) (contracts.CohortEnrollmentDTO, error) {
	return s.repo.EnrollStudent(ctx, cohortID, dto.MemberID, dto.TeacherID)
}

func (s *Service) ListEnrollments(ctx context.Context, cohortID string) ([]contracts.CohortEnrollmentDTO, error) {
	return s.repo.ListEnrollments(ctx, cohortID)
}

func (s *Service) GradeAssessment(ctx context.Context, enrollmentID, gradedByUserID string, dto contracts.GradeAssessmentDTO) (contracts.ContinuousAssessmentDTO, error) {
	return s.repo.GradeAssessment(ctx, enrollmentID, gradedByUserID, dto)
}

func (s *Service) GraduateEnrollment(ctx context.Context, enrollmentID string) error {
	return s.repo.GraduateEnrollment(ctx, enrollmentID)
}

// ---------------------------------------------------------------------------
// 4. Pseudo-Team Volunteering Intake & Placement (Post-Module 2)
// ---------------------------------------------------------------------------

func (s *Service) ApplyVolunteer(ctx context.Context, churchID, memberID string, dto contracts.ApplyVolunteerDTO) (contracts.VolunteerApplicationDTO, error) {
	return s.repo.ApplyVolunteer(ctx, churchID, memberID, dto)
}

func (s *Service) ListVolunteerApplications(ctx context.Context, churchID string) ([]contracts.VolunteerApplicationDTO, error) {
	return s.repo.ListVolunteerApplications(ctx, churchID)
}

func (s *Service) PlaceVolunteer(ctx context.Context, placedByUserID string, dto contracts.PlaceVolunteerDTO) error {
	return s.repo.PlaceVolunteer(ctx, dto.ApplicationID, dto.TargetTeamID, placedByUserID)
}

// ---------------------------------------------------------------------------
// 5. Milestone Celebrations & 3-Day Alert Engine
// ---------------------------------------------------------------------------

func (s *Service) GetUpcomingCelebrations(ctx context.Context, churchID string, days int) ([]contracts.CelebrationAlertDTO, error) {
	if days <= 0 {
		days = 3
	}
	return s.repo.GetUpcomingCelebrations(ctx, churchID, days)
}

func (s *Service) CreateLandmark(ctx context.Context, churchID, createdByUserID string, dto contracts.CreateLandmarkDTO) (contracts.MemberLandmarkDTO, error) {
	return s.repo.CreateLandmark(ctx, churchID, &createdByUserID, dto)
}

func (s *Service) ListLandmarks(ctx context.Context, churchID string) ([]contracts.MemberLandmarkDTO, error) {
	return s.repo.ListLandmarks(ctx, churchID)
}

// ---------------------------------------------------------------------------
// 6. Pastoral Situation Reports (SitRep)
// ---------------------------------------------------------------------------

func (s *Service) CreateSitRep(ctx context.Context, churchID, filedByUserID string, dto contracts.CreateSitRepDTO) (contracts.SituationReportDTO, error) {
	return s.repo.CreateSitRep(ctx, churchID, filedByUserID, dto)
}

func (s *Service) ListSitRepsForMember(ctx context.Context, memberID string) ([]contracts.SituationReportDTO, error) {
	return s.repo.ListSitRepsForMember(ctx, memberID)
}

// ---------------------------------------------------------------------------
// 7. Gatekeeper Visitor Profiling Pipeline
// ---------------------------------------------------------------------------

func (s *Service) ListUnprofiledVisitors(ctx context.Context, churchID string) ([]contracts.UnprofiledVisitorDTO, error) {
	return s.repo.ListUnprofiledVisitors(ctx, churchID)
}

func (s *Service) ProfileVisitorFull(ctx context.Context, churchID, visitorID, profiledByUserID string, dto contracts.ProfileVisitorPayloadDTO) (contracts.Member, error) {
	return s.repo.ProfileVisitor(ctx, churchID, visitorID, profiledByUserID, dto)
}

// ---------------------------------------------------------------------------
// 8. Inter-Branch Member Transfer & Longitudinal Migration
// ---------------------------------------------------------------------------

func (s *Service) InitiateTransfer(ctx context.Context, originChurchID, initiatedByUserID string, dto contracts.InitiateTransferDTO) (contracts.MemberTransferDTO, error) {
	return s.repo.InitiateTransfer(ctx, originChurchID, initiatedByUserID, dto)
}

func (s *Service) ListInboundTransfers(ctx context.Context, churchID string) ([]contracts.MemberTransferDTO, error) {
	return s.repo.ListInboundTransfers(ctx, churchID)
}

func (s *Service) ReviewTransfer(ctx context.Context, transferID, reviewedByUserID string, dto contracts.ReviewTransferDTO) error {
	return s.repo.ReviewTransfer(ctx, transferID, reviewedByUserID, dto)
}

func strPtr(s string) *string { return &s }
