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

func (h *Handler) RegisterTeams(g *echo.Group) {
	g.GET("", h.listTeams)
	g.POST("", h.createTeam)
}

func (h *Handler) RegisterSectors(g *echo.Group) {
	g.GET("", h.listSectors)
	g.POST("", h.createSector)
}

func (h *Handler) listTeams(c echo.Context) error {
	teams, err := h.svc.ListTeams(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, teams)
}

type namePayload struct {
	Name string `json:"name"`
}

func (h *Handler) createTeam(c echo.Context) error {
	var payload namePayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	t, err := h.svc.CreateTeam(c.Request().Context(), payload.Name)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, t)
}

func (h *Handler) listSectors(c echo.Context) error {
	sectors, err := h.svc.ListSectors(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, sectors)
}

func (h *Handler) createSector(c echo.Context) error {
	var payload namePayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}
	if payload.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	s, err := h.svc.CreateSector(c.Request().Context(), payload.Name)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, s)
}
