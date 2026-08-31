package app

import (
	"context"
	"log"
	"net/http"
	"net/url"
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

	// Vercel serverless rewrites overwrite r.URL.Path with the target function ("/api/index.go").
	// The original requested route is stored in the "x-matched-path" header.
	originalPath := r.Header.Get("x-matched-path")
	if originalPath == "" {
		originalPath = r.Header.Get("x-forwarded-uri")
	}

	if originalPath != "" {
		if u, err := url.Parse(originalPath); err == nil {
			r.URL.Path = u.Path
			r.RequestURI = originalPath
			if u.RawQuery != "" && r.URL.RawQuery == "" {
				r.URL.RawQuery = u.RawQuery
			}
		} else {
			r.URL.Path = originalPath
			r.RequestURI = originalPath
		}
	}

	e.ServeHTTP(w, r)
}
