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

// Sector holds the schema definition for the Sector entity.
type Sector struct {
	ent.Schema
}

// Fields of the Sector.
func (Sector) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("sector_id"),
		field.UUID("church_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("sector_name"),
		field.Text("description").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the Sector.
func (Sector) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("church", LocalChurch.Type).
			Ref("sectors").
			Unique().
			Field("church_id"),
		edge.To("users", User.Type),
		edge.To("teams", Team.Type),
		edge.To("souls", Soul.Type),
		edge.To("outreach_reports", OutreachReport.Type),
		edge.To("otp_invites", OtpInvites.Type),
		edge.To("user_sectors", UserSector.Type),
	}
}

// Annotations of the Sector.
func (Sector) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "sector"},
	}
}
