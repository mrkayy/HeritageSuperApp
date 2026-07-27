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

// TeamVolunteers holds the schema definition for the TeamVolunteers entity.
type TeamVolunteers struct {
	ent.Schema
}

// Fields of the TeamVolunteers.
func (TeamVolunteers) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("volunteer_id"),
		field.UUID("team_id", uuid.UUID{}),
		field.UUID("user_id", uuid.UUID{}),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the TeamVolunteers.
func (TeamVolunteers) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("team", Team.Type).
			Ref("volunteers").
			Unique().
			Field("team_id").
			Required(),
		edge.From("user", User.Type).
			Ref("team_volunteers").
			Unique().
			Field("user_id").
			Required(),
	}
}

// Indexes of the TeamVolunteers.
func (TeamVolunteers) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("team_id", "user_id").
			Unique(),
	}
}

// Annotations of the TeamVolunteers.
func (TeamVolunteers) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "team_volunteers"},
	}
}
