package membership

import (
	"net/http"

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
