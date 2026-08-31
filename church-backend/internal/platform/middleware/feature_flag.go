package middleware

import (
	"context"
	"net/http"

	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/labstack/echo/v4"
)

type FeatureFlagEvaluator interface {
	IsFeatureEnabled(ctx context.Context, key string, userRoles []string) bool
}

// RequireFeature returns an Echo middleware that checks if a specific feature flag
// is enabled. If the feature flag is disabled, it halts the request with HTTP 403.
func RequireFeature(evaluator FeatureFlagEvaluator, flagKey string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx := c.Request().Context()
			user, _ := contracts.UserFromContext(ctx)

			var roles []string
			if user.Roles != nil {
				roles = user.Roles
			}

			// Super Admin always has bypass capability or follows active rule
			if !evaluator.IsFeatureEnabled(ctx, flagKey, roles) {
				return echo.NewHTTPError(http.StatusForbidden, echo.Map{
					"error":       "feature_disabled",
					"message":     "This module or endpoint is currently disabled by system administrators.",
					"feature_key": flagKey,
				})
			}

			return next(c)
		}
	}
}
