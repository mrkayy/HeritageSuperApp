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

// FollowUp holds the schema definition for the FollowUp entity.
type FollowUp struct {
	ent.Schema
}

// Fields of the FollowUp.
func (FollowUp) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("follow_up_id"),
		field.UUID("soul_id", uuid.UUID{}),
		field.UUID("assigned_to_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("due_date"),
		field.Enum("status").
			Values("pending", "completed", "cancelled").
			Default("pending"),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the FollowUp.
func (FollowUp) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("soul", Soul.Type).
			Ref("follow_ups").
			Unique().
			Field("soul_id").
			Required(),
		edge.From("assigned_to_user", User.Type).
			Ref("follow_ups").
			Unique().
			Field("assigned_to_user_id"),
	}
}

// Annotations of the FollowUp.
func (FollowUp) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "follow_up"},
	}
}
