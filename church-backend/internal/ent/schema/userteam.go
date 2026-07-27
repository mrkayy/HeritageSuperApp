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

// UserTeam holds the schema definition for the UserTeam entity.
type UserTeam struct {
	ent.Schema
}

// Fields of the UserTeam.
func (UserTeam) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("steward_team_id"),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("team_id", uuid.UUID{}),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the UserTeam.
func (UserTeam) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("user_teams").
			Unique().
			Field("user_id").
			Required(),
		edge.From("team", Team.Type).
			Ref("user_teams").
			Unique().
			Field("team_id").
			Required(),
	}
}

// Indexes of the UserTeam.
func (UserTeam) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "team_id").
			Unique(),
	}
}

// Annotations of the UserTeam.
func (UserTeam) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "steward_teams"},
	}
}
