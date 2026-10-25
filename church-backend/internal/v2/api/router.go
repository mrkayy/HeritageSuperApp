package api

import (
	"database/sql"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/identity"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/config"
	apierrors "github.com/hofchurchng/church-backend/internal/v2/platform/errors"
	"github.com/hofchurchng/church-backend/internal/v2/visitor"
)

type ServerDependencies struct {
	Config          *config.Config
	DB              *sql.DB
	Logger          *slog.Logger
	SessionService  *identity.Service
	MigrationRunner *migration.Runner
	VisitorService  *visitor.Service
}

func NewRouter(deps ServerDependencies) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	_ = r.SetTrustedProxies(nil)

	r.Use(RequestIDMiddleware())
	r.Use(LoggerMiddleware(deps.Logger))
	r.Use(RecoveryMiddleware(deps.Logger))

	// 1. Process Liveness
	r.GET("/health/live", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "alive",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	// 2. Readiness Check (DB connectivity & migration verification)
	r.GET("/health/ready", func(c *gin.Context) {
		reqID, _ := c.Get(HeaderRequestID)
		reqIDStr, _ := reqID.(string)

		if err := deps.DB.PingContext(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":     "not_ready",
				"database":   "disconnected",
				"error":      "Dependency unavailable or schema incompatible",
				"request_id": reqIDStr,
			})
			return
		}

		if err := deps.MigrationRunner.EnsureReady(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":     "not_ready",
				"database":   "connected",
				"migrations": "pending_or_checksum_mismatch",
				"error":      "Dependency unavailable or schema incompatible",
				"request_id": reqIDStr,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":            "ready",
			"database":          "connected",
			"migration_version": deps.MigrationRunner.LatestVersion(),
		})
	})

	// 3. V2 API Group
	v2 := r.Group("/api/v2")

	// Protected me context
	sessionAuth := SessionAuthMiddleware(deps.SessionService, deps.Config.SessionCookieName)
	v2.GET("/me/context", sessionAuth, func(c *gin.Context) {
		authCtx, ok := GetAuthContext(c)
		if !ok {
			apiErr := apierrors.NewUnauthorized("Authentication required")
			c.JSON(http.StatusUnauthorized, apiErr)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"person_id":          authCtx.PersonID,
			"account_id":         authCtx.AccountID,
			"organization_id":    authCtx.OrganizationID,
			"identity_status":    authCtx.IdentityStatus,
			"first_name":         authCtx.FirstName,
			"last_name":          authCtx.LastName,
			"baseline_grants":    authCtx.BaselineGrants,
			"active_assignments": authCtx.ActiveAssignments,
		})
	})

	if deps.VisitorService != nil {
		branch := v2.Group("/churches/:branch_id", sessionAuth)
		branch.POST("/visitor-captures", func(c *gin.Context) {
			authCtx, ok := GetAuthContext(c)
			if !ok {
				c.JSON(http.StatusUnauthorized, apierrors.NewUnauthorized("Authentication required"))
				return
			}
			branchID, err := uuid.Parse(c.Param("branch_id"))
			if err != nil {
				c.JSON(http.StatusBadRequest, apierrors.NewBadRequest("INVALID_BRANCH", "branch_id must be a UUID"))
				return
			}
			var input struct {
				ServiceOccurrenceID  uuid.UUID      `json:"service_occurrence_id"`
				FirstName            string         `json:"first_name"`
				LastName             string         `json:"last_name"`
				ContactKind          string         `json:"contact_kind"`
				ContactValue         string         `json:"contact_value"`
				MissingContactReason string         `json:"missing_contact_reason"`
				Source               string         `json:"source"`
				InviterPersonID      *uuid.UUID     `json:"inviter_person_id"`
				RestrictedPrayerNote map[string]any `json:"restricted_prayer_note"`
			}
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, apierrors.NewBadRequest("INVALID_JSON", "request body is invalid"))
				return
			}
			result, err := deps.VisitorService.Capture(c.Request.Context(), authCtx, visitor.CaptureRequest{OrganizationID: authCtx.OrganizationID, BranchID: branchID, ServiceOccurrenceID: input.ServiceOccurrenceID, FirstName: input.FirstName, LastName: input.LastName, ContactKind: input.ContactKind, ContactValue: input.ContactValue, MissingContactReason: input.MissingContactReason, Source: input.Source, InviterPersonID: input.InviterPersonID, RestrictedPrayerNote: input.RestrictedPrayerNote})
			if err != nil {
				c.JSON(http.StatusUnprocessableEntity, apierrors.NewUnprocessable("VISITOR_CAPTURE_REJECTED", "visitor capture could not be saved"))
				return
			}
			c.JSON(http.StatusCreated, result)
		})
		v2.POST("/auth/claims/complete", func(c *gin.Context) {
			var input struct {
				OrganizationID uuid.UUID `json:"organization_id"`
				Token          string    `json:"token"`
				AuthMethodKind string    `json:"auth_method_kind"`
				Identifier     string    `json:"identifier"`
				CredentialHash string    `json:"credential_hash"`
			}
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, apierrors.NewBadRequest("INVALID_JSON", "request body is invalid"))
				return
			}
			result, err := deps.VisitorService.CompleteClaim(c.Request.Context(), visitor.ClaimCompletionRequest{OrganizationID: input.OrganizationID, RawToken: input.Token, AuthMethodKind: input.AuthMethodKind, Identifier: input.Identifier, CredentialHash: input.CredentialHash})
			if err != nil {
				c.JSON(http.StatusUnauthorized, apierrors.NewUnauthorized("claim invitation is invalid or unavailable"))
				return
			}
			c.JSON(http.StatusOK, result)
		})
	}

	r.NoRoute(func(c *gin.Context) {
		reqID, _ := c.Get(HeaderRequestID)
		reqIDStr, _ := reqID.(string)

		apiErr := apierrors.NewNotFound("The requested endpoint does not exist on this server")
		apiErr.RequestID = reqIDStr
		c.JSON(http.StatusNotFound, apiErr)
	})

	return r
}
