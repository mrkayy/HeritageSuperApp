package featureflags

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
	// Any authenticated user can query flags
	g.GET("", h.listFlags)
	// Only super_admin can update/toggle flags
	g.PATCH("/:key", h.toggleFlag)
	g.PUT("/:key", h.upsertFlag)
}

func (h *Handler) listFlags(c *gin.Context) {
	ctx := c.Request.Context()
	flags, err := h.svc.ListAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user, _ := contracts.UserFromContext(ctx)

	// Return full details including metadata
	type ResponseItem struct {
		FlagDTO
		ActiveForUser bool `json:"activeForUser"`
	}

	response := make([]ResponseItem, len(flags))
	for i, f := range flags {
		active := h.svc.IsFeatureEnabled(ctx, f.Key, user.Roles)
		response[i] = ResponseItem{
			FlagDTO:       f,
			ActiveForUser: active,
		}
	}

	c.JSON(http.StatusOK, response)
}

type toggleRequest struct {
	IsEnabled bool `json:"isEnabled"`
}

func (h *Handler) toggleFlag(c *gin.Context) {
	ctx := c.Request.Context()
	user, ok := contracts.UserFromContext(ctx)
	if !ok || (!user.HasRole(string(contracts.RoleSuperAdmin)) && !user.HasRole(string(contracts.RoleChurchAdmin))) {
		c.JSON(http.StatusForbidden, gin.H{"error": "only super admins can toggle feature flags"})
		return
	}

	key := c.Param("key")
	var req toggleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := h.svc.ToggleFlag(ctx, key, req.IsEnabled, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updated)
}

type upsertRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Category     string   `json:"category"`
	IsEnabled    bool     `json:"isEnabled"`
	AllowedRoles []string `json:"allowedRoles"`
}

func (h *Handler) upsertFlag(c *gin.Context) {
	ctx := c.Request.Context()
	user, ok := contracts.UserFromContext(ctx)
	if !ok || (!user.HasRole(string(contracts.RoleSuperAdmin)) && !user.HasRole(string(contracts.RoleChurchAdmin))) {
		c.JSON(http.StatusForbidden, gin.H{"error": "only super admins can configure feature flags"})
		return
	}

	key := c.Param("key")
	var req upsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	updated, err := h.svc.UpsertFlag(ctx, key, req.Name, req.Description, req.Category, req.IsEnabled, req.AllowedRoles, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updated)
}
