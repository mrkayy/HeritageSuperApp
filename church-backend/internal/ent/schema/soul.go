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

// Soul holds the schema definition for the Soul entity.
type Soul struct {
	ent.Schema
}

// Fields of the Soul.
func (Soul) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("soul_id"),
		field.UUID("sector_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("added_by_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("team_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("full_name"),
		field.Text("phone"),
		field.Text("gender").
			Optional().
			Nillable(),
		field.Text("age_range").
			Optional().
			Nillable(),
		field.Text("address").
			Optional().
			Nillable(),
		field.Time("outreach_date").
			Optional().
			Nillable(),
		field.Float("latitude").
			Optional().
			Nillable(),
		field.Float("longitude").
			Optional().
			Nillable(),
		field.Bool("is_active").
			Default(false).
			Optional().
			Nillable(),
		field.Enum("response_status").
			Values("not_saved", "saved", "pending").
			Default("not_saved").
			Optional().
			Nillable(),
		field.Text("note").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the Soul.
func (Soul) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("sector", Sector.Type).
			Ref("souls").
			Unique().
			Field("sector_id"),
		edge.From("added_by_user", User.Type).
			Ref("added_souls").
			Unique().
			Field("added_by_user_id"),
		edge.From("team", Team.Type).
			Ref("souls").
			Unique().
			Field("team_id"),
		edge.To("journals", SoulJournal.Type),
		edge.To("outreach_reports", OutreachReport.Type),
		edge.To("transport_requests", TransportRequest.Type),
		edge.To("follow_ups", FollowUp.Type),
	}
}

// Annotations of the Soul.
func (Soul) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "soul"},
	}
}
