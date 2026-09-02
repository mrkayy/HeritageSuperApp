package membership

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Register defines this module's endpoints on the group.
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("", h.list)
	g.GET("/stage-counts", h.stageCounts)
	g.GET("/:id", h.get)
	g.POST("", h.add)
	g.POST("/profile", h.profile)
	g.POST("/bulk-profile", h.bulkProfile)
	g.POST("/bulk-profile-json", h.bulkProfileJSON)
	g.POST("/bulk", h.bulkProfileJSON)
	g.PUT("/:id", h.update)
	g.DELETE("/:id", h.delete)

	// Legacy Profiling pipeline
	g.GET("/profiling-queue", h.profilingQueue)
	g.POST("/profile-visitor/:visitor_id", h.profileVisitor)

	// Guardian Relationships
	g.GET("/:id/relationships", h.getGuardianRelationships)
	g.POST("/relationships", h.addGuardianRelationship)
	g.DELETE("/relationships/:rel_id", h.deleteGuardianRelationship)

	// -----------------------------------------------------------------------
	// 1. Maker-Checker Profile Change Requests
	// -----------------------------------------------------------------------
	g.POST("/:id/propose-update", h.proposeUpdate)
	g.GET("/change-requests", h.listPendingChangeRequests)
	g.POST("/change-requests/:id/review", h.reviewChangeRequest)

	// -----------------------------------------------------------------------
	// 2. First-Timer CRM Call Allocation & Weekly Pastoral Summary
	// -----------------------------------------------------------------------
	g.POST("/assignments/batch", h.assignFirstTimers)
	g.GET("/assignments/my", h.listMyAssignedFirstTimers)
	g.POST("/call-logs", h.logCall)
	g.GET("/reports/weekly-pastoral-summary", h.getWeeklyPastoralSummary)

	// -----------------------------------------------------------------------
	// 3. Discipleship Academy Pipeline
	// -----------------------------------------------------------------------
	g.POST("/cohorts", h.createCohort)
	g.GET("/cohorts", h.listCohorts)
	g.POST("/cohorts/:id/enroll", h.enrollStudent)
	g.GET("/cohorts/:id/enrollments", h.listEnrollments)
	g.PUT("/enrollments/:id/grade", h.gradeAssessment)
	g.POST("/enrollments/:id/graduate", h.graduateEnrollment)

	// -----------------------------------------------------------------------
	// 4. Pseudo-Team Volunteering Intake & Placement (Post-Module 2)
	// -----------------------------------------------------------------------
	g.POST("/volunteer-applications", h.applyVolunteer)
	g.GET("/volunteer-applications", h.listVolunteerApplications)
	g.POST("/volunteer-assignments", h.placeVolunteer)

	// -----------------------------------------------------------------------
	// 5. Milestone Celebrations & 3-Day Alert Engine
	// -----------------------------------------------------------------------
	g.GET("/celebrations/upcoming", h.getUpcomingCelebrations)
	g.POST("/landmarks", h.createLandmark)
	g.GET("/landmarks", h.listLandmarks)

	// -----------------------------------------------------------------------
	// 6. Pastoral Situation Reports (SitRep)
	// -----------------------------------------------------------------------
	g.POST("/situation-reports", h.createSitRep)
	g.GET("/:id/situation-reports", h.listSitRepsForMember)

	// -----------------------------------------------------------------------
	// 7. Gatekeeper Visitor Profiling Pipeline
	// -----------------------------------------------------------------------
	g.GET("/unprofiled-visitors", h.listUnprofiledVisitors)
	g.POST("/visitors/:visitor_id/profile-full", h.profileVisitorFull)

	// -----------------------------------------------------------------------
	// 8. Inter-Branch Member Transfer & Longitudinal Migration
	// -----------------------------------------------------------------------
	g.POST("/transfers/initiate", h.initiateTransfer)
	g.GET("/transfers/inbound", h.listInboundTransfers)
	g.POST("/transfers/:id/review", h.reviewTransfer)
}

func (h *Handler) list(c *gin.Context) {
	pageStr := c.Query("page")
	if pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(c.Query("limit"))
		search := c.Query("search")
		stage := c.Query("stage")
		teamID := c.Query("teamId")

		if page < 1 {
			page = 1
		}
		if limit < 1 {
			limit = 50
		}

		members, total, err := h.svc.ListMembersPaginated(c.Request.Context(), page, limit, search, stage, teamID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		totalPages := (total + limit - 1) / limit

		c.JSON(http.StatusOK, gin.H{
			"members":    members,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		})
		return
	}

	teamID := c.Query("teamId")
	members, err := h.svc.ListMembers(c.Request.Context(), teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *Handler) stageCounts(c *gin.Context) {
	counts, err := h.svc.GetStageCounts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, counts)
}

func (h *Handler) get(c *gin.Context) {
	id := c.Param("id")
	member, err := h.svc.GetMember(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *Handler) add(c *gin.Context) {
	var in AddMemberInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	member, err := h.svc.AddMember(c.Request.Context(), in)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, member)
}

func (h *Handler) profile(c *gin.Context) {
	var in ProfileMemberInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	u, ok := contracts.UserFromContext(c.Request.Context())
	if ok {
		uid := u.ID
		if uidParsed, err := uuid.Parse(uid); err == nil {
			in.CreatedBy = &uidParsed
		}
	}

	member, err := h.svc.ProfileMember(c.Request.Context(), in)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, member)
}

func (h *Handler) update(c *gin.Context) {
	id := c.Param("id")
	var in AddMemberInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	member, err := h.svc.UpdateMember(c.Request.Context(), id, in)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *Handler) delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteMember(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) bulkProfile(c *gin.Context) {
	u, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uidParsed, err := uuid.Parse(u.ID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	res, err := h.svc.BulkImportCSV(c.Request.Context(), file, &uidParsed)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) bulkProfileJSON(c *gin.Context) {
	u, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uidParsed, err := uuid.Parse(u.ID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	var in []AddMemberInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.svc.BulkImportJSON(c.Request.Context(), in, &uidParsed)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) profilingQueue(c *gin.Context) {
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	todos, err := h.svc.ListProfilingQueue(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, todos)
}

func (h *Handler) profileVisitor(c *gin.Context) {
	visitorID := c.Param("visitor_id")
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	member, err := h.svc.ProfileVisitor(c.Request.Context(), visitorID, user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *Handler) getGuardianRelationships(c *gin.Context) {
	memberID := c.Param("id")
	rels, err := h.svc.GetGuardianRelationships(c.Request.Context(), memberID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rels)
}

func (h *Handler) addGuardianRelationship(c *gin.Context) {
	var in GuardianRelationshipInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.AddGuardianRelationship(c.Request.Context(), in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Relationship added successfully"})
}

func (h *Handler) deleteGuardianRelationship(c *gin.Context) {
	relID := c.Param("rel_id")
	if err := h.svc.DeleteGuardianRelationship(c.Request.Context(), relID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Relationship deleted successfully"})
}

// ---------------------------------------------------------------------------
// Handler implementations for 8 Membership Suite Features
// ---------------------------------------------------------------------------

func (h *Handler) proposeUpdate(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	memberID := c.Param("id")
	var dto contracts.ProposeProfileUpdateDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	resp, err := h.svc.ProposeProfileUpdate(c.Request.Context(), actor.ChurchID, memberID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

func (h *Handler) listPendingChangeRequests(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	pcrs, err := h.svc.ListPendingChangeRequests(c.Request.Context(), actor.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pcrs)
}

func (h *Handler) reviewChangeRequest(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	reqID := c.Param("id")
	var dto contracts.ReviewChangeRequestDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := h.svc.ReviewChangeRequest(c.Request.Context(), reqID, actor.ID, dto); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) assignFirstTimers(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.AssignCallersDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := h.svc.AssignFirstTimers(c.Request.Context(), actor.ChurchID, actor.ID, dto); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) listMyAssignedFirstTimers(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	res, err := h.svc.ListAssignedFirstTimers(c.Request.Context(), actor.ChurchID, actor.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) logCall(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.LogCallDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.LogCall(c.Request.Context(), actor.ChurchID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) getWeeklyPastoralSummary(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	res, err := h.svc.GetWeeklyPastoralSummary(c.Request.Context(), actor.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) createCohort(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.CreateCohortDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.CreateCohort(c.Request.Context(), actor.ChurchID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) listCohorts(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	res, err := h.svc.ListCohorts(c.Request.Context(), actor.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) enrollStudent(c *gin.Context) {
	cohortID := c.Param("id")
	var dto contracts.EnrollStudentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.EnrollStudent(c.Request.Context(), cohortID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) listEnrollments(c *gin.Context) {
	cohortID := c.Param("id")
	res, err := h.svc.ListEnrollments(c.Request.Context(), cohortID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) gradeAssessment(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	enrollmentID := c.Param("id")
	var dto contracts.GradeAssessmentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.GradeAssessment(c.Request.Context(), enrollmentID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) graduateEnrollment(c *gin.Context) {
	enrollmentID := c.Param("id")
	if err := h.svc.GraduateEnrollment(c.Request.Context(), enrollmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) applyVolunteer(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.ApplyVolunteerDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.ApplyVolunteer(c.Request.Context(), actor.ChurchID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) listVolunteerApplications(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	res, err := h.svc.ListVolunteerApplications(c.Request.Context(), actor.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) placeVolunteer(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.PlaceVolunteerDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := h.svc.PlaceVolunteer(c.Request.Context(), actor.ID, dto); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) getUpcomingCelebrations(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	daysStr := c.DefaultQuery("days", "3")
	days, _ := strconv.Atoi(daysStr)
	res, err := h.svc.GetUpcomingCelebrations(c.Request.Context(), actor.ChurchID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) createLandmark(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.CreateLandmarkDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.CreateLandmark(c.Request.Context(), actor.ChurchID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) listLandmarks(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	res, err := h.svc.ListLandmarks(c.Request.Context(), actor.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) createSitRep(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.CreateSitRepDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.CreateSitRep(c.Request.Context(), actor.ChurchID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) listSitRepsForMember(c *gin.Context) {
	memberID := c.Param("id")
	res, err := h.svc.ListSitRepsForMember(c.Request.Context(), memberID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) listUnprofiledVisitors(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	res, err := h.svc.ListUnprofiledVisitors(c.Request.Context(), actor.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) profileVisitorFull(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	visitorID := c.Param("visitor_id")
	var dto contracts.ProfileVisitorPayloadDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.ProfileVisitorFull(c.Request.Context(), actor.ChurchID, visitorID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) initiateTransfer(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var dto contracts.InitiateTransferDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	res, err := h.svc.InitiateTransfer(c.Request.Context(), actor.ChurchID, actor.ID, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) listInboundTransfers(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	res, err := h.svc.ListInboundTransfers(c.Request.Context(), actor.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) reviewTransfer(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	transferID := c.Param("id")
	var dto contracts.ReviewTransferDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := h.svc.ReviewTransfer(c.Request.Context(), transferID, actor.ID, dto); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
