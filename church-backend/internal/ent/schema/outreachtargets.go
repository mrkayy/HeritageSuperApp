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

// OutreachTargets holds the schema definition for the OutreachTargets entity.
type OutreachTargets struct {
	ent.Schema
}

// Fields of the OutreachTargets.
func (OutreachTargets) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("target_id"),
		field.Enum("owner_type").
			Values("church_admin", "team_lead", "resident_pastor", "steward", "member", "first_timer", "guest").
			Optional().
			Nillable(),
		field.UUID("user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Int("target_count"),
		field.Text("period"),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the OutreachTargets.
func (OutreachTargets) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("outreach_targets").
			Unique().
			Field("user_id"),
	}
}

// Annotations of the OutreachTargets.
func (OutreachTargets) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "outreach_targets"},
	}
}
