package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// issueToken is the ONLY place in the whole application that mints a
// session token. Every other module only ever verifies tokens (via
// platform/middleware), never issues them. That asymmetry is what makes
// this a real single sign-on entry point: one login, one issuer, one
// token accepted uniformly across every feature/ministry module.
func issueToken(secret, userID, email string, roles []string, teamID, teamName string) (string, error) {
	claims := jwt.MapClaims{
		"sub":      userID,
		"email":    email,
		"roles":    roles,
		"teamId":   teamID,
		"teamName": teamName,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
