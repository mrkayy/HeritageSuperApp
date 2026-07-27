package teams

import (
	"context"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/sector"
	"github.com/hofchurchng/church-backend/internal/ent/team"
)

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListTeams(ctx context.Context) ([]contracts.Team, error) {
	teams, err := r.db.Team.Query().
		Order(ent.Asc(team.FieldName)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.Team, 0, len(teams))
	for _, t := range teams {
		out = append(out, contracts.Team{
			ID:   t.ID.String(),
			Name: t.Name,
		})
	}
	return out, nil
}

func (r *Repository) GetTeam(ctx context.Context, id string) (contracts.Team, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.Team{}, err
	}

	t, err := r.db.Team.Get(ctx, uid)
	if err != nil {
		return contracts.Team{}, err
	}

	return contracts.Team{
		ID:   t.ID.String(),
		Name: t.Name,
	}, nil
}

func (r *Repository) CreateTeam(ctx context.Context, name string) (contracts.Team, error) {
	t, err := r.db.Team.Create().
		SetName(name).
		Save(ctx)
	if err != nil {
		return contracts.Team{}, err
	}

	return contracts.Team{
		ID:   t.ID.String(),
		Name: t.Name,
	}, nil
}

func (r *Repository) ListSectors(ctx context.Context) ([]contracts.Sector, error) {
	sectors, err := r.db.Sector.Query().
		Order(ent.Asc(sector.FieldSectorName)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.Sector, 0, len(sectors))
	for _, s := range sectors {
		out = append(out, contracts.Sector{
			ID:   s.ID.String(),
			Name: s.SectorName,
		})
	}
	return out, nil
}

func (r *Repository) GetSector(ctx context.Context, id string) (contracts.Sector, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.Sector{}, err
	}

	s, err := r.db.Sector.Get(ctx, uid)
	if err != nil {
		return contracts.Sector{}, err
	}

	return contracts.Sector{
		ID:   s.ID.String(),
		Name: s.SectorName,
	}, nil
}

func (r *Repository) CreateSector(ctx context.Context, name string) (contracts.Sector, error) {
	// The Prisma schema references church_id on Sector.
	// Since we are creating a sector, but don't have a church_id passed in the contract,
	// we either need to set a default or allow it to be optional (wait, the Prisma schema says `church_id String @db.Uuid` without a question mark, which means it is NOT optional. But wait, in the original teams database table:
	// CREATE TABLE IF NOT EXISTS sectors (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE);
	// In the original SQL migrations, sector didn't even have a church_id!
	// So in the database migration, if we transition to Ent's automatic migrations, we should handle this.
	// Wait, since we are doing auto-migration, we can set church_id to a dummy/default UUID or make it optional in Ent.
	// Let's check `internal/ent/schema/sector.go` where we defined:
	// `field.UUID("church_id", uuid.UUID{})`
	// Wait! If it's a required field in Ent, we will fail to create a sector unless we pass `church_id`.
	// Since the contract `CreateSector` doesn't pass a church_id, let's look at where we can get it, or if we should make `church_id` optional in Sector schema.
	// Let's make `church_id` optional/nullable in Sector schema! It's much safer so that existing code that creates sectors doesn't fail.
	// Wait, let's write this repository first, then we can modify `internal/ent/schema/sector.go` to make `church_id` optional and rerun `go generate`.
	// Actually, let's use a default UUID if none is provided, or make it optional. Let's make it optional.
	// For now, in CreateSector, let's set a default UUID if we can, or just set it to uuid.Nil.
	// Let's pass uuid.Nil or let's update `sector.go` to make it optional. Yes, updating `sector.go` to be optional is cleaner.
	
	// Let's write the code assuming we might need to set a dummy or optional.
	s, err := r.db.Sector.Create().
		SetSectorName(name).
		SetChurchID(uuid.Nil). // We will set it to uuid.Nil for now. If it's optional, that's fine too.
		Save(ctx)
	if err != nil {
		return contracts.Sector{}, err
	}

	return contracts.Sector{
		ID:   s.ID.String(),
		Name: s.SectorName,
	}, nil
}
