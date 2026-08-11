package dashboard

import (
	"net/http"

	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	db *ent.Client
}

func NewHandler(db *ent.Client) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Register(g *echo.Group) {
	g.GET("/admin", h.getAdminDashboard)
}

type dashboardDTO struct {
	FollowUpProgress       []map[string]interface{} `json:"followUpProgress"`
	InviteStats            []map[string]interface{} `json:"inviteStats"`
	LocalChurchCount       int                      `json:"localChurchCount"`
	UserCount              int                      `json:"userCount"`
	RecentOutreachActivity []map[string]interface{} `json:"recentOutreachActivity"`
	ResponseStatusSummary  []map[string]interface{} `json:"responseStatusSummary"`
	WeeklyOutreachSummary  []map[string]interface{} `json:"weeklyOutreachSummary"`
	TeamRanking            []map[string]interface{} `json:"teamRanking"`
}

func (h *Handler) getAdminDashboard(c echo.Context) error {
	ctx := c.Request().Context()

	churchCount, _ := h.db.LocalChurch.Query().Count(ctx)
	userCount, _ := h.db.User.Query().Count(ctx)

	// Fetch some recent souls for outreach activity
	recentSouls, _ := h.db.Soul.Query().Order(ent.Desc("created_at")).Limit(5).All(ctx)
	outreachActivity := make([]map[string]interface{}, 0)
	for _, s := range recentSouls {
		outreachActivity = append(outreachActivity, map[string]interface{}{
			"id":         s.ID.String(),
			"full_name":  s.FullName,
			"phone":      s.Phone,
			"created_at": s.CreatedAt,
		})
	}

	dto := dashboardDTO{
		FollowUpProgress:       make([]map[string]interface{}, 0),
		InviteStats:            make([]map[string]interface{}, 0),
		LocalChurchCount:       churchCount,
		UserCount:              userCount,
		RecentOutreachActivity: outreachActivity,
		ResponseStatusSummary:  make([]map[string]interface{}, 0),
		WeeklyOutreachSummary:  make([]map[string]interface{}, 0),
		TeamRanking:            make([]map[string]interface{}, 0),
	}

	return c.JSON(http.StatusOK, dto)
}
