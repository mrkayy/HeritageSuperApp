package config

import (
	"net/http"
	"testing"
	"time"
)

func TestExplicitDatabaseAndSecureCookie(t *testing.T) {
	t.Setenv("V2_DATABASE_URL", "")
	t.Setenv("DATABASE_URL", "postgres://legacy/db")
	if _, err := Load(); err == nil {
		t.Fatal("missing V2 URL accepted")
	}
	t.Setenv("V2_DATABASE_URL", "postgres://user:pass@localhost/hof_v2_dev?sslmode=disable")
	t.Setenv("V2_ENVIRONMENT", "development")
	t.Setenv("V2_COOKIE_SECURE", "true")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	cookie := cfg.SessionCookie("token", time.Now().Add(time.Hour))
	if !cookie.Secure || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode || cookie.Path != "/" {
		t.Fatalf("unsafe cookie: %+v", cookie)
	}
	t.Setenv("V2_ENVIRONMENT", "production")
	if _, err := Load(); err == nil {
		t.Fatal("insecure production connection accepted")
	}
}
