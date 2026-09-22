package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// MemberTransfer holds the schema definition for the MemberTransfer entity.
type MemberTransfer struct {
	ent.Schema
}

// Fields of the MemberTransfer.
func (MemberTransfer) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("member_id", uuid.UUID{}),
		field.UUID("origin_church_id", uuid.UUID{}),
		field.UUID("destination_church_id", uuid.UUID{}),
		field.Text("transfer_reason").
			Optional().
			Default(""),
		field.Text("pastoral_recommendation").
			Optional().
			Default(""),
		field.Enum("status").
			Values("pending", "approved", "rejected").
			Default("pending"),
		field.UUID("initiated_by_user_id", uuid.UUID{}),
		field.UUID("reviewed_by_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("reviewed_at").
			Optional().
			Nillable(),
	}
}

// Edges of the MemberTransfer.
func (MemberTransfer) Edges() []ent.Edge {
	return nil
}
