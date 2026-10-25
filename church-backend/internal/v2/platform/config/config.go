package config

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	DatabaseURL         string
	Port                int
	Environment         string
	SessionCookieName   string
	LogLevel            string
	SessionCookieSecure bool
}

// Load loads V2 configuration strictly from V2 environment variables.
// It will deliberately return an error if V2_DATABASE_URL is not set,
// and it explicitly NEVER falls back to V1 DATABASE_URL.
func Load() (*Config, error) {
	dbURL := os.Getenv("V2_DATABASE_URL")
	if dbURL == "" {
		return nil, errors.New("V2_DATABASE_URL is required")
	}

	u, err := url.Parse(dbURL)
	if err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") || u.Hostname() == "" || strings.Trim(u.Path, "/") == "" {
		return nil, errors.New("V2_DATABASE_URL must be a PostgreSQL URL with host and database")
	}
	port := 8081
	if portStr := os.Getenv("V2_PORT"); portStr != "" {
		p, err := strconv.Atoi(portStr)
		if err != nil || p <= 0 || p > 65535 {
			return nil, fmt.Errorf("invalid V2_PORT: %s", portStr)
		}
		port = p
	}

	env := os.Getenv("V2_ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	if env != "development" && env != "test" && env != "production" {
		return nil, errors.New("invalid V2_ENVIRONMENT")
	}
	secure := true
	if raw := os.Getenv("V2_COOKIE_SECURE"); raw != "" {
		secure, err = strconv.ParseBool(raw)
		if err != nil {
			return nil, errors.New("invalid V2_COOKIE_SECURE")
		}
	}
	if env == "production" && (!secure || (u.Query().Get("sslmode") != "verify-full")) {
		return nil, errors.New("production requires secure cookies and sslmode=verify-full")
	}
	cookieName := os.Getenv("V2_SESSION_COOKIE_NAME")
	if cookieName == "" {
		cookieName = "hof_v2_session"
	}

	if err := (&http.Cookie{Name: cookieName, Value: "validation"}).Valid(); err != nil {
		return nil, errors.New("invalid session cookie name")
	}
	logLevel := os.Getenv("V2_LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	if logLevel != "info" && logLevel != "debug" && logLevel != "warn" && logLevel != "error" {
		return nil, errors.New("invalid V2_LOG_LEVEL")
	}
	return &Config{
		DatabaseURL:         dbURL,
		Port:                port,
		Environment:         env,
		SessionCookieName:   cookieName,
		LogLevel:            logLevel,
		SessionCookieSecure: secure,
	}, nil
}

// MustLoad calls Load and panics if an error occurs.
func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(errors.New("failed to load V2 config: " + err.Error()))
	}
	return cfg
}

// SessionCookie is shared by future authentication workflows; this milestone exposes no login endpoint.
func (c *Config) SessionCookie(token string, expires time.Time) *http.Cookie {
	return &http.Cookie{Name: c.SessionCookieName, Value: token, Path: "/", Secure: c.SessionCookieSecure, HttpOnly: true, SameSite: http.SameSiteLaxMode, Expires: expires.UTC()}
}
