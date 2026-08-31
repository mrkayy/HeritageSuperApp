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

// User holds the schema definition for the User entity.
type User struct {
	ent.Schema
}

// Fields of the User.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("user_id"),
		field.UUID("church_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("sector_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.UUID("team_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("username").
			Optional().
			Nillable(),
		field.Text("first_name"),
		field.Text("last_name"),
		field.Text("email").
			Unique(),
		field.Text("password_hash"),
		field.Text("pin_hash").
			Optional().
			Nillable(),
		field.Text("phone_number").
			Optional().
			Nillable(),
		field.Text("profile_image_url").
			Optional().
			Nillable(),
		field.Time("date_of_birth").
			Optional().
			Nillable(),
		field.Text("address").
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
				"assistant_team_lead",
				"membership_team_lead",
				"membership_assistant_team_lead",
				"info_center_lead",
				"info_center_worker",
				"training_coordinator",
				"class_teacher",
				"steward",
				"member",
				"first_timer",
				"guest",
			).
			Default("member"),
		field.Enum("account_status").
			Values("active", "inactive", "suspended", "pending").
			Default("pending"),
		field.Bool("is_profile_complete").
			Default(false),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the User.
func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("church", LocalChurch.Type).
			Ref("users").
			Unique().
			Field("church_id"),
		edge.From("sector", Sector.Type).
			Ref("users").
			Unique().
			Field("sector_id"),
		edge.From("team", Team.Type).
			Ref("users").
			Unique().
			Field("team_id"),

		edge.To("outreach_reports", OutreachReport.Type),
		edge.To("follow_ups", FollowUp.Type),
		edge.To("user_teams", UserTeam.Type),
		edge.To("user_sectors", UserSector.Type),
		edge.To("added_souls", Soul.Type),
		edge.To("team_volunteers", TeamVolunteers.Type),
		edge.To("soul_journals", SoulJournal.Type),
		edge.To("outreach_targets", OutreachTargets.Type),
		edge.To("used_invites", OtpInvites.Type),
		edge.To("created_visitors", Visitor.Type),
		edge.To("recorded_attendances", AttendanceRecord.Type),
		edge.To("created_todos", TeamTodo.Type),
	}
}

// Annotations of the User.
func (User) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "users"},
	}
}
