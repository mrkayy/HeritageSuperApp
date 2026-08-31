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

type TeamTodo struct {
	ent.Schema
}

func (TeamTodo) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.Text("target_team").
			NotEmpty(),
		field.Text("title").
			NotEmpty(),
		field.Text("description").
			Optional().
			Nillable(),
		field.Text("entity_type").
			NotEmpty(),
		field.UUID("entity_id", uuid.UUID{}),
		field.Enum("status").
			Values("pending", "in_progress", "completed").
			Default("pending"),
		field.UUID("created_by", uuid.UUID{}),
		field.UUID("completed_by", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
		field.Time("completed_at").
			Optional().
			Nillable(),
	}
}

func (TeamTodo) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("church", LocalChurch.Type).
			Ref("team_todos").
			Unique().
			Required().
			Field("church_id"),
		edge.From("creator", User.Type).
			Ref("created_todos").
			Unique().
			Required().
			Field("created_by"),
	}
}

func (TeamTodo) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "team_todos"},
	}
}
