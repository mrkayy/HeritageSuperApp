package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/config"
	"github.com/hofchurchng/church-backend/internal/v2/platform/logging"
)

func main() {
	flag.Parse()
	args := flag.Args()

	command := "up"
	if len(args) > 0 {
		command = args[0]
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load V2 config: %v", err)
	}

	logger := logging.NewLogger(os.Stdout, cfg.LogLevel)

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	runner, err := migration.NewRunner(db, logger)
	if err != nil {
		log.Fatalf("failed to initialize migration runner: %v", err)
	}

	switch command {
	case "up":
		count, err := runner.Up(ctx)
		if err != nil {
			log.Fatalf("migration failed: %v", err)
		}
		if count == 0 {
			fmt.Println("Database schema is up to date (no migrations applied).")
		} else {
			fmt.Printf("Successfully applied %d migration(s).\n", count)
		}

	case "down":
		steps := 1
		if len(args) > 1 {
			if s, err := strconv.Atoi(args[1]); err == nil && s > 0 {
				steps = s
			}
		}
		count, err := runner.Down(ctx, steps)
		if err != nil {
			log.Fatalf("down migration failed: %v", err)
		}
		fmt.Printf("Successfully reverted %d migration(s).\n", count)

	case "status":
		applied, err := runner.GetApplied(ctx)
		if err != nil {
			log.Fatalf("failed to get applied migrations: %v", err)
		}
		fmt.Printf("Applied migrations count: %d\n", len(applied))
		for ver, am := range applied {
			fmt.Printf("  Version %06d: %s (applied at: %s, checksum: %s)\n",
				ver, am.Name, am.AppliedAt.Format("2006-01-02 15:04:05"), am.Checksum[:8])
		}

	case "ready":
		if err := runner.EnsureReady(ctx); err != nil {
			fmt.Printf("Database not ready: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Database is ready and all migrations are applied.")

	default:
		fmt.Printf("Unknown migration command: %s (use 'up', 'down', 'status', or 'ready')\n", command)
		os.Exit(1)
	}
}
