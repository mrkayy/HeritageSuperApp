package souls

import (
	"net/http"

	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(g *echo.Group) {
	g.POST("", h.createSoul)
	g.GET("", h.listSouls)
	g.GET("/:id", h.getSoul)
	g.PATCH("/:id", h.updateSoul)
	g.DELETE("/:id", h.deleteSoul)
	g.POST("/:id/journal", h.addJournal)
	g.GET("/:id/journal", h.getJournals)
}

type journalPayload struct {
	Note string `json:"note"`
}

func (h *Handler) createSoul(c echo.Context) error {
	var input contracts.CreateSoulDTO
	if err := c.Bind(&input); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	user, ok := contracts.UserFromContext(c.Request().Context())
	addedByUserID := ""
	if ok {
		addedByUserID = user.ID
	}

	soul, err := h.svc.CreateSoul(c.Request().Context(), input, addedByUserID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, soul)
}

func (h *Handler) listSouls(c echo.Context) error {
	var filter contracts.SoulFilter

	if uid := c.QueryParam("user_id"); uid != "" {
		filter.UserID = &uid
	}
	if status := c.QueryParam("response_status"); status != "" {
		s := contracts.ResponseStatus(status)
		filter.ResponseStatus = &s
	}
	if sectorID := c.QueryParam("sector_id"); sectorID != "" {
		filter.SectorID = &sectorID
	}
	if teamID := c.QueryParam("team_id"); teamID != "" {
		filter.TeamID = &teamID
	}

	souls, err := h.svc.ListSouls(c.Request().Context(), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, souls)
}

func (h *Handler) getSoul(c echo.Context) error {
	id := c.Param("id")
	soul, err := h.svc.GetSoul(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, soul)
}

func (h *Handler) updateSoul(c echo.Context) error {
	id := c.Param("id")
	var input contracts.UpdateSoulDTO
	if err := c.Bind(&input); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	soul, err := h.svc.UpdateSoul(c.Request().Context(), id, input)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, soul)
}

func (h *Handler) deleteSoul(c echo.Context) error {
	id := c.Param("id")
	if err := h.svc.DeleteSoul(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) addJournal(c echo.Context) error {
	soulID := c.Param("id")
	var payload journalPayload
	if err := c.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	var userIDPtr *string
	if user, ok := contracts.UserFromContext(c.Request().Context()); ok && user.ID != "" {
		uid := user.ID
		userIDPtr = &uid
	}

	journal, err := h.svc.AddSoulJournal(c.Request().Context(), soulID, userIDPtr, payload.Note)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, journal)
}

func (h *Handler) getJournals(c echo.Context) error {
	soulID := c.Param("id")
	journals, err := h.svc.GetSoulJournals(c.Request().Context(), soulID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, journals)
}
