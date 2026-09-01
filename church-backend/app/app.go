package app

import (
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/modules/admin"
	"github.com/hofchurchng/church-backend/internal/modules/auth"
	"github.com/hofchurchng/church-backend/internal/modules/dashboard"
	"github.com/hofchurchng/church-backend/internal/modules/featureflags"
	"github.com/hofchurchng/church-backend/internal/modules/followup"
	"github.com/hofchurchng/church-backend/internal/modules/infocenter"
	"github.com/hofchurchng/church-backend/internal/modules/membership"
	"github.com/hofchurchng/church-backend/internal/modules/profile"
	"github.com/hofchurchng/church-backend/internal/modules/souls"
	"github.com/hofchurchng/church-backend/internal/modules/teams"
	"github.com/hofchurchng/church-backend/internal/modules/transport"
	"github.com/hofchurchng/church-backend/internal/platform/config"
	"github.com/hofchurchng/church-backend/internal/platform/middleware"
)

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	originMap := make(map[string]bool)
	for _, o := range allowedOrigins {
		originMap[o] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && (originMap[origin] || len(allowedOrigins) == 0) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With, Accept-Encoding, Accept-Language")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")
			c.Header("Access-Control-Max-Age", "86400")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// New builds a fully wired Gin Engine instance with all modules and middleware.
// logWriter receives request logs alongside stdout; pass nil for stdout-only logging.
func New(cfg config.Config, client *ent.Client, logWriter io.Writer) *gin.Engine {
	// --- build modules ---
	authRepo := auth.NewRepository(client)
	authSvc := auth.NewService(authRepo, cfg.JWTSecret)
	authHandler := auth.NewHandler(
		authSvc,
		cfg.JWTSecret,
		cfg.GoogleClientID,
		cfg.GoogleClientSecret,
		cfg.GoogleCallbackURL,
		cfg.FrontendURL,
	)

	teamsRepo := teams.NewRepository(client)
	teamsSvc := teams.NewService(teamsRepo)
	teamsHandler := teams.NewHandler(teamsSvc)

	profileRepo := profile.NewRepository(client)
	profileSvc := profile.NewService(profileRepo, teamsSvc, teamsSvc, teamsSvc)
	profileHandler := profile.NewHandler(profileSvc)

	infocenterRepo := infocenter.NewRepository(client)
	infocenterSvc := infocenter.NewService(infocenterRepo)
	infocenterHandler := infocenter.NewHandler(infocenterSvc)

	membershipRepo := membership.NewRepository(client)
	membershipSvc := membership.NewService(membershipRepo, infocenterSvc, infocenterSvc)
	membershipHandler := membership.NewHandler(membershipSvc)

	soulsRepo := souls.NewRepository(client)
	soulsSvc := souls.NewService(soulsRepo)
	soulsHandler := souls.NewHandler(soulsSvc)

	followupRepo := followup.NewRepository(client)
	followupSvc := followup.NewService(followupRepo, soulsSvc)
	followupHandler := followup.NewHandler(followupSvc)

	transportRepo := transport.NewRepository(client)
	transportSvc := transport.NewService(transportRepo, soulsSvc)
	transportHandler := transport.NewHandler(transportSvc)

	featureflagsRepo := featureflags.NewRepository(client)
	featureflagsSvc := featureflags.NewService(featureflagsRepo)
	featureflagsHandler := featureflags.NewHandler(featureflagsSvc)

	dashboardHandler := dashboard.NewHandler(client)

	adminRepo := admin.NewRepository(client)
	adminSvc := admin.NewService(adminRepo)
	adminHandler := admin.NewHandler(adminSvc)

	// Compile-time contract checks
	var _ contracts.MembershipReader = membershipSvc
	var _ contracts.ProfileReader = profileSvc
	var _ contracts.TeamReader = teamsSvc
	var _ contracts.SectorReader = teamsSvc
	var _ contracts.ChurchReader = teamsSvc
	var _ contracts.SoulReader = soulsSvc
	var _ contracts.FollowUpReader = followupSvc
	var _ contracts.TransportReader = transportSvc
	var _ contracts.InfoCenterReader = infocenterSvc
	var _ contracts.InfoCenterProfiler = infocenterSvc

	// --- Gin router ---
	r := gin.New()

	origins := []string{
		"http://localhost:5173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"https://heritage-mm-web-protal.vercel.app",
	}
	if cfg.FrontendURL != "" {
		for _, o := range strings.Split(cfg.FrontendURL, ",") {
			trimmed := strings.TrimRight(strings.TrimSpace(o), "/")
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}

	r.Use(middleware.RequestResponseLogger(logWriter))
	r.Use(gin.Recovery())
	r.Use(corsMiddleware(origins))

	requireAuth := middleware.RequireAuth(cfg.JWTSecret)

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "Heritage SuperApp Backend",
		})
	})

	api := r.Group("/api")

	api.GET("", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "Heritage SuperApp Backend API",
		})
	})

	api.GET("/health-check", func(c *gin.Context) {
		if _, err := client.User.Query().Count(c.Request.Context()); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":   "unhealthy",
				"database": "disconnected",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":   "healthy connection established",
			"database": "connected",
		})
	})

	authGroup := api.Group("/auth")
	authHandler.RegisterPublic(authGroup)
	authHandler.RegisterProtected(authGroup.Group("", requireAuth))

	featureFlagsGroup := api.Group("/feature-flags", requireAuth)
	featureflagsHandler.Register(featureFlagsGroup)

	requireAdminOrPastorOrLead := middleware.RequireAnyRole(
		string(contracts.RoleTeamLead),
		string(contracts.RoleResidentPastor),
		string(contracts.RoleChurchAdmin),
		string(contracts.RoleSuperAdmin),
		string(contracts.RoleSteward),
	)

	membersGroup := api.Group("/members", requireAuth, requireAdminOrPastorOrLead, middleware.RequireFeature(featureflagsSvc, "feature_membership_team"))
	membershipHandler.Register(membersGroup)

	teamsGroup := api.Group("/teams", requireAuth)
	teamsHandler.RegisterTeams(teamsGroup)

	sectorsGroup := api.Group("/sectors", requireAuth)
	teamsHandler.RegisterSectors(sectorsGroup)

	churchesGroup := api.Group("/churches", requireAuth)
	teamsHandler.RegisterChurches(churchesGroup)

	profileGroup := api.Group("/profile", requireAuth)
	profileHandler.Register(profileGroup)

	usersGroup := api.Group("/users", requireAuth)
	profileHandler.RegisterUsers(usersGroup)

	soulsGroup := api.Group("/souls", requireAuth, middleware.RequireFeature(featureflagsSvc, "feature_souls"))
	soulsHandler.Register(soulsGroup)

	followupGroup := api.Group("/follow-up", requireAuth, middleware.RequireFeature(featureflagsSvc, "feature_followup"))
	followupHandler.Register(followupGroup)

	transportGroup := api.Group("/transportation", requireAuth, middleware.RequireFeature(featureflagsSvc, "feature_transport"))
	transportHandler.Register(transportGroup)

	infoCenterGroup := api.Group("/info-center", requireAuth, middleware.RequireFeature(featureflagsSvc, "feature_info_center"))
	infocenterHandler.Register(infoCenterGroup)

	dashboardGroup := api.Group("/dashboard", requireAuth)
	dashboardHandler.Register(dashboardGroup)

	superAdminRole := middleware.RequireAnyRole(string(contracts.RoleSuperAdmin))
	superAdminGroup := api.Group("/super-admin", requireAuth, superAdminRole)
	adminHandler.RegisterSuperAdminRoutes(superAdminGroup)

	goRole := middleware.RequireAnyRole(string(contracts.RoleSuperAdmin), string(contracts.RoleGeneralOverseer))
	goGroup := api.Group("/general-overseer", requireAuth, goRole)
	adminHandler.RegisterGeneralOverseerRoutes(goGroup)

	execRole := middleware.RequireAnyRole(
		string(contracts.RoleSuperAdmin),
		string(contracts.RoleGeneralOverseer),
		string(contracts.RoleResidentPastor),
		string(contracts.RoleChurchAdmin),
	)
	analyticsGroup := api.Group("/analytics", requireAuth, execRole)
	adminHandler.RegisterAnalyticsRoutes(analyticsGroup)

	return r
}
