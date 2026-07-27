package contracts

import "context"

// Profile is the shape other modules are allowed to know about a user's
// profile (e.g. Events wanting a display name + team, or Giving wanting
// a name for a receipt). It intentionally mirrors, but is decoupled
// from, the profile module's internal DB row.
//
// TeamID/SectorID reference the teams module's tables at the data
// layer; TeamName/SectorName are resolved by the profile module calling
// contracts.TeamReader/SectorReader (see profile.Service), so callers
// don't have to make a second lookup.
type Profile struct {
	UserID          string
	FirstName       string
	LastName        string
	ProfileImageURL string
	Address         string
	Email           string
	PhoneNumber     string
	TeamID          *string
	TeamName        string
	SectorID        *string
	SectorName      string
}

// ProfileReader is implemented by the profile module. Any other module
// that needs profile data accepts this interface as a constructor
// argument instead of importing internal/modules/profile.
type ProfileReader interface {
	GetProfile(ctx context.Context, userID string) (Profile, error)
}
