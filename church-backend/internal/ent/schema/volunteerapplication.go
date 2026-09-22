package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// VolunteerApplication holds the schema definition for the VolunteerApplication entity.
type VolunteerApplication struct {
	ent.Schema
}

// Fields of the VolunteerApplication.
func (VolunteerApplication) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("member_id", uuid.UUID{}),
		field.UUID("preferred_team_1_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("preferred_team_2_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("skills_notes").
			Optional().
			Default(""),
		field.Enum("status").
			Values("pending", "placed").
			Default("pending"),
		field.UUID("placed_by_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("placed_at").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the VolunteerApplication.
func (VolunteerApplication) Edges() []ent.Edge {
	return nil
}
