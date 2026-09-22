package api_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hofchurchng/church-backend/internal/v2/api"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/platform/config"
	apierrors "github.com/hofchurchng/church-backend/internal/v2/platform/errors"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupAPIServer(t *testing.T) (*sql.DB, http.Handler, *migration.Runner) {
	t.Helper()
	db := testutil.Open(t)
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	runner, err := migration.NewRunner(db, logger)
	if err != nil {
		t.Fatalf("migration runner: %v", err)
	}
	if _, err := runner.Up(ctx); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatalf("seed fixtures: %v", err)
	}

	sessionSvc := identity.NewService(db, clock.NewRealClock())
	cfg := &config.Config{
		DatabaseURL:       "",
		Port:              8081,
		Environment:       "test",
		SessionCookieName: "v2_session_token",
	}

	router := api.NewRouter(api.ServerDependencies{
		Config:          cfg,
		DB:              db,
		Logger:          logger,
		SessionService:  sessionSvc,
		MigrationRunner: runner,
	})

	return db, router, runner
}

func TestAPI_HealthLive(t *testing.T) {
	db, router, _ := setupAPIServer(t)
	defer db.Close()

	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if res["status"] != "alive" {
		t.Errorf("expected status alive, got %v", res["status"])
	}
}

func TestAPI_HealthReady_Healthy(t *testing.T) {
	db, router, _ := setupAPIServer(t)
	defer db.Close()

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if res["status"] != "ready" || res["database"] != "connected" {
		t.Errorf("expected ready and connected, got %v", res)
	}
}

func TestAPI_HealthReady_PendingMigrations(t *testing.T) {
	db, router, _ := setupAPIServer(t)
	defer db.Close()
	ctx := context.Background()

	// Simulate a missing migration record in this disposable database.
	if _, err := db.ExecContext(ctx, "DELETE FROM schema_migrations_v2 WHERE version=2"); err != nil {
		t.Fatalf("rollback migration: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 Service Unavailable, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if res["status"] != "not_ready" {
		t.Errorf("expected status not_ready, got %v", res["status"])
	}
}

func TestAPI_MeContext_Success(t *testing.T) {
	db, router, _ := setupAPIServer(t)
	defer db.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/v2/me/context", nil)
	req.AddCookie(&http.Cookie{
		Name:  "v2_session_token",
		Value: fixtures.RawSessionTokenAda,
	})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if res["person_id"] != fixtures.PersonAdaID.String() {
		t.Errorf("expected person_id %s, got %v", fixtures.PersonAdaID, res["person_id"])
	}
	if res["account_id"] != fixtures.AccountAdaID.String() {
		t.Errorf("expected account_id %s, got %v", fixtures.AccountAdaID, res["account_id"])
	}
	if res["first_name"] != "Ada" || res["last_name"] != "Okafor" {
		t.Errorf("unexpected name: %v %v", res["first_name"], res["last_name"])
	}

	activeAssignments, ok := res["active_assignments"].([]interface{})
	if !ok || len(activeAssignments) < 2 {
		t.Fatalf("expected at least 2 active assignments, got %v", res["active_assignments"])
	}
}

func TestAPI_MeContext_Unauthorized_NoCookie(t *testing.T) {
	db, router, _ := setupAPIServer(t)
	defer db.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/v2/me/context", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d: %s", w.Code, w.Body.String())
	}

	var apiErr apierrors.APIError
	if err := json.Unmarshal(w.Body.Bytes(), &apiErr); err != nil {
		t.Fatalf("unmarshal error envelope: %v", err)
	}
	if apiErr.Code != "UNAUTHORIZED" {
		t.Errorf("expected code UNAUTHORIZED, got %s", apiErr.Code)
	}
	if apiErr.RequestID == "" {
		t.Errorf("expected non-empty request_id in error response")
	}
}

func TestAPI_MeContext_Forbidden_SuspendedAccount(t *testing.T) {
	db, router, _ := setupAPIServer(t)
	defer db.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/v2/me/context", nil)
	req.AddCookie(&http.Cookie{
		Name:  "v2_session_token",
		Value: fixtures.RawSessionTokenSuspended,
	})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden, got %d: %s", w.Code, w.Body.String())
	}

	var apiErr apierrors.APIError
	if err := json.Unmarshal(w.Body.Bytes(), &apiErr); err != nil {
		t.Fatalf("unmarshal error envelope: %v", err)
	}
	if apiErr.Code != "FORBIDDEN" {
		t.Errorf("expected code FORBIDDEN, got %s", apiErr.Code)
	}
}
