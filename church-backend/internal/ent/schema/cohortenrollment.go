package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// CohortEnrollment holds the schema definition for the CohortEnrollment entity.
type CohortEnrollment struct {
	ent.Schema
}

// Fields of the CohortEnrollment.
func (CohortEnrollment) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("cohort_id", uuid.UUID{}),
		field.UUID("member_id", uuid.UUID{}),
		field.UUID("teacher_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Enum("status").
			Values("enrolled", "passed", "makeup_required", "retake_required", "dropped").
			Default("enrolled"),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the CohortEnrollment.
func (CohortEnrollment) Edges() []ent.Edge {
	return nil
}
