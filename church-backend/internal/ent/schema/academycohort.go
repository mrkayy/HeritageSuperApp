package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// AcademyCohort holds the schema definition for the AcademyCohort entity.
type AcademyCohort struct {
	ent.Schema
}

// Fields of the AcademyCohort.
func (AcademyCohort) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.Enum("module_type").
			Values("foundation_class", "sunday_school_module_1", "sunday_school_module_2", "sunday_school_module_3", "membership_class"),
		field.Text("cohort_name"),
		field.Time("start_date"),
		field.Time("end_date").
			Optional().
			Nillable(),
		field.Enum("status").
			Values("enrolling", "active", "completed").
			Default("enrolling"),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the AcademyCohort.
func (AcademyCohort) Edges() []ent.Edge {
	return nil
}
