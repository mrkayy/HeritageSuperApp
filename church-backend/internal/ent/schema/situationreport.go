package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// SituationReport holds the schema definition for the SituationReport entity.
type SituationReport struct {
	ent.Schema
}

// Fields of the SituationReport.
func (SituationReport) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("member_id", uuid.UUID{}),
		field.Enum("category").
			Values("health", "bereavement", "childbirth", "academic_distress", "job_loss", "counseling", "relocation", "general"),
		field.Text("notes"),
		field.Text("action_taken").
			Optional().
			Default(""),
		field.Bool("is_urgent").
			Default(false),
		field.UUID("filed_by_user_id", uuid.UUID{}),
		field.Bool("pastor_reviewed").
			Default(false),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the SituationReport.
func (SituationReport) Edges() []ent.Edge {
	return nil
}
