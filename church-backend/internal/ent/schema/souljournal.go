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

// SoulJournal holds the schema definition for the SoulJournal entity.
type SoulJournal struct {
	ent.Schema
}

// Fields of the SoulJournal.
func (SoulJournal) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("journal_id"),
		field.UUID("soul_id", uuid.UUID{}),
		field.UUID("user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("note"),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the SoulJournal.
func (SoulJournal) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("soul", Soul.Type).
			Ref("journals").
			Unique().
			Field("soul_id").
			Required(),
		edge.From("user", User.Type).
			Ref("soul_journals").
			Unique().
			Field("user_id"),
	}
}

// Annotations of the SoulJournal.
func (SoulJournal) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "soul_journal"},
	}
}
