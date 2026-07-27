package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/labstack/echo/v4"
)

type Claims struct {
	UserID string   `json:"sub"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`
	jwt.RegisteredClaims
}

// RequireAuth returns middleware that verifies the JWT on every request,
// and if valid, injects a contracts.AuthedUser into the request context.
// Any module handler downstream calls contracts.UserFromContext(c.Request().Context())
// to get the current user - no coupling to the auth module required.
func RequireAuth(jwtSecret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			header := c.Request().Header.Get("Authorization")
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			if tokenStr == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing token")
			}

			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid or expired token")
			}

			log.Printf("[RequireAuth] Claims verified - UserID: %s, Email: %s, Roles: %v", claims.UserID, claims.Email, claims.Roles)

			ctx := contracts.WithUser(c.Request().Context(), contracts.AuthedUser{
				ID:    claims.UserID,
				Email: claims.Email,
				Roles: claims.Roles,
			})
			c.SetRequest(c.Request().WithContext(ctx))
			return next(c)
		}
	}
}

// RequireRole is a small composable helper modules can chain after
// RequireAuth for authorization, e.g. RequireRole("finance_admin").
func RequireRole(role string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user, ok := contracts.UserFromContext(c.Request().Context())
			if !ok || !user.HasRole(role) {
				return echo.NewHTTPError(http.StatusForbidden, "forbidden")
			}
			return next(c)
		}
	}
}

func RequireAnyRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user, ok := contracts.UserFromContext(c.Request().Context())
			if !ok {
				return echo.NewHTTPError(http.StatusForbidden, "forbidden")
			}
			for _, role := range roles {
				if user.HasRole(role) {
					return next(c)
				}
			}
			return echo.NewHTTPError(http.StatusForbidden, "forbidden")
		}
	}
}

