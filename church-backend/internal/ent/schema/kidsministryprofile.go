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

// KidsMinistryProfile holds the schema definition for the KidsMinistryProfile entity.
type KidsMinistryProfile struct {
	ent.Schema
}

// Fields of the KidsMinistryProfile.
func (KidsMinistryProfile) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("member_id", uuid.UUID{}),
		field.Text("grade_level").
			Optional().
			Nillable(),
		field.Text("classroom").
			Optional().
			Nillable(),
		field.Text("allergies").
			Optional().
			Nillable(),
		field.Text("medical_notes").
			Optional().
			Nillable(),
		field.Text("checkin_code").
			Optional().
			Nillable().
			Unique(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the KidsMinistryProfile.
func (KidsMinistryProfile) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("member", Member.Type).
			Ref("kids_ministry_profile").
			Unique().
			Field("member_id").
			Required(),
	}
}

// Annotations of the KidsMinistryProfile.
func (KidsMinistryProfile) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "kids_ministry_profiles"},
	}
}
