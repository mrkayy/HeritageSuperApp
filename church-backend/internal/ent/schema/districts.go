package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// Districts holds the schema definition for the Districts entity.
type Districts struct {
	ent.Schema
}

// Fields of the Districts.
func (Districts) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("district_id"),
		field.Text("name").
			Unique(),
		field.Text("description").
			Optional().
			Nillable(),
		field.Text("slug").
			Unique().
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the Districts.
func (Districts) Edges() []ent.Edge {
	return nil
}

// Annotations of the Districts.
func (Districts) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "districts"},
	}
}
