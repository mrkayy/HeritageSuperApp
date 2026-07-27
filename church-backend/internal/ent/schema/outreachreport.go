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

// OutreachReport holds the schema definition for the OutreachReport entity.
type OutreachReport struct {
	ent.Schema
}

// Fields of the OutreachReport.
func (OutreachReport) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("soul_id", uuid.UUID{}),
		field.UUID("user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("team_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("sector_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("outreach_date").
			Default(time.Now),
		field.Enum("response_status").
			Values("not_saved", "saved", "pending"),
		field.Bool("invited_to_church").
			Default(false).
			Optional().
			Nillable(),
		field.Text("note").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the OutreachReport.
func (OutreachReport) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("soul", Soul.Type).
			Ref("outreach_reports").
			Unique().
			Field("soul_id").
			Required(),
		edge.From("user", User.Type).
			Ref("outreach_reports").
			Unique().
			Field("user_id"),
		edge.From("team", Team.Type).
			Ref("outreach_reports").
			Unique().
			Field("team_id"),
		edge.From("sector", Sector.Type).
			Ref("outreach_reports").
			Unique().
			Field("sector_id"),
	}
}

// Annotations of the OutreachReport.
func (OutreachReport) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "outreach_report"},
	}
}
