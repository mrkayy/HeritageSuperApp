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
		field.UUID("sector_id", uuid.UUID{}),
		field.UUID("church_id", uuid.UUID{}),
		field.Enum("role").
			Values("church_admin", "team_lead", "resident_pastor", "steward", "member", "first_timer", "guest"),
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
			Field("sector_id").
			Required(),
		edge.From("church", LocalChurch.Type).
			Ref("otp_invites").
			Unique().
			Field("church_id").
			Required(),
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
