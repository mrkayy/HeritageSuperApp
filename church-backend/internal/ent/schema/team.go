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

// Team holds the schema definition for the Team entity.
type Team struct {
	ent.Schema
}

// Fields of the Team.
func (Team) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("team_id"),
		field.Text("name"),
		field.Text("description").
			Optional().
			Nillable(),
		field.UUID("church_id", uuid.UUID{}).
			Optional().
			Nillable().
			StorageKey("local_church_church_id"),
		field.UUID("sector_id", uuid.UUID{}).
			Optional().
			Nillable().
			StorageKey("sector_sector_id"),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the Team.
func (Team) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("members", Member.Type),
		edge.From("church", LocalChurch.Type).
			Ref("teams").
			Unique().
			Field("church_id"),
		edge.From("sector", Sector.Type).
			Ref("teams").
			Unique().
			Field("sector_id"),
		edge.To("volunteers", TeamVolunteers.Type),
		edge.To("users", User.Type),
		edge.To("outreach_reports", OutreachReport.Type),
		edge.To("souls", Soul.Type),
		edge.To("transport_requests", TransportRequest.Type),
		edge.To("user_teams", UserTeam.Type),
		edge.To("church_teams", ChurchTeams.Type),
		edge.To("member_teams", MemberTeam.Type),
	}
}

// Annotations of the Team.
func (Team) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "team"},
	}
}
