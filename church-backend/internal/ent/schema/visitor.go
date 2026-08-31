package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Visitor struct {
	ent.Schema
}

func (Visitor) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("visitor_id"),
		field.UUID("church_id", uuid.UUID{}),
		field.Text("first_name").
			NotEmpty(),
		field.Text("last_name").
			NotEmpty(),
		field.Text("phone_number").
			NotEmpty(),
		field.Enum("gender").
			Values("male", "female"),
		field.Text("email").
			Optional().
			Nillable(),
		field.Text("address").
			NotEmpty(),
		field.Time("first_attendance_date").
			Default(time.Now),
		field.Text("prayer_request").
			Optional().
			Nillable(),
		field.UUID("invited_by_member_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("invited_by_text").
			Optional().
			Nillable(),
		field.Int("visit_count").
			Default(1),
		field.Time("last_attended_date").
			Default(time.Now),
		field.Enum("status").
			Values("first_timer", "returning_visitor", "foundation_class_candidate", "profiled").
			Default("first_timer"),
		field.Text("notes").
			Optional().
			Nillable(),
		field.UUID("created_by", uuid.UUID{}),
		field.UUID("profiled_member_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
	}
}

func (Visitor) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("church", LocalChurch.Type).
			Ref("visitors").
			Unique().
			Required().
			Field("church_id"),
		edge.From("created_by_user", User.Type).
			Ref("created_visitors").
			Unique().
			Required().
			Field("created_by"),
		edge.To("attendance_records", AttendanceRecord.Type),
	}
}

func (Visitor) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("church_id", "phone_number").
			Unique(),
	}
}

func (Visitor) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "visitors"},
	}
}
