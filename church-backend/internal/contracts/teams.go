package contracts

import "context"

// Team and Sector are the organizational units members belong to.
// Owned by the teams module; exposed here so other modules (Profile,
// and later Events/Giving) can reference them without importing
// internal/modules/teams directly.
type Team struct {
	ID   string
	Name string
}

type Sector struct {
	ID          string
	Name        string
	ChurchID    string
	ChurchName  string
	MemberCount int
}

type LocalChurch struct {
	ID          string
	Name        string
	Center      string
	Description string
	Slug        string
}

type TeamReader interface {
	GetTeam(ctx context.Context, id string) (Team, error)
	ListTeams(ctx context.Context) ([]Team, error)
}

type SectorReader interface {
	GetSector(ctx context.Context, id string) (Sector, error)
	ListSectors(ctx context.Context) ([]Sector, error)
}
