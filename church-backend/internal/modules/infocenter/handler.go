package infocenter

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(g *gin.RouterGroup) {
	// Visitor CRUD
	g.POST("/visitors", h.createVisitor)
	g.POST("/visitors/bulk", h.bulkImportVisitors)
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

func (h *Handler) bulkImportVisitors(c *gin.Context) {
	var payload struct {
		Visitors []contracts.CreateVisitorDTO `json:"visitors"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	res, err := h.svc.BulkImportVisitors(c.Request.Context(), payload.Visitors, user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) createVisitor(c *gin.Context) {
	var input contracts.CreateVisitorDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	v, err := h.svc.CreateVisitor(c.Request.Context(), input, user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, v)
}

func (h *Handler) listVisitors(c *gin.Context) {
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	churchID, err := h.svc.repo.GetUserChurchID(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	filter := contracts.VisitorFilter{
		ChurchID: churchID.String(),
	}

	if q := c.Query("query"); q != "" {
		filter.Query = q
	}
	if status := c.Query("status"); status != "" {
		s := contracts.VisitorStatus(status)
		filter.Status = &s
	}

	visitors, err := h.svc.ListVisitors(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, visitors)
}

func (h *Handler) getVisitor(c *gin.Context) {
	id := c.Param("id")
	v, err := h.svc.GetVisitor(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *Handler) updateVisitor(c *gin.Context) {
	id := c.Param("id")
	var input contracts.UpdateVisitorDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	v, err := h.svc.UpdateVisitor(c.Request.Context(), id, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *Handler) checkPhone(c *gin.Context) {
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	phone := c.Query("phone")
	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone query param is required"})
		return
	}

	v, err := h.svc.CheckPhone(c.Request.Context(), user.ID, phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if v == nil {
		c.JSON(http.StatusOK, gin.H{
			"exists":  false,
			"visitor": nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"exists":  true,
		"visitor": v,
	})
}

// ---------------------------------------------------------------------------
// Attendance handlers
// ---------------------------------------------------------------------------

func (h *Handler) markAttendance(c *gin.Context) {
	var input contracts.MarkAttendanceDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	record, err := h.svc.MarkAttendance(c.Request.Context(), input, user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, record)
}

func (h *Handler) getVisitorAttendance(c *gin.Context) {
	visitorID := c.Param("id")
	records, err := h.svc.GetVisitorAttendance(c.Request.Context(), visitorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

// ---------------------------------------------------------------------------
// Foundation class handlers
// ---------------------------------------------------------------------------

func (h *Handler) getFoundationCandidates(c *gin.Context) {
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	candidates, err := h.svc.GetFoundationCandidates(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, candidates)
}

func (h *Handler) recommendForFoundationClass(c *gin.Context) {
	visitorID := c.Param("visitor_id")

	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input contracts.FoundationRecommendationDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		// Body is optional; ignore bind errors
		input = contracts.FoundationRecommendationDTO{}
	}

	todo, err := h.svc.RecommendForFoundationClass(c.Request.Context(), visitorID, user.ID, input.Notes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, todo)
}

// ---------------------------------------------------------------------------
// Church settings handlers
// ---------------------------------------------------------------------------

func (h *Handler) getSettings(c *gin.Context) {
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	settings, err := h.svc.GetSettings(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) updateSettings(c *gin.Context) {
	user, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	canManageSettings := user.HasRole("super_admin") || user.HasRole("church_admin") || user.HasRole("resident_pastor") || user.HasRole("team_lead")
	if !canManageSettings {
		c.JSON(http.StatusForbidden, gin.H{"error": "only team leads and admins can change attendance threshold settings"})
		return
	}

	var input contracts.UpdateChurchSettingDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	settings, err := h.svc.UpdateSettings(c.Request.Context(), user.ID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}
