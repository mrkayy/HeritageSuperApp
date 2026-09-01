package souls

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

func (h *Handler) createSoul(c *gin.Context) {
	var input contracts.CreateSoulDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, ok := contracts.UserFromContext(c.Request.Context())
	addedByUserID := ""
	if ok {
		addedByUserID = user.ID
	}

	soul, err := h.svc.CreateSoul(c.Request.Context(), input, addedByUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, soul)
}

func (h *Handler) listSouls(c *gin.Context) {
	var filter contracts.SoulFilter

	if uid := c.Query("user_id"); uid != "" {
		filter.UserID = &uid
	}
	if status := c.Query("response_status"); status != "" {
		s := contracts.ResponseStatus(status)
		filter.ResponseStatus = &s
	}
	if sectorID := c.Query("sector_id"); sectorID != "" {
		filter.SectorID = &sectorID
	}
	if teamID := c.Query("team_id"); teamID != "" {
		filter.TeamID = &teamID
	}

	souls, err := h.svc.ListSouls(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, souls)
}

func (h *Handler) getSoul(c *gin.Context) {
	id := c.Param("id")
	soul, err := h.svc.GetSoul(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, soul)
}

func (h *Handler) updateSoul(c *gin.Context) {
	id := c.Param("id")
	var input contracts.UpdateSoulDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	soul, err := h.svc.UpdateSoul(c.Request.Context(), id, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, soul)
}

func (h *Handler) deleteSoul(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteSoul(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) addJournal(c *gin.Context) {
	soulID := c.Param("id")
	var payload journalPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	var userIDPtr *string
	if user, ok := contracts.UserFromContext(c.Request.Context()); ok && user.ID != "" {
		uid := user.ID
		userIDPtr = &uid
	}

	journal, err := h.svc.AddSoulJournal(c.Request.Context(), soulID, userIDPtr, payload.Note)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, journal)
}

func (h *Handler) getJournals(c *gin.Context) {
	soulID := c.Param("id")
	journals, err := h.svc.GetSoulJournals(c.Request.Context(), soulID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, journals)
}
