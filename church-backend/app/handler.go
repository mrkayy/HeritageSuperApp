package app

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/hofchurchng/church-backend/internal/platform/config"
	"github.com/hofchurchng/church-backend/internal/platform/db"
)

var (
	once   sync.Once
	engine *gin.Engine
)

func ServerlessHandler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		gin.SetMode(gin.ReleaseMode)
		cfg := config.Load()
		client, err := db.Connect(context.Background(), cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("db connect: %v", err)
		}
		engine = New(cfg, client, nil)
	})

	// Vercel rewrites overwrite r.URL.Path with "/api/index.go".
	// The original path is forwarded via the __original_path query parameter
	// set in vercel.json: /:path* -> /api/index.go?__original_path=/:path*
	// Parse from r.RequestURI because Vercel's runtime may not populate r.URL.RawQuery.
	if strings.Contains(r.RequestURI, "__original_path=") {
		if parsed, err := url.Parse(r.RequestURI); err == nil {
			if path := parsed.Query().Get("__original_path"); path != "" {
				if !strings.HasPrefix(path, "/") {
					path = "/" + path
				}
				r.URL.Path = path
				q := parsed.Query()
				q.Del("__original_path")
				q.Del("path")
				r.URL.RawQuery = q.Encode()
				r.RequestURI = r.URL.RequestURI()
			}
		}
	} else if matchedPath := r.Header.Get("x-matched-path"); matchedPath != "" {
		if !strings.HasPrefix(matchedPath, "/") {
			matchedPath = "/" + matchedPath
		}
		r.URL.Path = matchedPath
		r.RequestURI = matchedPath
	}

	engine.ServeHTTP(w, r)
}
