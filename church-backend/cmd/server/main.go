// This is the ONLY file in the codebase that is allowed to import every
// module. It builds each module, wires their dependencies (via the
// contracts package where one module needs another), registers routes,
// and registers migrations. Adding a new ministry module means adding
// ~4 lines here - nothing else in the app needs to change.
package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/modules/auth"
	"github.com/hofchurchng/church-backend/internal/modules/dashboard"
	"github.com/hofchurchng/church-backend/internal/modules/followup"
	"github.com/hofchurchng/church-backend/internal/modules/membership"
	"github.com/hofchurchng/church-backend/internal/modules/profile"
	"github.com/hofchurchng/church-backend/internal/modules/souls"
	"github.com/hofchurchng/church-backend/internal/modules/teams"
	"github.com/hofchurchng/church-backend/internal/modules/transport"
	"github.com/hofchurchng/church-backend/internal/platform/config"
	"github.com/hofchurchng/church-backend/internal/platform/db"
	"github.com/hofchurchng/church-backend/internal/platform/middleware"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	// Open log file for request/response logs
	logFile, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("failed to open log file: %v", err)
	}
	defer logFile.Close()

	ctx := context.Background()
	config := config.Load()

	client, err := db.Connect(ctx, config.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer client.Close()

	// --- build modules ---
	// Auth module handles authentication, JWT generation, and OAuth flows
	authRepo := auth.NewRepository(client)
	authSvc := auth.NewService(authRepo, config.JWTSecret)
	authHandler := auth.NewHandler(
		authSvc,
		config.JWTSecret,
		config.GoogleClientID,
		config.GoogleClientSecret,
		config.GoogleCallbackURL,
		config.FrontendURL,
	)

	// Teams module handles organization structure, teams, and sectors
	teamsRepo := teams.NewRepository(client)
	teamsSvc := teams.NewService(teamsRepo)
	teamsHandler := teams.NewHandler(teamsSvc)

	// Profile module handles user profile management and tracks team/sector associations
	profileRepo := profile.NewRepository(client)
	profileSvc := profile.NewService(profileRepo, teamsSvc, teamsSvc, teamsSvc)
	profileHandler := profile.NewHandler(profileSvc)

	// Membership module tracks church membership, registration steps, and onboarding status
	membershipRepo := membership.NewRepository(client)
	membershipSvc := membership.NewService(membershipRepo)
	membershipHandler := membership.NewHandler(membershipSvc)

	// Souls module handles outreach convert tracking and soul journals
	soulsRepo := souls.NewRepository(client)
	soulsSvc := souls.NewService(soulsRepo)
	soulsHandler := souls.NewHandler(soulsSvc)

	// Follow-Up module handles assign and manage soul follow-ups
	followupRepo := followup.NewRepository(client)
	followupSvc := followup.NewService(followupRepo, soulsSvc)
	followupHandler := followup.NewHandler(followupSvc)

	// Transport module handles transportation requests and bus routes
	transportRepo := transport.NewRepository(client)
	transportSvc := transport.NewService(transportRepo, soulsSvc)
	transportHandler := transport.NewHandler(transportSvc)

	// Dashboard module handles admin dashboard aggregations
	dashboardHandler := dashboard.NewHandler(client)

	// Compile-time checks for cross-module contract compliance
	var _ contracts.MembershipReader = membershipSvc
	var _ contracts.ProfileReader = profileSvc
	var _ contracts.TeamReader = teamsSvc
	var _ contracts.SectorReader = teamsSvc
	var _ contracts.ChurchReader = teamsSvc
	var _ contracts.SoulReader = soulsSvc
	var _ contracts.FollowUpReader = followupSvc
	var _ contracts.TransportReader = transportSvc

	// --- Echo router ---
	e := echo.New()

	// Logger and recover middlewares
	e.Use(middleware.RequestResponseLogger(logFile))
	e.Use(echoMiddleware.Recover())

	requireAuth := middleware.RequireAuth(config.JWTSecret)

	api := e.Group("/api")

	// Health check endpoint
	api.GET("/health-check", func(c echo.Context) error {
		if _, err := client.User.Query().Count(c.Request().Context()); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"status":   "unhealthy",
				"database": "disconnected",
			})
		}
		return c.JSON(http.StatusOK, map[string]string{
			"status":   "healthy connection established",
			"database": "connected",
		})
	})

	// Auth module routes
	authGroup := api.Group("/auth")
	authHandler.RegisterPublic(authGroup)
	authHandler.RegisterProtected(authGroup.Group("", requireAuth))

	// Protected module routes
	requireAdminOrPastorOrLead := middleware.RequireAnyRole(
		string(contracts.RoleTeamLead),
		string(contracts.RoleResidentPastor),
		string(contracts.RoleChurchAdmin),
	)

	membersGroup := api.Group("/members", requireAuth, requireAdminOrPastorOrLead)
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

	soulsGroup := api.Group("/souls", requireAuth)
	soulsHandler.Register(soulsGroup)

	followupGroup := api.Group("/follow-up", requireAuth)
	followupHandler.Register(followupGroup)

	transportGroup := api.Group("/transportation", requireAuth)
	transportHandler.Register(transportGroup)

	dashboardGroup := api.Group("/dashboard", requireAuth)
	dashboardHandler.Register(dashboardGroup)

	log.Printf("HOF Church backend listening on :%s", config.Port)
	log.Fatal(e.Start(":" + config.Port))
}
