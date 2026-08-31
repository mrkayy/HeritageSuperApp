package admin

import (
	"net/http"
	"strconv"

	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterSuperAdminRoutes(g *echo.Group) {
	// Local Churches (Branches)
	g.GET("/churches", h.listChurches)
	g.POST("/churches", h.createChurch)
	g.PUT("/churches/:id", h.updateChurch)
	g.POST("/churches/:id/reassign-leadership", h.reassignLeadership)
	g.POST("/churches/:id/toggle-status", h.toggleChurchStatus)

	// Leadership Invitations
	g.GET("/leadership/invites", h.listLeadershipInvites)
	g.POST("/leadership/invite", h.createLeadershipInvite)
	g.DELETE("/leadership/invites/:id", h.revokeLeadershipInvite)

	// Security Audit Logs
	g.GET("/audit-logs", h.listAuditLogs)

	// System Settings & Governance
	g.GET("/settings", h.getSystemSettings)
	g.PUT("/settings", h.updateSystemSettings)
	g.GET("/settings/permissions", h.getRolePermissions)
	g.PUT("/settings/permissions", h.updateRolePermissions)
	g.GET("/settings/diagnostics", h.getSystemDiagnostics)
	g.GET("/settings/churches/:id", h.getChurchSettings)
	g.PUT("/settings/churches/:id", h.updateChurchSettings)
}

func (h *Handler) RegisterGeneralOverseerRoutes(g *echo.Group) {
	g.GET("/members/search", h.searchUniversalMembers)
	g.GET("/members/:id/360-dossier", h.getMember360Dossier)
}

func (h *Handler) RegisterAnalyticsRoutes(g *echo.Group) {
	g.GET("/executive-summary", h.getExecutiveSummary)
}

// ---------------------------------------------------------------------------
// Local Churches Handlers
// ---------------------------------------------------------------------------

func (h *Handler) listChurches(c echo.Context) error {
	churches, err := h.svc.ListChurches(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, churches)
}

func (h *Handler) createChurch(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	var req contracts.CreateLocalChurchDTO
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request body"})
	}

	dto, err := h.svc.CreateChurch(c.Request().Context(), req, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusCreated, dto)
}

func (h *Handler) updateChurch(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	id := c.Param("id")
	var req contracts.UpdateLocalChurchDTO
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request body"})
	}

	dto, err := h.svc.UpdateChurch(c.Request().Context(), id, req, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, dto)
}

func (h *Handler) reassignLeadership(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	id := c.Param("id")
	var req contracts.ReassignLeadershipDTO
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request body"})
	}

	err := h.svc.ReassignLeadership(c.Request().Context(), id, req, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "leadership reassigned successfully"})
}

func (h *Handler) toggleChurchStatus(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	id := c.Param("id")
	newStatus, err := h.svc.ToggleChurchStatus(c.Request().Context(), id, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]any{"is_active": newStatus})
}

// ---------------------------------------------------------------------------
// Leadership Invitations Handlers
// ---------------------------------------------------------------------------

func (h *Handler) listLeadershipInvites(c echo.Context) error {
	invites, err := h.svc.ListLeadershipInvites(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, invites)
}

func (h *Handler) createLeadershipInvite(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	var req contracts.CreateLeadershipInviteDTO
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request body"})
	}

	dto, err := h.svc.CreateLeadershipInvite(c.Request().Context(), req, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusCreated, dto)
}

func (h *Handler) revokeLeadershipInvite(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	id := c.Param("id")
	err := h.svc.RevokeLeadershipInvite(c.Request().Context(), id, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "invitation revoked"})
}

// ---------------------------------------------------------------------------
// Universal Member Intelligence Dossier Handlers
// ---------------------------------------------------------------------------

func (h *Handler) searchUniversalMembers(c echo.Context) error {
	q := c.QueryParam("q")
	results, err := h.svc.SearchUniversalMembers(c.Request().Context(), q)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, results)
}

func (h *Handler) getMember360Dossier(c echo.Context) error {
	id := c.Param("id")
	dossier, err := h.svc.GetMember360Dossier(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, dossier)
}

// ---------------------------------------------------------------------------
// Executive Analytics Handlers
// ---------------------------------------------------------------------------

func (h *Handler) getExecutiveSummary(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	summary, err := h.svc.GetExecutiveAnalytics(c.Request().Context(), actor)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, summary)
}

// ---------------------------------------------------------------------------
// Security Audit Logs Handlers
// ---------------------------------------------------------------------------

func (h *Handler) listAuditLogs(c echo.Context) error {
	limitStr := c.QueryParam("limit")
	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}

	logs, err := h.svc.ListAuditLogs(c.Request().Context(), limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, logs)
}

// ---------------------------------------------------------------------------
// System Settings & Governance Handlers
// ---------------------------------------------------------------------------

func (h *Handler) getSystemSettings(c echo.Context) error {
	settings, err := h.svc.GetSystemSettings(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, settings)
}

func (h *Handler) updateSystemSettings(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	var req contracts.UpdateSystemSettingsDTO
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request body"})
	}

	dto, err := h.svc.UpdateSystemSettings(c.Request().Context(), req, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, dto)
}

func (h *Handler) getRolePermissions(c echo.Context) error {
	perms, err := h.svc.GetRolePermissions(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, perms)
}

func (h *Handler) updateRolePermissions(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	var req contracts.UpdateRolePermissionsDTO
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request body"})
	}

	dto, err := h.svc.UpdateRolePermissions(c.Request().Context(), req, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, dto)
}

func (h *Handler) getSystemDiagnostics(c echo.Context) error {
	diagnostics, err := h.svc.GetSystemDiagnostics(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, diagnostics)
}

func (h *Handler) getChurchSettings(c echo.Context) error {
	id := c.Param("id")
	settings, err := h.svc.GetChurchSettings(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, settings)
}

type updateChurchSettingsInput struct {
	FoundationClassMinAttendance int `json:"foundation_class_min_attendance"`
}

func (h *Handler) updateChurchSettings(c echo.Context) error {
	actor, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	id := c.Param("id")
	var req updateChurchSettingsInput
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request body"})
	}

	dto, err := h.svc.UpdateChurchSettings(c.Request().Context(), id, req.FoundationClassMinAttendance, actor)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, dto)
}

