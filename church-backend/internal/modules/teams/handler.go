package teams

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// --- Route Registration ---

func (h *Handler) RegisterChurches(g *gin.RouterGroup) {
	g.GET("", h.listChurches)
	g.GET("/:id", h.getChurch)
	g.POST("", h.createChurch)
	g.PUT("/:id", h.updateChurch)
	g.DELETE("/:id", h.deleteChurch)
}

func (h *Handler) RegisterTeams(g *gin.RouterGroup) {
	g.GET("", h.listTeams)
	g.GET("/:id", h.getTeam)
	g.POST("", h.createTeam)
	g.PUT("/:id", h.updateTeam)
	g.DELETE("/:id", h.deleteTeam)
}

func (h *Handler) RegisterSectors(g *gin.RouterGroup) {
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

func (h *Handler) listChurches(c *gin.Context) {
	churches, err := h.svc.ListChurches(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, churches)
}

func (h *Handler) getChurch(c *gin.Context) {
	id := c.Param("id")
	church, err := h.svc.GetChurch(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, church)
}

func (h *Handler) createChurch(c *gin.Context) {
	var payload churchPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}
	if payload.Name == "" || payload.Center == "" || payload.Slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name, center, and slug are required"})
		return
	}

	church, err := h.svc.CreateChurch(c.Request.Context(), payload.Name, payload.Center, payload.Description, payload.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, church)
}

func (h *Handler) updateChurch(c *gin.Context) {
	id := c.Param("id")
	var payload churchPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}
	if payload.Name == "" || payload.Center == "" || payload.Slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name, center, and slug are required"})
		return
	}

	church, err := h.svc.UpdateChurch(c.Request.Context(), id, payload.Name, payload.Center, payload.Description, payload.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, church)
}

func (h *Handler) deleteChurch(c *gin.Context) {
	id := c.Param("id")
	err := h.svc.DeleteChurch(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Team Handlers ---

func (h *Handler) listTeams(c *gin.Context) {
	teams, err := h.svc.ListTeams(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, teams)
}

func (h *Handler) getTeam(c *gin.Context) {
	id := c.Param("id")
	team, err := h.svc.GetTeam(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, team)
}

func (h *Handler) createTeam(c *gin.Context) {
	var payload teamPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}
	if payload.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	team, err := h.svc.CreateTeamFull(c.Request.Context(), payload.Name, payload.Description, payload.ChurchID, payload.SectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, team)
}

func (h *Handler) updateTeam(c *gin.Context) {
	id := c.Param("id")
	var payload teamPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}
	if payload.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	team, err := h.svc.UpdateTeam(c.Request.Context(), id, payload.Name, payload.Description, payload.ChurchID, payload.SectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, team)
}

func (h *Handler) deleteTeam(c *gin.Context) {
	id := c.Param("id")
	err := h.svc.DeleteTeam(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Sector Handlers ---

func (h *Handler) listSectors(c *gin.Context) {
	sectors, err := h.svc.ListSectors(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sectors)
}

func (h *Handler) getSector(c *gin.Context) {
	id := c.Param("id")
	sector, err := h.svc.GetSector(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sector)
}

func (h *Handler) createSector(c *gin.Context) {
	var payload sectorPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}
	if payload.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	sector, err := h.svc.CreateSectorFull(c.Request.Context(), payload.Name, payload.Description, payload.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sector)
}

func (h *Handler) updateSector(c *gin.Context) {
	id := c.Param("id")
	var payload sectorPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}
	if payload.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	sector, err := h.svc.UpdateSector(c.Request.Context(), id, payload.Name, payload.Description, payload.ChurchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sector)
}

func (h *Handler) deleteSector(c *gin.Context) {
	id := c.Param("id")
	err := h.svc.DeleteSector(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
