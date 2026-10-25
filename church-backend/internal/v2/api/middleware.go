package api

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	apierrors "github.com/hofchurchng/church-backend/internal/v2/platform/errors"
)

const (
	HeaderRequestID = "X-Request-ID"
	ContextAuthKey  = "v2_auth_context"
)

func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.GetHeader(HeaderRequestID)
		if _, err := uuid.Parse(reqID); err != nil {
			reqID = uuid.New().String()
		}
		c.Header(HeaderRequestID, reqID)
		c.Set(HeaderRequestID, reqID)
		c.Next()
	}
}

func LoggerMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.FullPath()
		if path == "" {
			path = "unmatched"
		}
		reqID, _ := c.Get(HeaderRequestID)

		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()

		logger.Info("HTTP Request",
			"method", c.Request.Method,
			"path", path,
			"status", status,
			"duration_ms", duration.Milliseconds(),
			"request_id", reqID,
			"ip", c.ClientIP(),
		)
	}
}

func RecoveryMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				reqID, _ := c.Get(HeaderRequestID)
				reqIDStr, _ := reqID.(string)

				logger.Error("Unhandled Panic Recovered",
					"error", "request panic",
					"request_id", reqIDStr,
					"path", c.FullPath(),
				)

				apiErr := apierrors.NewInternal("An unexpected internal error occurred")
				apiErr.RequestID = reqIDStr
				c.AbortWithStatusJSON(http.StatusInternalServerError, apiErr)
			}
		}()
		c.Next()
	}
}

func SessionAuthMiddleware(sessionSvc *identity.Service, cookieName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID, _ := c.Get(HeaderRequestID)
		reqIDStr, _ := reqID.(string)

		token, err := c.Cookie(cookieName)
		if err != nil || token == "" {
			// Also support Bearer in Authorization header for API testing/tools if needed
			authHeader := c.GetHeader("Authorization")
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token = authHeader[7:]
			}
		}

		if token == "" {
			apiErr := apierrors.NewUnauthorized("Authentication session required")
			apiErr.RequestID = reqIDStr
			c.AbortWithStatusJSON(http.StatusUnauthorized, apiErr)
			return
		}

		authCtx, err := sessionSvc.ResolveSession(c.Request.Context(), token)
		if err != nil {
			var apiErr *apierrors.APIError
			switch err {
			case identity.ErrSessionExpired:
				apiErr = apierrors.NewUnauthorized("Session has expired, please log in again")
			case identity.ErrSessionRevoked:
				apiErr = apierrors.NewUnauthorized("Session has been revoked")
			case identity.ErrAccountInactive:
				apiErr = apierrors.NewForbidden("Account is suspended or inactive")
			case identity.ErrSessionNotFound:
				apiErr = apierrors.NewUnauthorized("Invalid session credentials")
			default:
				apiErr = apierrors.NewInternal("Session service unavailable")
			}

			apiErr.RequestID = reqIDStr
			c.AbortWithStatusJSON(apiErr.HTTPStatus, apiErr)
			return
		}

		c.Set(ContextAuthKey, authCtx)
		c.Next()
	}
}

func GetAuthContext(c *gin.Context) (*identity.AuthContext, bool) {
	val, exists := c.Get(ContextAuthKey)
	if !exists {
		return nil, false
	}
	authCtx, ok := val.(*identity.AuthContext)
	return authCtx, ok
}
