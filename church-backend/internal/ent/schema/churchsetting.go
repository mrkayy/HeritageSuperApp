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

type ChurchSetting struct {
	ent.Schema
}

func (ChurchSetting) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}).
			Unique(),
		field.Int("foundation_class_min_attendance").
			Default(2),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
	}
}

func (ChurchSetting) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("church", LocalChurch.Type).
			Ref("settings").
			Unique().
			Required().
			Field("church_id"),
	}
}

func (ChurchSetting) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "church_settings"},
	}
}
