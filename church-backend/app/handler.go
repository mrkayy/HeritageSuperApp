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

	origPath := ""

	q := r.URL.Query()
	if p := q.Get("__original_path"); p != "" {
		origPath = p
	} else if p := q.Get("path"); p != "" && p != "api/index.go" && p != "/api/index.go" {
		origPath = p
	}

	if origPath == "" && strings.Contains(r.RequestURI, "__original_path=") {
		if parsed, err := url.Parse(r.RequestURI); err == nil {
			if p := parsed.Query().Get("__original_path"); p != "" {
				origPath = p
			}
		}
	}

	if origPath == "" {
		if h := r.Header.Get("x-matched-path"); h != "" && h != "/api/index.go" && h != "/api/index" {
			origPath = h
		} else if h := r.Header.Get("x-forwarded-uri"); h != "" {
			origPath = h
		}
	}

	if origPath != "" {
		if !strings.HasPrefix(origPath, "/") {
			origPath = "/" + origPath
		}
		if idx := strings.Index(origPath, "?"); idx != -1 {
			origPath = origPath[:idx]
		}
		r.URL.Path = origPath

		q.Del("__original_path")
		q.Del("path")
		r.URL.RawQuery = q.Encode()
		r.RequestURI = r.URL.RequestURI()
	}

	log.Printf("[ServerlessHandler] Routing %s %s (origPath=%q, rawQuery=%q)", r.Method, r.URL.Path, origPath, r.URL.RawQuery)

	engine.ServeHTTP(w, r)
}
