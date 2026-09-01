package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hofchurchng/church-backend/internal/contracts"
)

type FeatureFlagEvaluator interface {
	IsFeatureEnabled(ctx context.Context, key string, userRoles []string) bool
}

// RequireFeature returns a Gin middleware that checks if a specific feature flag
// is enabled. If the feature flag is disabled, it halts the request with HTTP 403.
func RequireFeature(evaluator FeatureFlagEvaluator, flagKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		user, _ := contracts.UserFromContext(ctx)

		var roles []string
		if user.Roles != nil {
			roles = user.Roles
		}

		// Super Admin always has bypass capability or follows active rule
		if !evaluator.IsFeatureEnabled(ctx, flagKey, roles) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":       "feature_disabled",
				"message":     "This module or endpoint is currently disabled by system administrators.",
				"feature_key": flagKey,
			})
			return
		}

		c.Next()
	}
}
