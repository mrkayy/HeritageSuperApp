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

// Register defines this module's endpoints on the group.
func (h *Handler) Register(g *echo.Group) {
	g.GET("", h.list)
	g.GET("/:id", h.get)
	g.POST("", h.add)
	g.DELETE("/:id", h.delete)
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

type createPayload struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (h *Handler) add(c echo.Context) error {
	var p createPayload
	if err := c.Bind(&p); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if p.Name == "" || p.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name and email are required")
	}

	member, err := h.svc.AddMember(c.Request().Context(), p.Name, p.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, member)
}

func (h *Handler) delete(c echo.Context) error {
	id := c.Param("id")
	err := h.svc.DeleteMember(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
