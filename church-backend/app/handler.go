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

	rawURI := r.RequestURI
	if rawURI == "" {
		rawURI = r.URL.String()
	}

	origPath := ""
	var parsedQuery url.Values

	if parsed, err := url.ParseRequestURI(rawURI); err == nil {
		parsedQuery = parsed.Query()
		if p := parsedQuery.Get("__original_path"); p != "" {
			origPath = p
		} else if p := parsedQuery.Get("path"); p != "" && !strings.Contains(p, "index.go") {
			origPath = p
		}
	}

	if origPath == "" {
		q := r.URL.Query()
		if p := q.Get("__original_path"); p != "" {
			origPath = p
			parsedQuery = q
		} else if p := q.Get("path"); p != "" && !strings.Contains(p, "index.go") {
			origPath = p
			parsedQuery = q
		}
	}

	if origPath == "" {
		if h := r.Header.Get("x-matched-path"); h != "" && !strings.Contains(h, "index.go") {
			origPath = h
		} else if h := r.Header.Get("x-forwarded-uri"); h != "" && !strings.Contains(h, "index.go") {
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

		if parsedQuery != nil {
			parsedQuery.Del("__original_path")
			parsedQuery.Del("path")
			r.URL.RawQuery = parsedQuery.Encode()
		}

		r.URL.Path = origPath
		r.URL.RawPath = origPath
		r.RequestURI = r.URL.RequestURI()
	}

	log.Printf("[ServerlessHandler] Executing %s -> Path: %q, RawPath: %q, RequestURI: %q", r.Method, r.URL.Path, r.URL.RawPath, r.RequestURI)

	engine.ServeHTTP(w, r)
}
