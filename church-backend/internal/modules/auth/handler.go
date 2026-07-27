package auth

import (
	"errors"
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/labstack/echo/v4"
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
func (h *Handler) RegisterPublic(g *echo.Group) {
	g.POST("/login", h.login)
	g.GET("/login/google", h.loginGoogle)
	g.GET("/callback/google", h.callbackGoogle)
}

// RegisterProtected mounts endpoints that require validation.
func (h *Handler) RegisterProtected(g *echo.Group) {
	g.GET("/me", h.me)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) login(c echo.Context) error {
	var req loginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}

	result, err := h.svc.Login(c.Request().Context(), req.Email, req.Password)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}

	return c.JSON(http.StatusOK, result)
}

func (h *Handler) me(c echo.Context) error {
	user, ok := contracts.UserFromContext(c.Request().Context())
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}
	return c.JSON(http.StatusOK, user)
}

func (h *Handler) loginGoogle(c echo.Context) error {
	email := c.QueryParam("email")
	if email == "" {
		return c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=email_required")
	}

	// Verify the email exists in the member table first before calling Google
	exists, err := h.svc.CheckMemberExists(c.Request().Context(), email)
	if err != nil || !exists {
		return c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=not_profiled")
	}

	// Goth looks at "provider" in the query string or URL parameter.
	q := c.Request().URL.Query()
	q.Set("provider", "google")
	c.Request().URL.RawQuery = q.Encode()

	gothic.BeginAuthHandler(c.Response().Writer, c.Request())
	return nil
}

func (h *Handler) callbackGoogle(c echo.Context) error {
	q := c.Request().URL.Query()
	q.Set("provider", "google")
	c.Request().URL.RawQuery = q.Encode()

	gothUser, err := gothic.CompleteUserAuth(c.Response().Writer, c.Request())
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=auth_failed")
	}

	result, err := h.svc.LoginOrCreateOAuthUser(c.Request().Context(), gothUser.Email)
	if err != nil {
		if errors.Is(err, ErrNotProfiled) {
			return c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=not_profiled")
		}
		return c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=auth_failed")
	}

	// Redirect to frontend with token
	redirectURL := h.frontendURL + "/login?token=" + result.Token
	return c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}
