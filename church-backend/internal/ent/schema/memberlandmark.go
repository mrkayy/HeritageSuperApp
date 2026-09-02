package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// MemberLandmark holds the schema definition for the MemberLandmark entity.
type MemberLandmark struct {
	ent.Schema
}

// Fields of the MemberLandmark.
func (MemberLandmark) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("member_id", uuid.UUID{}),
		field.Enum("landmark_type").
			Values("graduation", "childbirth", "wedding", "career", "custom"),
		field.Text("title"),
		field.Text("institution_or_org").
			Optional().
			Default(""),
		field.Time("event_date"),
		field.Text("notes").
			Optional().
			Default(""),
		field.UUID("created_by_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the MemberLandmark.
func (MemberLandmark) Edges() []ent.Edge {
	return nil
}
