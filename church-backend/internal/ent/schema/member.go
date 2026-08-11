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

// Member holds the schema definition for the Member entity.
type Member struct {
	ent.Schema
}

// Fields of the Member.
func (Member) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.Text("first_name").
			Optional().
			Default(""),
		field.Text("surname").
			Optional().
			Default(""),
		field.Text("email").
			Optional().
			Nillable().
			Unique(),
		field.Text("phone_number").
			Optional().
			Nillable(),
		field.Text("home_address").
			Optional().
			Nillable(),
		field.Enum("gender").
			Values("male", "female").
			Optional().
			Nillable(),
		field.Int16("date_of_birth_day").
			Optional().
			Nillable(),
		field.Int16("date_of_birth_month").
			Optional().
			Nillable(),
		field.Enum("marital_status").
			Values("single", "married", "widowed", "divorced", "separated").
			Optional().
			Nillable(),
		field.Int16("wedding_anniversary_day").
			Optional().
			Nillable(),
		field.Int16("wedding_anniversary_month").
			Optional().
			Nillable(),
		field.Text("job_occupation").
			Optional().
			Nillable(),
		field.Text("photo_url").
			Optional().
			Nillable(),
		field.Text("emergency_contact_name").
			Optional().
			Nillable(),
		field.Text("emergency_contact_phone").
			Optional().
			Nillable(),
		field.Text("allergies").
			Optional().
			Nillable(),
		field.Text("medical_notes").
			Optional().
			Nillable(),
		field.Bool("is_placeholder").
			Default(false).
			Annotations(entsql.Default("false")),
		field.Text("source_team").
			Optional().
			Nillable(),
		field.UUID("created_by", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("local_church_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("sector_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("team_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("joined_at").
			Default(time.Now).
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
		field.Time("created_at").
			Default(time.Now).
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
		field.Enum("current_stage").
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
			).
			Default("first_time_guest").
			Annotations(entsql.Default("'first_time_guest'")),
	}
}

// Edges of the Member.
func (Member) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("stage_histories", MembershipStageHistory.Type),
		edge.To("teams", MemberTeam.Type),
		edge.To("guardian_relationships_as_child", GuardianRelationship.Type),
		edge.To("guardian_relationships_as_guardian", GuardianRelationship.Type),
		edge.To("kids_ministry_profile", KidsMinistryProfile.Type).Unique(),
		edge.From("local_church", LocalChurch.Type).
			Ref("members").
			Unique().
			Field("local_church_id"),
		edge.From("sector", Sector.Type).
			Ref("members").
			Unique().
			Field("sector_id"),
		edge.From("team", Team.Type).
			Ref("members").
			Unique().
			Field("team_id"),
	}
}

// Annotations of the Member.
func (Member) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "members"},
	}
}
