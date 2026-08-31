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

// OtpInvites holds the schema definition for the OtpInvites entity.
type OtpInvites struct {
	ent.Schema
}

// Fields of the OtpInvites.
func (OtpInvites) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.Text("email"),
		field.Text("otp_code").
			Unique(),
		field.Text("first_name").
			Optional().
			Default(""),
		field.Text("last_name").
			Optional().
			Default(""),
		field.UUID("sector_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("church_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Enum("role").
			Values(
				"super_admin",
				"general_overseer",
				"resident_pastor",
				"church_admin",
				"sector_lead",
				"team_lead",
				"steward",
				"member",
				"first_timer",
				"guest",
			),
		field.UUID("used_by_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Bool("used").
			Default(false),
		field.Time("expires_at"),
		field.UUID("created_by_user_id", uuid.UUID{}),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the OtpInvites.
func (OtpInvites) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("sector", Sector.Type).
			Ref("otp_invites").
			Unique().
			Field("sector_id"),
		edge.From("church", LocalChurch.Type).
			Ref("otp_invites").
			Unique().
			Field("church_id"),
		edge.From("used_by_user", User.Type).
			Ref("used_invites").
			Unique().
			Field("used_by_user_id"),
	}
}

// Annotations of the OtpInvites.
func (OtpInvites) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "otp_invites"},
	}
}
