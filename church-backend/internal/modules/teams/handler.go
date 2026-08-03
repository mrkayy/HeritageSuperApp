package teams

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

// --- Route Registration ---

func (h *Handler) RegisterChurches(g *echo.Group) {
	g.GET("", h.listChurches)
	g.GET("/:id", h.getChurch)
	g.POST("", h.createChurch)
	g.PUT("/:id", h.updateChurch)
	g.DELETE("/:id", h.deleteChurch)
}

func (h *Handler) RegisterTeams(g *echo.Group) {
	g.GET("", h.listTeams)
	g.GET("/:id", h.getTeam)
	g.POST("", h.createTeam)
	g.PUT("/:id", h.updateTeam)
	g.DELETE("/:id", h.deleteTeam)
}

func (h *Handler) RegisterSectors(g *echo.Group) {
	g.GET("", h.listSectors)
	g.GET("/:id", h.getSector)
	g.POST("", h.createSector)
	g.PUT("/:id", h.updateSector)
	g.DELETE("/:id", h.deleteSector)
}

// --- Payloads ---

type churchPayload struct {
	Name        string `json:"name"`
	Center      string `json:"center"`
	Description string `json:"description"`
	Slug        string `json:"slug"`
}

type teamPayload struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	ChurchID    *string `json:"churchId"`
	SectorID    *string `json:"sectorId"`
}

type sectorPayload struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	ChurchID    *string `json:"churchId"`
}

// --- LocalChurch Handlers ---

func (h *Handler) listChurches(c echo.Context) error {
	churches, err := h.svc.ListChurches(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, churches)
}

func (h *Handler) getChurch(c echo.Context) error {
	id := c.Param("id")
	church, err := h.svc.GetChurch(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, church)
}

func (h *Handler) createChurch(c echo.Context) error {
	var payload churchPayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" || payload.Center == "" || payload.Slug == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name, center, and slug are required")
	}

	church, err := h.svc.CreateChurch(c.Request().Context(), payload.Name, payload.Center, payload.Description, payload.Slug)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, church)
}

func (h *Handler) updateChurch(c echo.Context) error {
	id := c.Param("id")
	var payload churchPayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" || payload.Center == "" || payload.Slug == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name, center, and slug are required")
	}

	church, err := h.svc.UpdateChurch(c.Request().Context(), id, payload.Name, payload.Center, payload.Description, payload.Slug)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, church)
}

func (h *Handler) deleteChurch(c echo.Context) error {
	id := c.Param("id")
	err := h.svc.DeleteChurch(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

// --- Team Handlers ---

func (h *Handler) listTeams(c echo.Context) error {
	teams, err := h.svc.ListTeams(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, teams)
}

func (h *Handler) getTeam(c echo.Context) error {
	id := c.Param("id")
	team, err := h.svc.GetTeam(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, team)
}

func (h *Handler) createTeam(c echo.Context) error {
	var payload teamPayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	team, err := h.svc.CreateTeamFull(c.Request().Context(), payload.Name, payload.Description, payload.ChurchID, payload.SectorID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, team)
}

func (h *Handler) updateTeam(c echo.Context) error {
	id := c.Param("id")
	var payload teamPayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	team, err := h.svc.UpdateTeam(c.Request().Context(), id, payload.Name, payload.Description, payload.ChurchID, payload.SectorID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, team)
}

func (h *Handler) deleteTeam(c echo.Context) error {
	id := c.Param("id")
	err := h.svc.DeleteTeam(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

// --- Sector Handlers ---

func (h *Handler) listSectors(c echo.Context) error {
	sectors, err := h.svc.ListSectors(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, sectors)
}

func (h *Handler) getSector(c echo.Context) error {
	id := c.Param("id")
	sector, err := h.svc.GetSector(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, sector)
}

func (h *Handler) createSector(c echo.Context) error {
	var payload sectorPayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	sector, err := h.svc.CreateSectorFull(c.Request().Context(), payload.Name, payload.Description, payload.ChurchID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, sector)
}

func (h *Handler) updateSector(c echo.Context) error {
	id := c.Param("id")
	var payload sectorPayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	sector, err := h.svc.UpdateSector(c.Request().Context(), id, payload.Name, payload.Description, payload.ChurchID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, sector)
}

func (h *Handler) deleteSector(c echo.Context) error {
	id := c.Param("id")
	err := h.svc.DeleteSector(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
