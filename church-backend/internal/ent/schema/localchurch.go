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

// LocalChurch holds the schema definition for the LocalChurch entity.
type LocalChurch struct {
	ent.Schema
}

// Fields of the LocalChurch.
func (LocalChurch) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("church_id"),
		field.Text("name"),
		field.Text("center"),
		field.Text("description").
			Optional().
			Nillable(),
		field.Text("slug").
			Unique(),
		field.Text("address").
			Optional().
			Nillable(),
		field.Text("city").
			Optional().
			Nillable(),
		field.Text("state").
			Optional().
			Nillable(),
		field.UUID("resident_pastor_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("church_admin_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Bool("is_active").
			Default(true).
			Annotations(entsql.Default("true")),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the LocalChurch.
func (LocalChurch) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("members", Member.Type),
		edge.To("sectors", Sector.Type),
		edge.To("teams", Team.Type),
		edge.To("users", User.Type),
		edge.To("otp_invites", OtpInvites.Type),
		edge.To("church_teams", ChurchTeams.Type),
		edge.To("church_events", ChurchEvent.Type),
		edge.To("visitors", Visitor.Type),
		edge.To("attendance_records", AttendanceRecord.Type),
		edge.To("settings", ChurchSetting.Type),
		edge.To("team_todos", TeamTodo.Type),
	}
}

// Annotations of the LocalChurch.
func (LocalChurch) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "local_church"},
	}
}
