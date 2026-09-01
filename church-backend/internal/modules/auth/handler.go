package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/google"
)

type Handler struct {
	svc         *Service
	frontendURL string
}

func NewHandler(svc *Service, sessionSecret, clientID, clientSecret, callbackURL, frontendURL string) *Handler {
	// Initialize gorilla session store for gothic
	gothic.Store = sessions.NewCookieStore([]byte(sessionSecret))

	// Initialize goth provider if credentials are provided
	if clientID != "" && clientSecret != "" {
		goth.UseProviders(
			google.New(clientID, clientSecret, callbackURL, "email", "profile"),
		)
	}

	return &Handler{
		svc:         svc,
		frontendURL: frontendURL,
	}
}

// RegisterPublic mounts endpoints that don't require credentials.
func (h *Handler) RegisterPublic(g *gin.RouterGroup) {
	g.POST("/login", h.login)
	g.GET("/login/google", h.loginGoogle)
	g.GET("/callback/google", h.callbackGoogle)
	g.GET("/magic-link/verify", h.verifyMagicLink)
	g.POST("/magic-link/complete", h.completeMagicLink)
}

// RegisterProtected mounts endpoints that require validation.
func (h *Handler) RegisterProtected(g *gin.RouterGroup) {
	g.GET("/me", h.me)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}

	result, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *Handler) me(c *gin.Context) {
	userCtx, ok := contracts.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	u, err := h.svc.repo.FindByEmail(c.Request.Context(), userCtx.Email)
	if err != nil {
		c.JSON(http.StatusOK, userCtx)
		return
	}

	currentRole := ""
	if len(u.Roles) > 0 {
		currentRole = u.Roles[0]
	}

	c.JSON(http.StatusOK, contracts.AuthedUser{
		ID:          u.ID,
		Email:       u.Email,
		Roles:       u.Roles,
		CurrentRole: currentRole,
		TeamID:      u.TeamID,
		TeamName:    u.TeamName,
	})
}

func (h *Handler) loginGoogle(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=email_required")
		return
	}

	// Verify the email exists in the member table first before calling Google
	exists, err := h.svc.CheckMemberExists(c.Request.Context(), email)
	if err != nil || !exists {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=not_profiled")
		return
	}

	// Goth looks at "provider" in the query string or URL parameter.
	q := c.Request.URL.Query()
	q.Set("provider", "google")
	c.Request.URL.RawQuery = q.Encode()

	gothic.BeginAuthHandler(c.Writer, c.Request)
}

func (h *Handler) callbackGoogle(c *gin.Context) {
	q := c.Request.URL.Query()
	q.Set("provider", "google")
	c.Request.URL.RawQuery = q.Encode()

	gothUser, err := gothic.CompleteUserAuth(c.Writer, c.Request)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=auth_failed")
		return
	}

	result, err := h.svc.LoginOrCreateOAuthUser(c.Request.Context(), gothUser.Email)
	if err != nil {
		if errors.Is(err, ErrNotProfiled) {
			c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=not_profiled")
			return
		}
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=auth_failed")
		return
	}

	// Redirect to frontend with token
	redirectURL := h.frontendURL + "/login?token=" + result.Token
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (h *Handler) verifyMagicLink(c *gin.Context) {
	code := c.Query("code")
	email := c.Query("email")
	if code == "" || email == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid":   false,
			"message": "code and email query parameters are required",
		})
		return
	}

	res, err := h.svc.VerifyMagicLink(c.Request.Context(), code, email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid":   false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) completeMagicLink(c *gin.Context) {
	var req struct {
		Code      string `json:"code"`
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Password  string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request body"})
		return
	}

	if req.Code == "" || req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "code, email and password are required"})
		return
	}

	res, err := h.svc.CompleteMagicLinkOnboarding(c.Request.Context(), req.Code, req.Email, req.FirstName, req.LastName, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}
