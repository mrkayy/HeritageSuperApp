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

// MembershipStageHistory holds the schema definition for the MembershipStageHistory entity.
type MembershipStageHistory struct {
	ent.Schema
}

// Fields of the MembershipStageHistory.
func (MembershipStageHistory) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("member_id", uuid.UUID{}),
		field.Enum("stage").
			Values(
				"first_time_guest",
				"foundation_class",
				"sunday_school_module_1",
				"sunday_school_module_2",
				"sunday_school_module_3",
				"membership_class",
				"stewardship",
				"mit",
				"resident_pastor",
			),
		field.Time("entered_at").
			Default(time.Now),
		field.UUID("recorded_by", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("notes").
			Optional().
			Nillable(),
	}
}

// Edges of the MembershipStageHistory.
func (MembershipStageHistory) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("member", Member.Type).
			Ref("stage_histories").
			Unique().
			Field("member_id").
			Required().
			Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}

// Annotations of the MembershipStageHistory.
func (MembershipStageHistory) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "membership_stage_history"},
	}
}
