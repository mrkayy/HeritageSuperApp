package contracts

import "context"

// Team and Sector are the organizational units members belong to.
// Owned by the teams module; exposed here so other modules (Profile,
// and later Events/Giving) can reference them without importing
// internal/modules/teams directly.
type Team struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Sector struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ChurchID    string `json:"church_id"`
	ChurchName  string `json:"church_name"`
	MemberCount int    `json:"member_count"`
}

type LocalChurch struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Center      string `json:"center"`
	Description string `json:"description"`
	Slug        string `json:"slug"`
}

type TeamReader interface {
	GetTeam(ctx context.Context, id string) (Team, error)
	ListTeams(ctx context.Context) ([]Team, error)
}

type SectorReader interface {
	GetSector(ctx context.Context, id string) (Sector, error)
	ListSectors(ctx context.Context) ([]Sector, error)
}

type ChurchReader interface {
	GetChurch(ctx context.Context, id string) (LocalChurch, error)
	ListChurches(ctx context.Context) ([]LocalChurch, error)
}

// TeamName constants — canonical identifiers stored in users.team_name and
// embedded in the JWT teamName claim. These are what RequireTeamAccess
// compares against. Never hardcode these strings in handler code.
const (
	TeamInfoCenter = "information_center"
	TeamMembership = "membership"
	TeamTransport  = "transport"
)
