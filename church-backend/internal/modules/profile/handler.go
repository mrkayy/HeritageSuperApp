package profile

import (
	"net/http"
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
	FirstName       string  `json:"firstName"`
	LastName        string  `json:"lastName"`
	ProfileImageURL string  `json:"profileImageUrl"`
	DateOfBirth     *string `json:"dateOfBirth,omitempty"` // "YYYY-MM-DD"
	Address         string  `json:"address"`
	Email           string  `json:"email"`
	PhoneNumber     string  `json:"phoneNumber"`
	TeamID          *string `json:"teamId,omitempty"`
	TeamName        string  `json:"teamName,omitempty"`
	SectorID        *string `json:"sectorId,omitempty"`
	SectorName      string  `json:"sectorName,omitempty"`
}

func toOwnDTO(v OwnProfileView) profileDTO {
	dto := profileDTO{
		FirstName:       v.FirstName,
		LastName:        v.LastName,
		ProfileImageURL: v.ProfileImageURL,
		Address:         v.Address,
		Email:           v.Email,
		PhoneNumber:     v.PhoneNumber,
		TeamID:          v.TeamID,
		TeamName:        v.TeamName,
		SectorID:        v.SectorID,
		SectorName:      v.SectorName,
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

	err := h.svc.UpdateProfile(c.Request().Context(), user.ID, UpdateProfileInput{
		FirstName:       dto.FirstName,
		LastName:        dto.LastName,
		ProfileImageURL: dto.ProfileImageURL,
		DateOfBirth:     dob,
		Address:         dto.Address,
		Email:           user.Email,
		PhoneNumber:     dto.PhoneNumber,
		TeamID:          dto.TeamID,
		SectorID:        dto.SectorID,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
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
