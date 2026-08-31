package app

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"strings"
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

	// Vercel rewrites overwrite r.URL.Path with "/api/index.go".
	// The original path is forwarded via the __original_path query parameter
	// set in vercel.json: /:path* -> /api/index.go?__original_path=/:path*
	// Parse from r.RequestURI because Vercel's runtime may not populate r.URL.RawQuery.
	if strings.Contains(r.RequestURI, "__original_path=") {
		if parsed, err := url.Parse(r.RequestURI); err == nil {
			if path := parsed.Query().Get("__original_path"); path != "" {
				r.URL.Path = path
				q := parsed.Query()
				q.Del("__original_path")
				q.Del("path")
				r.URL.RawQuery = q.Encode()
				r.RequestURI = r.URL.RequestURI()
			}
		}
	}

	e.ServeHTTP(w, r)
}
