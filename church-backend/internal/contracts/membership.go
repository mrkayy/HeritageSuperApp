package contracts

import "context"

// Member is the shape other modules are allowed to know about a member.
// It is intentionally smaller than membership's internal DB model -
// only what's safe/useful to expose across module boundaries.
type Member struct {
	ID    string
	Name  string
	Email string
}

// MembershipReader is implemented by the membership module and consumed
// by any other module that needs member data (e.g. Giving needing a
// member's name, Events needing to check membership status).
//
// A module NEVER imports "internal/modules/membership" directly - it
// accepts this interface as a constructor argument instead. Wiring the
// real implementation to the interface happens once, in cmd/server/main.go.
type MembershipReader interface {
	GetMember(ctx context.Context, id string) (Member, error)
}
