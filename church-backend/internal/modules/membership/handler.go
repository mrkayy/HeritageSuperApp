package membership

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

// Register defines this module's endpoints on the group. Whether they're
// public or require login is decided where main.go mounts them, not
// here.
func (h *Handler) Register(g *echo.Group) {
	g.GET("", h.list)
	g.GET("/:id", h.get)
}

func (h *Handler) list(c echo.Context) error {
	members, err := h.svc.ListMembers(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, members)
}

func (h *Handler) get(c echo.Context) error {
	id := c.Param("id")
	member, err := h.svc.GetMember(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, member)
}
