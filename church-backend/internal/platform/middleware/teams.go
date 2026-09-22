package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

// executiveRoles are exempt from team-based access control — they have
// cross-team oversight by design.
var executiveRoles = map[string]bool{
	string(contracts.RoleSuperAdmin):      true,
	string(contracts.RoleGeneralOverseer): true,
	string(contracts.RoleResidentPastor):  true,
	string(contracts.RoleChurchAdmin):     true,
}

// RequireTeamAccess enforces that the requesting user belongs to the
// specified team (matched against the teamName JWT claim). Executive
// roles bypass this check and always pass. Use this on team-scoped
// route groups in app.go alongside RequireAuth.
func RequireTeamAccess(requiredTeam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := contracts.UserFromContext(c.Request.Context())
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		// Executives have cross-team oversight — always pass.
		for _, role := range user.Roles {
			if executiveRoles[role] {
				c.Next()
				return
			}
		}

		// Match teamName claim against the required team (case-insensitive).
		if strings.EqualFold(user.TeamName, requiredTeam) {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "you do not have access to this team's resources",
		})
	}
}
