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

// UserSector holds the schema definition for the UserSector entity.
type UserSector struct {
	ent.Schema
}

// Fields of the UserSector.
func (UserSector) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("user_sector_id"),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("sector_id", uuid.UUID{}),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the UserSector.
func (UserSector) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("user_sectors").
			Unique().
			Field("user_id").
			Required(),
		edge.From("sector", Sector.Type).
			Ref("user_sectors").
			Unique().
			Field("sector_id").
			Required(),
	}
}

// Indexes of the UserSector.
func (UserSector) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "sector_id").
			Unique(),
	}
}

// Annotations of the UserSector.
func (UserSector) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "user_sector"},
	}
}
