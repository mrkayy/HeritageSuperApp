package main

import (
	"context"
	"log"
	"os"

	"github.com/hofchurchng/church-backend/internal/app"
	"github.com/hofchurchng/church-backend/internal/platform/config"
	"github.com/hofchurchng/church-backend/internal/platform/db"
)

func main() {
	logFile, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("failed to open log file: %v", err)
	}
	defer logFile.Close()

	ctx := context.Background()
	cfg := config.Load()

	client, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer client.Close()

	e := app.New(cfg, client, logFile)

	log.Printf("HOF Church backend listening on :%s", cfg.Port)
	log.Fatal(e.Start(":" + cfg.Port))
}
