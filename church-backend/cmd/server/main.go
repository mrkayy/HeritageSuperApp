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

	"github.com/go-chi/chi/v5"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/modules/auth"
	"github.com/hofchurchng/church-backend/internal/modules/membership"
	"github.com/hofchurchng/church-backend/internal/platform/config"
	"github.com/hofchurchng/church-backend/internal/platform/db"
	"github.com/hofchurchng/church-backend/internal/platform/middleware"
	"github.com/hofchurchng/church-backend/internal/platform/migrate"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	// --- migrations: every module registers its own folder here ---
	if err := migrate.Run(ctx, pool, []migrate.ModuleMigrations{
		auth.Migrations,
		membership.Migrations,
		// events.Migrations,   <- next ministry module goes here
		// giving.Migrations,
	}); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// --- build modules ---
	authRepo := auth.NewRepository(pool)
	authSvc := auth.NewService(authRepo, cfg.JWTSecret)
	authHandler := auth.NewHandler(authSvc)

	membershipRepo := membership.NewRepository(pool)
	membershipSvc := membership.NewService(membershipRepo) // also satisfies contracts.MembershipReader
	membershipHandler := membership.NewHandler(membershipSvc)

	// Example of cross-module wiring via a contract, for when a future
	// module (e.g. Giving) needs member data:
	var _ contracts.MembershipReader = membershipSvc
	// giving := givingmod.New(pool, membershipSvc)  <- pass the interface in, not the package

	// --- HTTP router ---
	r := chi.NewRouter()
	requireAuth := middleware.RequireAuth(cfg.JWTSecret)

	r.Route("/api", func(api chi.Router) {
		// Auth module: /login is public (front door), /me needs a token.
		api.Route("/auth", func(a chi.Router) {
			a.Mount("/", authHandler.Routes())
		})

		// Every other module's routes are mounted behind the SAME
		// single sign-on gate - this is the SSO entry point in action.
		// A ministry module never implements its own login check.
		api.Group(func(protected chi.Router) {
			protected.Use(requireAuth)
			protected.Mount("/members", membershipHandler.Routes())
			// protected.Mount("/events", eventsHandler.Routes())
			// protected.Mount("/giving", givingHandler.Routes())
		})
	})

	log.Printf("HOF Church backend listening on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
