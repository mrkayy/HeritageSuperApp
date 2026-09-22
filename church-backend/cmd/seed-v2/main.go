package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/url"

	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/platform/config"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load V2 config: %v", err)
	}

	u, _ := url.Parse(cfg.DatabaseURL)
	if cfg.Environment == "production" || (u.Path != "/hof_v2_dev" && u.Path != "/hof_v2_test") {
		log.Fatal("synthetic fixtures require the explicit V2 development or test database")
	}
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		log.Fatalf("failed to load synthetic fixtures: %v", err)
	}

	fmt.Println("Successfully loaded deterministic synthetic fixtures for V2.")
}
