package featureflags

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
	// Any authenticated user can query flags
	g.GET("", h.listFlags)
	// Only super_admin can update/toggle flags
	g.PATCH("/:key", h.toggleFlag)
	g.PUT("/:key", h.upsertFlag)
}

func (h *Handler) listFlags(c echo.Context) error {
	ctx := c.Request().Context()
	flags, err := h.svc.ListAll(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
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

	return c.JSON(http.StatusOK, response)
}

type toggleRequest struct {
	IsEnabled bool `json:"isEnabled"`
}

func (h *Handler) toggleFlag(c echo.Context) error {
	ctx := c.Request().Context()
	user, ok := contracts.UserFromContext(ctx)
	if !ok || (!user.HasRole(string(contracts.RoleSuperAdmin)) && !user.HasRole(string(contracts.RoleChurchAdmin))) {
		return echo.NewHTTPError(http.StatusForbidden, "only super admins can toggle feature flags")
	}

	key := c.Param("key")
	var req toggleRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	updated, err := h.svc.ToggleFlag(ctx, key, req.IsEnabled, user.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, updated)
}

type upsertRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Category     string   `json:"category"`
	IsEnabled    bool     `json:"isEnabled"`
	AllowedRoles []string `json:"allowedRoles"`
}

func (h *Handler) upsertFlag(c echo.Context) error {
	ctx := c.Request().Context()
	user, ok := contracts.UserFromContext(ctx)
	if !ok || (!user.HasRole(string(contracts.RoleSuperAdmin)) && !user.HasRole(string(contracts.RoleChurchAdmin))) {
		return echo.NewHTTPError(http.StatusForbidden, "only super admins can configure feature flags")
	}

	key := c.Param("key")
	var req upsertRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	updated, err := h.svc.UpsertFlag(ctx, key, req.Name, req.Description, req.Category, req.IsEnabled, req.AllowedRoles, user.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, updated)
}
