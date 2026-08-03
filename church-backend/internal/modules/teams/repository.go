package teams

import (
	"context"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/localchurch"
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
	// func (r *Repository) CreateSector(ctx context.Context, name string) (contracts.Sector, error) {
	s, err := r.db.Sector.Create().
		SetSectorName(name).
		Save(ctx)
	if err != nil {
		return contracts.Sector{}, err
	}

	return contracts.Sector{
		ID:   s.ID.String(),
		Name: s.SectorName,
	}, nil
}

// --- LocalChurch CRUD ---

func (r *Repository) ListChurches(ctx context.Context) ([]contracts.LocalChurch, error) {
	churches, err := r.db.LocalChurch.Query().
		Order(ent.Asc(localchurch.FieldName)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.LocalChurch, 0, len(churches))
	for _, c := range churches {
		desc := ""
		if c.Description != nil {
			desc = *c.Description
		}
		out = append(out, contracts.LocalChurch{
			ID:          c.ID.String(),
			Name:        c.Name,
			Center:      c.Center,
			Description: desc,
			Slug:        c.Slug,
		})
	}
	return out, nil
}

func (r *Repository) GetChurch(ctx context.Context, id string) (contracts.LocalChurch, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.LocalChurch{}, err
	}

	c, err := r.db.LocalChurch.Get(ctx, uid)
	if err != nil {
		return contracts.LocalChurch{}, err
	}

	desc := ""
	if c.Description != nil {
		desc = *c.Description
	}
	return contracts.LocalChurch{
		ID:          c.ID.String(),
		Name:        c.Name,
		Center:      c.Center,
		Description: desc,
		Slug:        c.Slug,
	}, nil
}

func (r *Repository) CreateChurch(ctx context.Context, name, center, description, slug string) (contracts.LocalChurch, error) {
	var desc *string
	if description != "" {
		desc = &description
	}

	c, err := r.db.LocalChurch.Create().
		SetName(name).
		SetCenter(center).
		SetNillableDescription(desc).
		SetSlug(slug).
		Save(ctx)
	if err != nil {
		return contracts.LocalChurch{}, err
	}

	resDesc := ""
	if c.Description != nil {
		resDesc = *c.Description
	}
	return contracts.LocalChurch{
		ID:          c.ID.String(),
		Name:        c.Name,
		Center:      c.Center,
		Description: resDesc,
		Slug:        c.Slug,
	}, nil
}

func (r *Repository) UpdateChurch(ctx context.Context, id, name, center, description, slug string) (contracts.LocalChurch, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.LocalChurch{}, err
	}

	var desc *string
	if description != "" {
		desc = &description
	}

	c, err := r.db.LocalChurch.UpdateOneID(uid).
		SetName(name).
		SetCenter(center).
		SetNillableDescription(desc).
		SetSlug(slug).
		Save(ctx)
	if err != nil {
		return contracts.LocalChurch{}, err
	}

	resDesc := ""
	if c.Description != nil {
		resDesc = *c.Description
	}
	return contracts.LocalChurch{
		ID:          c.ID.String(),
		Name:        c.Name,
		Center:      c.Center,
		Description: resDesc,
		Slug:        c.Slug,
	}, nil
}

func (r *Repository) DeleteChurch(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return r.db.LocalChurch.DeleteOneID(uid).Exec(ctx)
}

// --- Team Full CRUD & Helpers ---

func (r *Repository) CreateTeamFull(ctx context.Context, name string, description *string, churchID, sectorID *string) (contracts.Team, error) {
	c := r.db.Team.Create().SetName(name)
	if description != nil {
		c.SetNillableDescription(description)
	}
	if churchID != nil && *churchID != "" {
		cid, err := uuid.Parse(*churchID)
		if err != nil {
			return contracts.Team{}, err
		}
		c.SetChurchID(cid)
	}
	if sectorID != nil && *sectorID != "" {
		sid, err := uuid.Parse(*sectorID)
		if err != nil {
			return contracts.Team{}, err
		}
		c.SetSectorID(sid)
	}

	t, err := c.Save(ctx)
	if err != nil {
		return contracts.Team{}, err
	}

	return contracts.Team{
		ID:   t.ID.String(),
		Name: t.Name,
	}, nil
}

func (r *Repository) UpdateTeam(ctx context.Context, id, name string, description *string, churchID, sectorID *string) (contracts.Team, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.Team{}, err
	}

	u := r.db.Team.UpdateOneID(uid).SetName(name)
	if description != nil {
		u.SetNillableDescription(description)
	}

	if churchID != nil && *churchID != "" {
		cid, err := uuid.Parse(*churchID)
		if err != nil {
			return contracts.Team{}, err
		}
		u.SetChurchID(cid)
	} else if churchID != nil && *churchID == "" {
		u.ClearChurch()
	}

	if sectorID != nil && *sectorID != "" {
		sid, err := uuid.Parse(*sectorID)
		if err != nil {
			return contracts.Team{}, err
		}
		u.SetSectorID(sid)
	} else if sectorID != nil && *sectorID == "" {
		u.ClearSector()
	}

	t, err := u.Save(ctx)
	if err != nil {
		return contracts.Team{}, err
	}

	return contracts.Team{
		ID:   t.ID.String(),
		Name: t.Name,
	}, nil
}

func (r *Repository) DeleteTeam(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return r.db.Team.DeleteOneID(uid).Exec(ctx)
}

// --- Sector Full CRUD & Helpers ---

func (r *Repository) CreateSectorFull(ctx context.Context, name string, description *string, churchID *string) (contracts.Sector, error) {
	c := r.db.Sector.Create().SetSectorName(name)
	if description != nil {
		c.SetNillableDescription(description)
	}
	if churchID != nil && *churchID != "" {
		cid, err := uuid.Parse(*churchID)
		if err != nil {
			return contracts.Sector{}, err
		}
		c.SetChurchID(cid)
	}

	s, err := c.Save(ctx)
	if err != nil {
		return contracts.Sector{}, err
	}

	return contracts.Sector{
		ID:   s.ID.String(),
		Name: s.SectorName,
	}, nil
}

func (r *Repository) UpdateSector(ctx context.Context, id, name string, description *string, churchID *string) (contracts.Sector, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.Sector{}, err
	}

	u := r.db.Sector.UpdateOneID(uid).SetSectorName(name)
	if description != nil {
		u.SetNillableDescription(description)
	}

	if churchID != nil && *churchID != "" {
		cid, err := uuid.Parse(*churchID)
		if err != nil {
			return contracts.Sector{}, err
		}
		u.SetChurchID(cid)
	} else if churchID != nil && *churchID == "" {
		u.ClearChurch()
	}

	s, err := u.Save(ctx)
	if err != nil {
		return contracts.Sector{}, err
	}

	return contracts.Sector{
		ID:   s.ID.String(),
		Name: s.SectorName,
	}, nil
}

func (r *Repository) DeleteSector(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return r.db.Sector.DeleteOneID(uid).Exec(ctx)
}
