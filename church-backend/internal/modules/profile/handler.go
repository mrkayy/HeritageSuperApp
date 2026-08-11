package profile

import (
	"net/http"
	"strings"
	"time"

	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/platform/middleware"
	"github.com/labstack/echo/v4"
)

const dateLayout = "2006-01-02"

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(g *echo.Group) {
	g.GET("/me", h.getOwn)
	g.PUT("/me", h.updateOwn)
	g.GET("/me/kids", h.listKids)
	g.POST("/me/kids", h.addKid)
	g.PUT("/me/kids/:kidID", h.updateKid)
	g.DELETE("/me/kids/:kidID", h.deleteKid)

	// Viewing someone else's profile gets a role gate
	g.GET("/:userID", h.getOther, middleware.RequireAnyRole(
		string(contracts.RoleChurchAdmin),
		string(contracts.RoleTeamLead),
		string(contracts.RoleResidentPastor),
		string(contracts.RoleSteward),
		string(contracts.RoleMember),
		string(contracts.RoleGuest),
	))
}

type profileDTO struct {
	FirstName               string  `json:"firstName"`
	LastName                string  `json:"lastName"`
	ProfileImageURL         string  `json:"profileImageUrl"`
	DateOfBirth             *string `json:"dateOfBirth,omitempty"` // "YYYY-MM-DD"
	Address                 string  `json:"address"`
	Email                   string  `json:"email"`
	PhoneNumber             string  `json:"phoneNumber"`
	TeamID                  *string `json:"teamId,omitempty"`
	TeamName                string  `json:"teamName,omitempty"`
	SectorID                *string `json:"sectorId,omitempty"`
	SectorName              string  `json:"sectorName,omitempty"`
	ChurchID                *string `json:"churchId,omitempty"`
	ChurchName              string  `json:"churchName,omitempty"`
	LocalChurchID           *string `json:"localChurchId,omitempty"`
	LocalChurchName         string  `json:"localChurchName,omitempty"`
	MaritalStatus           *string `json:"maritalStatus,omitempty"`
	WeddingAnniversaryDay   *int16  `json:"weddingAnniversaryDay,omitempty"`
	WeddingAnniversaryMonth *int16  `json:"weddingAnniversaryMonth,omitempty"`
	JobOccupation           *string `json:"jobOccupation,omitempty"`
	Allergies               *string `json:"allergies,omitempty"`
	MedicalNotes            *string `json:"medicalNotes,omitempty"`
	EmergencyContactName    *string `json:"emergencyContactName,omitempty"`
	EmergencyContactPhone   *string `json:"emergencyContactPhone,omitempty"`
	DateOfBirthDay          *int16  `json:"dateOfBirthDay,omitempty"`
	DateOfBirthMonth        *int16  `json:"dateOfBirthMonth,omitempty"`
}

func toOwnDTO(v OwnProfileView) profileDTO {
	dto := profileDTO{
		FirstName:               v.FirstName,
		LastName:                v.LastName,
		ProfileImageURL:         v.ProfileImageURL,
		Address:                 v.Address,
		Email:                   v.Email,
		PhoneNumber:             v.PhoneNumber,
		TeamID:                  v.TeamID,
		TeamName:                v.TeamName,
		SectorID:                v.SectorID,
		SectorName:              v.SectorName,
		ChurchID:                v.ChurchID,
		ChurchName:              v.ChurchName,
		LocalChurchID:           v.ChurchID,
		LocalChurchName:         v.ChurchName,
		MaritalStatus:           v.MaritalStatus,
		WeddingAnniversaryDay:   v.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: v.WeddingAnniversaryMonth,
		JobOccupation:           v.JobOccupation,
		Allergies:               v.Allergies,
		MedicalNotes:            v.MedicalNotes,
		EmergencyContactName:    v.EmergencyContactName,
		EmergencyContactPhone:   v.EmergencyContactPhone,
		DateOfBirthDay:          v.DateOfBirthDay,
		DateOfBirthMonth:        v.DateOfBirthMonth,
	}
	if v.DateOfBirth != nil {
		s := v.DateOfBirth.Format(dateLayout)
		dto.DateOfBirth = &s
	}
	return dto
}

func toContractDTO(p contracts.Profile) profileDTO {
	return profileDTO{
		FirstName:       p.FirstName,
		LastName:        p.LastName,
		ProfileImageURL: p.ProfileImageURL,
		Address:         p.Address,
		Email:           p.Email,
		PhoneNumber:     p.PhoneNumber,
		TeamID:          p.TeamID,
		TeamName:        p.TeamName,
		SectorID:        p.SectorID,
		SectorName:      p.SectorName,
	}
}

func (h *Handler) getOwn(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}
	view, err := h.svc.GetOwnProfile(c.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, toOwnDTO(view))
}

func (h *Handler) updateOwn(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	var dto profileDTO
	if err := c.Bind(&dto); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}

	var dob *time.Time
	if dto.DateOfBirth != nil && *dto.DateOfBirth != "" {
		parsed, err := time.Parse(dateLayout, *dto.DateOfBirth)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "dateOfBirth must be YYYY-MM-DD")
		}
		dob = &parsed
	}

	churchID := dto.ChurchID
	if churchID == nil {
		churchID = dto.LocalChurchID
	}

	err := h.svc.UpdateProfile(c.Request().Context(), user.ID, UpdateProfileInput{
		FirstName:               dto.FirstName,
		LastName:                dto.LastName,
		ProfileImageURL:         dto.ProfileImageURL,
		DateOfBirth:             dob,
		Address:                 dto.Address,
		Email:                   user.Email,
		PhoneNumber:             dto.PhoneNumber,
		TeamID:                  dto.TeamID,
		SectorID:                dto.SectorID,
		ChurchID:                churchID,
		MaritalStatus:           dto.MaritalStatus,
		WeddingAnniversaryDay:   dto.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: dto.WeddingAnniversaryMonth,
		JobOccupation:           dto.JobOccupation,
		Allergies:               dto.Allergies,
		MedicalNotes:            dto.MedicalNotes,
		EmergencyContactName:    dto.EmergencyContactName,
		EmergencyContactPhone:   dto.EmergencyContactPhone,
		DateOfBirthDay:          dto.DateOfBirthDay,
		DateOfBirthMonth:        dto.DateOfBirthMonth,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	view, err := h.svc.GetOwnProfile(c.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, toOwnDTO(view))
}

func (h *Handler) getOther(c echo.Context) error {
	targetID := c.Param("userID")
	p, err := h.svc.GetProfile(c.Request().Context(), targetID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "not found")
	}
	return c.JSON(http.StatusOK, toContractDTO(p))
}

func (h *Handler) listKids(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	kids, err := h.svc.ListKids(c.Request().Context(), user.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, kids)
}

func (h *Handler) addKid(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	var child contracts.Member
	if err := c.Bind(&child); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	created, err := h.svc.AddKid(c.Request().Context(), user.Email, child)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *Handler) updateKid(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	kidID := c.Param("kidID")
	var child contracts.Member
	if err := c.Bind(&child); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	updated, err := h.svc.UpdateKid(c.Request().Context(), user.Email, kidID, child)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *Handler) deleteKid(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	kidID := c.Param("kidID")
	err := h.svc.DeleteKid(c.Request().Context(), user.Email, kidID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

type userListDTO struct {
	UserID     string                `json:"user_id"`
	MemberID   string                `json:"member_id"`
	FirstName  string                `json:"first_name"`
	LastName   string                `json:"last_name"`
	Email      string                `json:"email"`
	Role       string                `json:"role"`
	UserTeam   []userTeamDetailDTO   `json:"user_team"`
	UserSector []userSectorDetailDTO `json:"user_sector"`
}

type userTeamDetailDTO struct {
	Team teamSubDTO `json:"team"`
}

type teamSubDTO struct {
	TeamID string `json:"team_id"`
	Name   string `json:"name"`
}

type userSectorDetailDTO struct {
	Sector sectorSubDTO `json:"sector"`
}

type sectorSubDTO struct {
	SectorID   string `json:"sector_id"`
	SectorName string `json:"sector_name"`
}

type updateRolePayload struct {
	Role string `json:"role"`
}

func (h *Handler) RegisterUsers(g *echo.Group) {
	g.GET("", h.listUsers)
	g.PUT("/:userID/role", h.updateUserRole)
	g.PATCH("/:userID/role", h.updateUserRole)
}

func (h *Handler) updateUserRole(c echo.Context) error {
	userID := c.Param("userID")
	var p updateRolePayload
	if err := c.Bind(&p); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if !contracts.IsValidRole(p.Role) {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid role: "+p.Role)
	}

	if err := h.svc.UpdateUserRole(c.Request().Context(), userID, p.Role); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "user role updated successfully"})
}

func (h *Handler) listUsers(c echo.Context) error {
	users, err := h.svc.ListUsers(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Fetch all members to match email -> ID
	members, err := h.svc.repo.db.Member.Query().All(c.Request().Context())
	memberMap := make(map[string]string)
	if err == nil {
		for _, m := range members {
			if m.Email != nil && *m.Email != "" {
				memberMap[strings.ToLower(*m.Email)] = m.ID.String()
			}
		}
	}

	out := make([]userListDTO, 0, len(users))
	for _, u := range users {
		memberID := ""
		if id, ok := memberMap[strings.ToLower(u.Email)]; ok {
			memberID = id
		}

		userTeams := make([]userTeamDetailDTO, 0)
		if u.Edges.Team != nil {
			userTeams = append(userTeams, userTeamDetailDTO{
				Team: teamSubDTO{
					TeamID: u.Edges.Team.ID.String(),
					Name:   u.Edges.Team.Name,
				},
			})
		}

		userSectors := make([]userSectorDetailDTO, 0)
		if u.Edges.Sector != nil {
			userSectors = append(userSectors, userSectorDetailDTO{
				Sector: sectorSubDTO{
					SectorID:   u.Edges.Sector.ID.String(),
					SectorName: u.Edges.Sector.SectorName,
				},
			})
		}

		out = append(out, userListDTO{
			UserID:     u.ID.String(),
			MemberID:   memberID,
			FirstName:  u.FirstName,
			LastName:   u.LastName,
			Email:      u.Email,
			Role:       string(u.Role),
			UserTeam:   userTeams,
			UserSector: userSectors,
		})
	}

	return c.JSON(http.StatusOK, out)
}
