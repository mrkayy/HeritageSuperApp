package membership

import (
	"embed"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hofchurchng/church-backend/internal/platform/migrate"
)

//go:embed migrations/*.sql
var MigrationsFS embed.FS

var Migrations = migrate.ModuleMigrations{Module: "membership", FS: MigrationsFS, Dir: "migrations"}

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes only defines this module's own endpoints. Whether they're
// public or require login is decided where main.go mounts them, not
// here - this module has zero knowledge of auth internals, it just
// trusts the shared middleware to have already run.
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.list)
	r.Get("/{id}", h.get)
	return r
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	members, err := h.svc.ListMembers(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(members)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	member, err := h.svc.GetMember(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(member)
}
