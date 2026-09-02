package app

import (
	"log"
	"net/http"
	"net/url"
	"strings"
)

// RewriteHandler intercepts incoming HTTP requests to decode and restore
// rewritten paths from Vercel edge routers, query parameters, or proxy headers.
func RewriteHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

		if origPath != "" {
			log.Printf("[RewriteHandler] Path restored -> Method: %s, Path: %q, RequestURI: %q", r.Method, r.URL.Path, r.RequestURI)
		}

		next.ServeHTTP(w, r)
	})
}
