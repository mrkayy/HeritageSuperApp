package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type Claims struct {
	UserID   string   `json:"sub"`
	Email    string   `json:"email"`
	Roles    []string `json:"roles"`
	TeamID   string   `json:"teamId"`
	TeamName string   `json:"teamName"`
	jwt.RegisteredClaims
}

// RequireAuth returns middleware that verifies the JWT on every request,
// and if valid, injects a contracts.AuthedUser into the request context.
// Any module handler downstream calls contracts.UserFromContext(c.Request.Context())
// to get the current user - no coupling to the auth module required.
func RequireAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		log.Printf("[RequireAuth] Claims verified - UserID: %s, Email: %s, Roles: %v, TeamID: %s", claims.UserID, claims.Email, claims.Roles, claims.TeamID)

		currentRole := ""
		if len(claims.Roles) > 0 {
			currentRole = claims.Roles[0]
		}

		ctx := contracts.WithUser(c.Request.Context(), contracts.AuthedUser{
			ID:          claims.UserID,
			Email:       claims.Email,
			Roles:       claims.Roles,
			CurrentRole: currentRole,
			TeamID:      claims.TeamID,
			TeamName:    claims.TeamName,
		})
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// RequireRole is a small composable helper modules can chain after
// RequireAuth for authorization, e.g. RequireRole("finance_admin").
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := contracts.UserFromContext(c.Request.Context())
		if !ok || !user.HasRole(role) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}

func RequireAnyRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := contracts.UserFromContext(c.Request.Context())
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		for _, role := range roles {
			if user.HasRole(role) {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
	}
}
