package membership

import (
	"net/http"
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
	g.GET("/:id", h.get)
	g.POST("", h.add)
	g.POST("/profile", h.profile)
	g.PUT("/:id", h.update)
	g.DELETE("/:id", h.delete)
}

func (h *Handler) list(c echo.Context) error {
	members, err := h.svc.ListMembers(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, members)
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

	member, err := h.svc.AddMember(c.Request().Context(), AddMemberInput{
		FirstName:               p.FirstName,
		Surname:                 p.Surname,
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

	member, err := h.svc.UpdateMember(c.Request().Context(), id, AddMemberInput{
		FirstName:               p.FirstName,
		Surname:                 p.Surname,
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
