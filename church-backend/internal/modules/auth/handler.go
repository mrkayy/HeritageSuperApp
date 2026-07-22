package auth

import (
	"embed"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/platform/migrate"
)

//go:embed migrations/*.sql
var MigrationsFS embed.FS

// Migrations lets main.go register this module's migrations without
// reaching into its internals - it's the one exported migration handle.
var Migrations = migrate.ModuleMigrations{Module: "auth", FS: MigrationsFS, Dir: "migrations"}

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes returns this module's routes, mounted by main.go at /api/auth.
// Notice /login is deliberately NOT behind RequireAuth - it's the front
// door - while /me demonstrates reading the identity that middleware
// already verified, via the shared contracts package.
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/login", h.login)
	r.Get("/me", h.me) // mounted behind RequireAuth in main.go's router group
	return r
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	result, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(result)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	user, ok := contracts.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	json.NewEncoder(w).Encode(user)
}
