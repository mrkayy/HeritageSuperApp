package app

import (
	"context"
	"log"
	"net/http"
	"sync"

	"github.com/hofchurchng/church-backend/internal/platform/config"
	"github.com/hofchurchng/church-backend/internal/platform/db"
	"github.com/labstack/echo/v4"
)

var (
	once sync.Once
	e    *echo.Echo
)

func ServerlessHandler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		cfg := config.Load()
		client, err := db.Connect(context.Background(), cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("db connect: %v", err)
		}
		e = New(cfg, client, nil)
	})
	e.ServeHTTP(w, r)
}
