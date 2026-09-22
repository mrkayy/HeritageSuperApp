package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// FirstTimerAssignment holds the schema definition for the FirstTimerAssignment entity.
type FirstTimerAssignment struct {
	ent.Schema
}

// Fields of the FirstTimerAssignment.
func (FirstTimerAssignment) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("member_id", uuid.UUID{}),
		field.UUID("assigned_to_user_id", uuid.UUID{}),
		field.UUID("assigned_by_user_id", uuid.UUID{}),
		field.Enum("status").
			Values("pending", "contacted", "unreachable", "completed").
			Default("pending"),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the FirstTimerAssignment.
func (FirstTimerAssignment) Edges() []ent.Edge {
	return nil
}
