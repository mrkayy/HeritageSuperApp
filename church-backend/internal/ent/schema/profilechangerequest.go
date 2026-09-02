package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// ProfileChangeRequest holds the schema definition for the ProfileChangeRequest entity.
type ProfileChangeRequest struct {
	ent.Schema
}

// Fields of the ProfileChangeRequest.
func (ProfileChangeRequest) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("member_id", uuid.UUID{}),
		field.UUID("requested_by_user_id", uuid.UUID{}),
		field.UUID("reviewed_by_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Enum("status").
			Values("pending", "approved", "rejected").
			Default("pending"),
		field.Text("payload_json").
			Comment("JSON diff of proposed edits"),
		field.Text("rejection_reason").
			Optional().
			Default(""),
		field.Time("created_at").
			Default(time.Now),
		field.Time("reviewed_at").
			Optional().
			Nillable(),
	}
}

// Edges of the ProfileChangeRequest.
func (ProfileChangeRequest) Edges() []ent.Edge {
	return nil
}
