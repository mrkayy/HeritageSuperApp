package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// ContinuousAssessment holds the schema definition for the ContinuousAssessment entity.
type ContinuousAssessment struct {
	ent.Schema
}

// Fields of the ContinuousAssessment.
func (ContinuousAssessment) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("enrollment_id", uuid.UUID{}),
		field.Float("assignment_score").
			Default(0.0).
			Comment("Max 20.0"),
		field.Float("verbal_assessment_score").
			Default(0.0).
			Comment("Max 20.0"),
		field.Float("participation_score").
			Default(0.0).
			Comment("Max 20.0"),
		field.Float("disciplers_report_score").
			Default(0.0).
			Comment("Max 20.0"),
		field.Float("proof_of_note_score").
			Default(0.0).
			Comment("Max 10.0"),
		field.Float("attendance_score").
			Default(0.0).
			Comment("Max 10.0"),
		field.Float("total_score").
			Default(0.0).
			Comment("Max 100.0, Pass Mark: 50.0"),
		field.Int("discipler_devotion_rating").
			Default(5).
			Comment("1-5 scale"),
		field.Int("discipler_evangelism_rating").
			Default(5).
			Comment("1-5 scale"),
		field.Bool("makeup_completed").
			Default(false),
		field.UUID("graded_by_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now),
	}
}

// Edges of the ContinuousAssessment.
func (ContinuousAssessment) Edges() []ent.Edge {
	return nil
}
