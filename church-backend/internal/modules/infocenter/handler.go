package infocenter

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
	// Visitor CRUD
	g.POST("/visitors", h.createVisitor)
	g.GET("/visitors", h.listVisitors)
	g.GET("/visitors/check-phone", h.checkPhone)
	g.GET("/visitors/:id", h.getVisitor)
	g.PATCH("/visitors/:id", h.updateVisitor)

	// Attendance
	g.POST("/attendance/mark", h.markAttendance)
	g.GET("/visitors/:id/attendance", h.getVisitorAttendance)

	// Foundation class
	g.GET("/foundation-candidates", h.getFoundationCandidates)
	g.POST("/foundation-recommendations/:visitor_id", h.recommendForFoundationClass)

	// Church settings
	g.GET("/settings", h.getSettings)
	g.PUT("/settings", h.updateSettings)
}

// ---------------------------------------------------------------------------
// Visitor handlers
// ---------------------------------------------------------------------------

func (h *Handler) createVisitor(c echo.Context) error {
	var input contracts.CreateVisitorDTO
	if err := c.Bind(&input); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	v, err := h.svc.CreateVisitor(c.Request().Context(), input, user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, v)
}

func (h *Handler) listVisitors(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	churchID, err := h.svc.repo.GetUserChurchID(c.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	filter := contracts.VisitorFilter{
		ChurchID: churchID.String(),
	}

	if q := c.QueryParam("query"); q != "" {
		filter.Query = q
	}
	if status := c.QueryParam("status"); status != "" {
		s := contracts.VisitorStatus(status)
		filter.Status = &s
	}

	visitors, err := h.svc.ListVisitors(c.Request().Context(), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, visitors)
}

func (h *Handler) getVisitor(c echo.Context) error {
	id := c.Param("id")
	v, err := h.svc.GetVisitor(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, v)
}

func (h *Handler) updateVisitor(c echo.Context) error {
	id := c.Param("id")
	var input contracts.UpdateVisitorDTO
	if err := c.Bind(&input); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	v, err := h.svc.UpdateVisitor(c.Request().Context(), id, input)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, v)
}

func (h *Handler) checkPhone(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	phone := c.QueryParam("phone")
	if phone == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "phone query param is required")
	}

	v, err := h.svc.CheckPhone(c.Request().Context(), user.ID, phone)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	if v == nil {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"exists":  false,
			"visitor": nil,
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"exists":  true,
		"visitor": v,
	})
}

// ---------------------------------------------------------------------------
// Attendance handlers
// ---------------------------------------------------------------------------

func (h *Handler) markAttendance(c echo.Context) error {
	var input contracts.MarkAttendanceDTO
	if err := c.Bind(&input); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	record, err := h.svc.MarkAttendance(c.Request().Context(), input, user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, record)
}

func (h *Handler) getVisitorAttendance(c echo.Context) error {
	visitorID := c.Param("id")
	records, err := h.svc.GetVisitorAttendance(c.Request().Context(), visitorID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, records)
}

// ---------------------------------------------------------------------------
// Foundation class handlers
// ---------------------------------------------------------------------------

func (h *Handler) getFoundationCandidates(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	candidates, err := h.svc.GetFoundationCandidates(c.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, candidates)
}

func (h *Handler) recommendForFoundationClass(c echo.Context) error {
	visitorID := c.Param("visitor_id")

	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	var input contracts.FoundationRecommendationDTO
	if err := c.Bind(&input); err != nil {
		// Body is optional; ignore bind errors
		input = contracts.FoundationRecommendationDTO{}
	}

	todo, err := h.svc.RecommendForFoundationClass(c.Request().Context(), visitorID, user.ID, input.Notes)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, todo)
}

// ---------------------------------------------------------------------------
// Church settings handlers
// ---------------------------------------------------------------------------

func (h *Handler) getSettings(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	settings, err := h.svc.GetSettings(c.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, settings)
}

func (h *Handler) updateSettings(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	var input contracts.UpdateChurchSettingDTO
	if err := c.Bind(&input); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	settings, err := h.svc.UpdateSettings(c.Request().Context(), user.ID, input)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, settings)
}
