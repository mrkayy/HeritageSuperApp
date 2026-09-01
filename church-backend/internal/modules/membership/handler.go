package membership

import (
	"net/http"
	"strconv"
	"strings"

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
	g.PUT("/:id", h.update)
	g.DELETE("/:id", h.delete)

	// Profiling pipeline
	g.GET("/profiling-queue", h.profilingQueue)
	g.POST("/profile-visitor/:visitor_id", h.profileVisitor)

	// Guardian Relationships
	g.GET("/:id/relationships", h.getGuardianRelationships)
	g.POST("/relationships", h.addGuardianRelationship)
	g.DELETE("/relationships/:rel_id", h.deleteGuardianRelationship)
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

type createPayload struct {
	FirstName               string  `json:"firstName"`
	Surname                 string  `json:"surname"`
	Role                    *string `json:"role"`
	Email                   *string `json:"email"`
	PhoneNumber             *string `json:"phoneNumber"`
	HomeAddress             *string `json:"homeAddress"`
	Gender                  *string `json:"gender"`
	DateOfBirthDay          *int16  `json:"dateOfBirthDay"`
	DateOfBirthMonth        *int16  `json:"dateOfBirthMonth"`
	MaritalStatus           *string `json:"maritalStatus"`
	WeddingAnniversaryDay   *int16  `json:"weddingAnniversaryDay"`
	WeddingAnniversaryMonth *int16  `json:"weddingAnniversaryMonth"`
	JobOccupation           *string `json:"jobOccupation"`
	PhotoURL                *string `json:"photoUrl"`
	EmergencyContactName    *string `json:"emergencyContactName"`
	EmergencyContactPhone   *string `json:"emergencyContactPhone"`
	Allergies               *string `json:"allergies"`
	MedicalNotes            *string `json:"medicalNotes"`
	IsPlaceholder           bool    `json:"isPlaceholder"`
	SourceTeam              *string `json:"sourceTeam"`
	CurrentStage            *string `json:"currentStage"`
	LocalChurchID           *string `json:"localChurchId"`
	SectorID                *string `json:"sectorId"`
	TeamID                  *string `json:"teamId"`
}

func (h *Handler) add(c *gin.Context) {
	var p createPayload
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if p.FirstName == "" || p.Surname == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "firstName and surname are required"})
		return
	}

	role := ""
	if p.Role != nil {
		role = *p.Role
	}

	member, err := h.svc.AddMember(c.Request.Context(), AddMemberInput{
		FirstName:               p.FirstName,
		Surname:                 p.Surname,
		Role:                    role,
		Email:                   p.Email,
		PhoneNumber:             p.PhoneNumber,
		HomeAddress:             p.HomeAddress,
		Gender:                  p.Gender,
		DateOfBirthDay:          p.DateOfBirthDay,
		DateOfBirthMonth:        p.DateOfBirthMonth,
		MaritalStatus:           p.MaritalStatus,
		WeddingAnniversaryDay:   p.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: p.WeddingAnniversaryMonth,
		JobOccupation:           p.JobOccupation,
		PhotoURL:                p.PhotoURL,
		EmergencyContactName:    p.EmergencyContactName,
		EmergencyContactPhone:   p.EmergencyContactPhone,
		Allergies:               p.Allergies,
		MedicalNotes:            p.MedicalNotes,
		IsPlaceholder:           p.IsPlaceholder,
		SourceTeam:              p.SourceTeam,
		CurrentStage:            p.CurrentStage,
		LocalChurchID:           p.LocalChurchID,
		SectorID:                p.SectorID,
		TeamID:                  p.TeamID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, member)
}

func (h *Handler) update(c *gin.Context) {
	id := c.Param("id")
	var p createPayload
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if p.FirstName == "" || p.Surname == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "firstName and surname are required"})
		return
	}

	role := ""
	if p.Role != nil {
		role = *p.Role
	}

	member, err := h.svc.UpdateMember(c.Request.Context(), id, AddMemberInput{
		FirstName:               p.FirstName,
		Surname:                 p.Surname,
		Role:                    role,
		Email:                   p.Email,
		PhoneNumber:             p.PhoneNumber,
		HomeAddress:             p.HomeAddress,
		Gender:                  p.Gender,
		DateOfBirthDay:          p.DateOfBirthDay,
		DateOfBirthMonth:        p.DateOfBirthMonth,
		MaritalStatus:           p.MaritalStatus,
		WeddingAnniversaryDay:   p.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: p.WeddingAnniversaryMonth,
		JobOccupation:           p.JobOccupation,
		PhotoURL:                p.PhotoURL,
		EmergencyContactName:    p.EmergencyContactName,
		EmergencyContactPhone:   p.EmergencyContactPhone,
		Allergies:               p.Allergies,
		MedicalNotes:            p.MedicalNotes,
		IsPlaceholder:           p.IsPlaceholder,
		SourceTeam:              p.SourceTeam,
		CurrentStage:            p.CurrentStage,
		LocalChurchID:           p.LocalChurchID,
		SectorID:                p.SectorID,
		TeamID:                  p.TeamID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *Handler) delete(c *gin.Context) {
	userCtx, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	canDelete := userCtx.HasRole("super_admin") || userCtx.HasRole("church_admin") || userCtx.HasRole("resident_pastor") || userCtx.HasRole("team_lead")
	if !canDelete {
		c.JSON(http.StatusForbidden, gin.H{"error": "only team leads and admins can delete member records"})
		return
	}

	id := c.Param("id")
	err := h.svc.DeleteMember(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusCreated)
}

func (h *Handler) deleteGuardianRelationship(c *gin.Context) {
	relID := c.Param("rel_id")
	if err := h.svc.DeleteGuardianRelationship(c.Request.Context(), relID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

type profilePayload struct {
	Name         string  `json:"name"`
	FirstName    string  `json:"first_name"`
	Surname      string  `json:"surname"`
	Email        string  `json:"email"`
	Role         string  `json:"role"`
	CurrentStage *string `json:"current_stage"`
	TeamID       *string `json:"team_id"`
	SectorID     *string `json:"sector_id"`
	ChurchID     *string `json:"church_id"`
}

func (h *Handler) profile(c *gin.Context) {
	var p profilePayload
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	firstName := strings.TrimSpace(p.FirstName)
	surname := strings.TrimSpace(p.Surname)
	name := strings.TrimSpace(p.Name)
	if firstName == "" && surname == "" && name != "" {
		parts := strings.SplitN(name, " ", 2)
		firstName = parts[0]
		if len(parts) > 1 {
			surname = parts[1]
		}
	} else if name == "" && (firstName != "" || surname != "") {
		name = strings.TrimSpace(firstName + " " + surname)
	}

	if (name == "" && firstName == "") || p.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and email are required"})
		return
	}

	churchID := p.ChurchID
	var creatorID *uuid.UUID
	// If church_id not provided in payload, default to creator's church_id from context
	if creatorUser, ok := contracts.UserFromContext(c.Request.Context()); ok && creatorUser.ID != "" {
		if cid, err := uuid.Parse(creatorUser.ID); err == nil {
			creatorID = &cid
		}
		if churchID == nil || *churchID == "" {
			// Find creator's user record to get church_id
			if u, err := h.svc.repo.db.User.Get(c.Request.Context(), uuid.MustParse(creatorUser.ID)); err == nil && u.ChurchID != nil {
				cid := u.ChurchID.String()
				churchID = &cid
			}
		}
	}

	member, err := h.svc.ProfileMember(c.Request.Context(), ProfileMemberInput{
		FirstName:    firstName,
		Surname:      surname,
		Name:         name,
		Email:        p.Email,
		Role:         p.Role,
		CurrentStage: p.CurrentStage,
		TeamID:       p.TeamID,
		SectorID:     p.SectorID,
		ChurchID:     churchID,
		CreatedBy:    creatorID,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, member)
}

func (h *Handler) bulkProfile(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a CSV file is required under form field 'file'"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to open uploaded CSV file"})
		return
	}
	defer src.Close()

	var creatorID *uuid.UUID
	if creatorUser, ok := contracts.UserFromContext(c.Request.Context()); ok && creatorUser.ID != "" {
		if cid, err := uuid.Parse(creatorUser.ID); err == nil {
			creatorID = &cid
		}
	}

	res, err := h.svc.BulkImportCSV(c.Request.Context(), src, creatorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
	if visitorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "visitor_id is required"})
		return
	}
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	member, err := h.svc.ProfileVisitor(c.Request.Context(), visitorID, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, member)
}

func (h *Handler) bulkProfileJSON(c *gin.Context) {
	var payload struct {
		Members []AddMemberInput `json:"members"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	var creatorID *uuid.UUID
	if creatorUser, ok := contracts.UserFromContext(c.Request.Context()); ok && creatorUser.ID != "" {
		if cid, err := uuid.Parse(creatorUser.ID); err == nil {
			creatorID = &cid
		}
	}

	res, err := h.svc.BulkImportJSON(c.Request.Context(), payload.Members, creatorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}
