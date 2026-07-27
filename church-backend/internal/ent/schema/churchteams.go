package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ChurchTeams holds the schema definition for the ChurchTeams entity.
type ChurchTeams struct {
	ent.Schema
}

// Fields of the ChurchTeams.
func (ChurchTeams) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("church_team_id"),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("team_id", uuid.UUID{}),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the ChurchTeams.
func (ChurchTeams) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("church", LocalChurch.Type).
			Ref("church_teams").
			Unique().
			Field("church_id").
			Required(),
		edge.From("team", Team.Type).
			Ref("church_teams").
			Unique().
			Field("team_id").
			Required(),
	}
}

// Indexes of the ChurchTeams.
func (ChurchTeams) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("church_id", "team_id").
			Unique(),
	}
}

// Annotations of the ChurchTeams.
func (ChurchTeams) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "church_teams"},
	}
}
