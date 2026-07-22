// Package middleware is shared platform code. RequireAuth is the single
// gate every module's protected routes pass through - this is what makes
// login a true "single sign-on entry point": the auth module is the only
// place that ISSUES tokens, but VERIFYING a token requires nothing from
// the auth module at all, just the shared JWT secret. That means every
// module can protect its routes without importing modules/auth, and there
// is exactly one place in the whole codebase where "am I logged in?" is
// decided.
package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Claims struct {
	UserID string   `json:"sub"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`
	jwt.RegisteredClaims
}

// RequireAuth returns middleware that verifies the JWT on every request,
// and if valid, injects a contracts.AuthedUser into the request context.
// Any module handler downstream calls contracts.UserFromContext(r.Context())
// to get the current user - no coupling to the auth module required.
func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			if tokenStr == "" {
				http.Error(w, "missing token", http.StatusUnauthorized)
				return
			}

			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}

			ctx := contracts.WithUser(r.Context(), contracts.AuthedUser{
				ID:    claims.UserID,
				Email: claims.Email,
				Roles: claims.Roles,
			})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole is a small composable helper modules can chain after
// RequireAuth for authorization, e.g. RequireRole("finance_admin").
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := contracts.UserFromContext(r.Context())
			if !ok || !user.HasRole(role) {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
