package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// ChurchEvent holds the schema definition for the ChurchEvent entity.
type ChurchEvent struct {
	ent.Schema
}

// Fields of the ChurchEvent.
func (ChurchEvent) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.Text("name"),
		field.Text("description").
			Optional().
			Nillable(),
		field.Time("event_date"),
		field.Text("location").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the ChurchEvent.
func (ChurchEvent) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("church", LocalChurch.Type).
			Ref("church_events").
			Unique().
			Field("church_id").
			Required(),
	}
}

// Annotations of the ChurchEvent.
func (ChurchEvent) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "church_event"},
	}
}
