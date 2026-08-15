package membership

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Register defines this module's endpoints on the group.
func (h *Handler) Register(g *echo.Group) {
	g.GET("", h.list)
	g.GET("/stage-counts", h.stageCounts)
	g.GET("/:id", h.get)
	g.POST("", h.add)
	g.POST("/profile", h.profile)
	g.POST("/bulk-profile", h.bulkProfile)
	g.POST("/bulk-profile-json", h.bulkProfileJSON)
	g.PUT("/:id", h.update)
	g.DELETE("/:id", h.delete)

	// Guardian Relationships
	g.GET("/:id/relationships", h.getGuardianRelationships)
	g.POST("/relationships", h.addGuardianRelationship)
	g.DELETE("/relationships/:rel_id", h.deleteGuardianRelationship)
}

func (h *Handler) list(c echo.Context) error {
	pageStr := c.QueryParam("page")
	if pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(c.QueryParam("limit"))
		search := c.QueryParam("search")
		stage := c.QueryParam("stage")
		teamID := c.QueryParam("teamId")

		if page < 1 {
			page = 1
		}
		if limit < 1 {
			limit = 50
		}

		members, total, err := h.svc.ListMembersPaginated(c.Request().Context(), page, limit, search, stage, teamID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}

		totalPages := (total + limit - 1) / limit

		return c.JSON(http.StatusOK, echo.Map{
			"members":    members,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		})
	}

	teamID := c.QueryParam("teamId")
	members, err := h.svc.ListMembers(c.Request().Context(), teamID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, members)
}

func (h *Handler) stageCounts(c echo.Context) error {
	counts, err := h.svc.GetStageCounts(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, counts)
}

func (h *Handler) get(c echo.Context) error {
	id := c.Param("id")
	member, err := h.svc.GetMember(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, member)
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

func (h *Handler) add(c echo.Context) error {
	var p createPayload
	if err := c.Bind(&p); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if p.FirstName == "" || p.Surname == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "firstName and surname are required")
	}

	role := ""
	if p.Role != nil {
		role = *p.Role
	}

	member, err := h.svc.AddMember(c.Request().Context(), AddMemberInput{
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
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, member)
}

func (h *Handler) update(c echo.Context) error {
	id := c.Param("id")
	var p createPayload
	if err := c.Bind(&p); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if p.FirstName == "" || p.Surname == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "firstName and surname are required")
	}

	role := ""
	if p.Role != nil {
		role = *p.Role
	}

	member, err := h.svc.UpdateMember(c.Request().Context(), id, AddMemberInput{
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
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, member)
}

func (h *Handler) delete(c echo.Context) error {
	id := c.Param("id")
	err := h.svc.DeleteMember(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) getGuardianRelationships(c echo.Context) error {
	memberID := c.Param("id")
	rels, err := h.svc.GetGuardianRelationships(c.Request().Context(), memberID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, rels)
}

func (h *Handler) addGuardianRelationship(c echo.Context) error {
	var in GuardianRelationshipInput
	if err := c.Bind(&in); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if err := h.svc.AddGuardianRelationship(c.Request().Context(), in); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusCreated)
}

func (h *Handler) deleteGuardianRelationship(c echo.Context) error {
	relID := c.Param("rel_id")
	if err := h.svc.DeleteGuardianRelationship(c.Request().Context(), relID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
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

func (h *Handler) profile(c echo.Context) error {
	var p profilePayload
	if err := c.Bind(&p); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
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
		return echo.NewHTTPError(http.StatusBadRequest, "name and email are required")
	}

	churchID := p.ChurchID
	var creatorID *uuid.UUID
	// If church_id not provided in payload, default to creator's church_id from context
	if creatorUser, ok := contracts.UserFromContext(c.Request().Context()); ok && creatorUser.ID != "" {
		if cid, err := uuid.Parse(creatorUser.ID); err == nil {
			creatorID = &cid
		}
		if churchID == nil || *churchID == "" {
			// Find creator's user record to get church_id
			if u, err := h.svc.repo.db.User.Get(c.Request().Context(), uuid.MustParse(creatorUser.ID)); err == nil && u.ChurchID != nil {
				cid := u.ChurchID.String()
				churchID = &cid
			}
		}
	}

	member, err := h.svc.ProfileMember(c.Request().Context(), ProfileMemberInput{
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
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, member)
}

func (h *Handler) bulkProfile(c echo.Context) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "a CSV file is required under form field 'file'")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "failed to open uploaded CSV file")
	}
	defer src.Close()

	var creatorID *uuid.UUID
	if creatorUser, ok := contracts.UserFromContext(c.Request().Context()); ok && creatorUser.ID != "" {
		if cid, err := uuid.Parse(creatorUser.ID); err == nil {
			creatorID = &cid
		}
	}

	res, err := h.svc.BulkImportCSV(c.Request().Context(), src, creatorID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, res)
}

func (h *Handler) bulkProfileJSON(c echo.Context) error {
	var payload struct {
		Members []AddMemberInput `json:"members"`
	}

	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request payload")
	}

	var creatorID *uuid.UUID
	if creatorUser, ok := contracts.UserFromContext(c.Request().Context()); ok && creatorUser.ID != "" {
		if cid, err := uuid.Parse(creatorUser.ID); err == nil {
			creatorID = &cid
		}
	}

	res, err := h.svc.BulkImportJSON(c.Request().Context(), payload.Members, creatorID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, res)
}
