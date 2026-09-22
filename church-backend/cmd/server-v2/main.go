package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hofchurchng/church-backend/internal/v2/api"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/config"
	"github.com/hofchurchng/church-backend/internal/v2/platform/database"
	"github.com/hofchurchng/church-backend/internal/v2/platform/logging"
	"github.com/hofchurchng/church-backend/internal/v2/visitor"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Configuration error: %v\n", err)
		os.Exit(1)
	}

	logger := logging.NewLogger(os.Stdout, cfg.LogLevel)
	logger.Info("Starting Heritage SuperApp Backend V2",
		"port", cfg.Port,
		"env", cfg.Environment,
	)

	// 1. Database Connection (pgx driver)
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		logger.Error("Failed to open database connection", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := db.PingContext(ctx); err != nil {
		cancel()
		logger.Error("Failed to ping database", "error", err)
		os.Exit(1)
	}
	cancel()

	if err := database.VerifyRuntimeRole(context.Background(), db); err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}
	// 2. Migration Check — verify database readiness without mutating schemas
	migrationRunner, err := migration.NewRunner(db, logger)
	if err != nil {
		logger.Error("Failed to initialize migration runner", "error", err)
		os.Exit(1)
	}

	if err := migrationRunner.EnsureReady(context.Background()); err != nil {
		logger.Error("Database migration check failed. Run 'go run ./cmd/migrate-v2 up' before starting API server",
			"error", err,
		)
		os.Exit(1)
	}
	logger.Info("Database schema verified; zero startup mutations performed")

	// 3. Initialize Domain Services
	sessionSvc := identity.NewService(db, nil)
	visitorSvc := visitor.NewService(db, nil)

	// 4. Initialize Router
	router := api.NewRouter(api.ServerDependencies{
		Config:          cfg,
		DB:              db,
		Logger:          logger,
		SessionService:  sessionSvc,
		MigrationRunner: migrationRunner,
		VisitorService:  visitorSvc,
	})

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 5. Start Server in Background Goroutine
	go func() {
		logger.Info(fmt.Sprintf("V2 API server listening on :%d", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("Server error", "error", err)
			os.Exit(1)
		}
	}()

	// 6. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	logger.Info("Received shutdown signal", "signal", sig.String())

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server forced to shutdown", "error", err)
	} else {
		logger.Info("Server stopped gracefully")
	}
}
