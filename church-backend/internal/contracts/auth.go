// Package contracts holds the interfaces and shared types that modules use
// to talk to each other. This is the ONLY thing a module is allowed to
// depend on from another module. No module ever imports another module's
// package directly (this is enforced by .golangci.yml depguard rules).
package contracts

import "context"

// AuthedUser is the identity injected into the request context by the
// platform auth middleware after a JWT has been verified. Every module
// reads the current user through this shared struct, never through the
// auth module's internal types.
type AuthedUser struct {
	ID    string
	Email string
	Roles []string
}

type ctxKey string

const userCtxKey ctxKey = "authed_user"

// WithUser attaches an AuthedUser to the context. Called by platform/middleware.
func WithUser(ctx context.Context, u AuthedUser) context.Context {
	return context.WithValue(ctx, userCtxKey, u)
}

// UserFromContext retrieves the AuthedUser attached by the auth middleware.
// Any module handler can call this without depending on the auth module.
func UserFromContext(ctx context.Context) (AuthedUser, bool) {
	u, ok := ctx.Value(userCtxKey).(AuthedUser)
	return u, ok
}

// HasRole is a small helper modules use for authorization checks.
func (u AuthedUser) HasRole(role string) bool {
	for _, r := range u.Roles {
		if r == role {
			return true
		}
	}
	return false
}
