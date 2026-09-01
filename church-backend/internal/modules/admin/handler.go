package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterSuperAdminRoutes(g *gin.RouterGroup) {
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

func (h *Handler) RegisterGeneralOverseerRoutes(g *gin.RouterGroup) {
	g.GET("/members/search", h.searchUniversalMembers)
	g.GET("/members/:id/360-dossier", h.getMember360Dossier)
}

func (h *Handler) RegisterAnalyticsRoutes(g *gin.RouterGroup) {
	g.GET("/executive-summary", h.getExecutiveSummary)
}

// ---------------------------------------------------------------------------
// Local Churches Handlers
// ---------------------------------------------------------------------------

func (h *Handler) listChurches(c *gin.Context) {
	churches, err := h.svc.ListChurches(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, churches)
}

func (h *Handler) createChurch(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	var req contracts.CreateLocalChurchDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	dto, err := h.svc.CreateChurch(c.Request.Context(), req, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto)
}

func (h *Handler) updateChurch(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	id := c.Param("id")
	var req contracts.UpdateLocalChurchDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	dto, err := h.svc.UpdateChurch(c.Request.Context(), id, req, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto)
}

func (h *Handler) reassignLeadership(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	id := c.Param("id")
	var req contracts.ReassignLeadershipDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	err := h.svc.ReassignLeadership(c.Request.Context(), id, req, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "leadership reassigned successfully"})
}

func (h *Handler) toggleChurchStatus(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	id := c.Param("id")
	newStatus, err := h.svc.ToggleChurchStatus(c.Request.Context(), id, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"is_active": newStatus})
}

// ---------------------------------------------------------------------------
// Leadership Invitations Handlers
// ---------------------------------------------------------------------------

func (h *Handler) listLeadershipInvites(c *gin.Context) {
	invites, err := h.svc.ListLeadershipInvites(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, invites)
}

func (h *Handler) createLeadershipInvite(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	var req contracts.CreateLeadershipInviteDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	dto, err := h.svc.CreateLeadershipInvite(c.Request.Context(), req, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto)
}

func (h *Handler) revokeLeadershipInvite(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	id := c.Param("id")
	err := h.svc.RevokeLeadershipInvite(c.Request.Context(), id, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invitation revoked"})
}

// ---------------------------------------------------------------------------
// Universal Member Intelligence Dossier Handlers
// ---------------------------------------------------------------------------

func (h *Handler) searchUniversalMembers(c *gin.Context) {
	q := c.Query("q")
	results, err := h.svc.SearchUniversalMembers(c.Request.Context(), q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func (h *Handler) getMember360Dossier(c *gin.Context) {
	id := c.Param("id")
	dossier, err := h.svc.GetMember360Dossier(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dossier)
}

// ---------------------------------------------------------------------------
// Executive Analytics Handlers
// ---------------------------------------------------------------------------

func (h *Handler) getExecutiveSummary(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	summary, err := h.svc.GetExecutiveAnalytics(c.Request.Context(), actor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

// ---------------------------------------------------------------------------
// Security Audit Logs Handlers
// ---------------------------------------------------------------------------

func (h *Handler) listAuditLogs(c *gin.Context) {
	limitStr := c.Query("limit")
	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}

	logs, err := h.svc.ListAuditLogs(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// ---------------------------------------------------------------------------
// System Settings & Governance Handlers
// ---------------------------------------------------------------------------

func (h *Handler) getSystemSettings(c *gin.Context) {
	settings, err := h.svc.GetSystemSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) updateSystemSettings(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	var req contracts.UpdateSystemSettingsDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	dto, err := h.svc.UpdateSystemSettings(c.Request.Context(), req, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto)
}

func (h *Handler) getRolePermissions(c *gin.Context) {
	perms, err := h.svc.GetRolePermissions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, perms)
}

func (h *Handler) updateRolePermissions(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	var req contracts.UpdateRolePermissionsDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	dto, err := h.svc.UpdateRolePermissions(c.Request.Context(), req, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto)
}

func (h *Handler) getSystemDiagnostics(c *gin.Context) {
	diagnostics, err := h.svc.GetSystemDiagnostics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, diagnostics)
}

func (h *Handler) getChurchSettings(c *gin.Context) {
	id := c.Param("id")
	settings, err := h.svc.GetChurchSettings(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

type updateChurchSettingsInput struct {
	FoundationClassMinAttendance int `json:"foundation_class_min_attendance"`
}

func (h *Handler) updateChurchSettings(c *gin.Context) {
	actor, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	id := c.Param("id")
	var req updateChurchSettingsInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	dto, err := h.svc.UpdateChurchSettings(c.Request.Context(), id, req.FoundationClassMinAttendance, actor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto)
}
