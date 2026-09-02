package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// CallLog holds the schema definition for the CallLog entity.
type CallLog struct {
	ent.Schema
}

// Fields of the CallLog.
func (CallLog) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("member_id", uuid.UUID{}),
		field.UUID("caller_id", uuid.UUID{}),
		field.Time("call_date").
			Default(time.Now),
		field.Enum("outcome").
			Values("reached_welcomed", "unreachable", "requested_callback", "pastoral_attention").
			Default("reached_welcomed"),
		field.Text("summary_notes").
			Optional().
			Default(""),
		field.Bool("pastoral_escalation_needed").
			Default(false),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the CallLog.
func (CallLog) Edges() []ent.Edge {
	return nil
}
