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

type AttendanceRecord struct {
	ent.Schema
}

func (AttendanceRecord) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("attendance_id"),
		field.UUID("church_id", uuid.UUID{}),
		field.UUID("visitor_id", uuid.UUID{}),
		field.Time("service_date"),
		field.Text("service_type").
			Optional().
			Nillable(),
		field.UUID("recorded_by", uuid.UUID{}),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
	}
}

func (AttendanceRecord) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("visitor", Visitor.Type).
			Ref("attendance_records").
			Unique().
			Required().
			Field("visitor_id"),
		edge.From("church", LocalChurch.Type).
			Ref("attendance_records").
			Unique().
			Required().
			Field("church_id"),
		edge.From("recorded_by_user", User.Type).
			Ref("recorded_attendances").
			Unique().
			Required().
			Field("recorded_by"),
	}
}

func (AttendanceRecord) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("visitor_id", "service_date").
			Unique(),
	}
}

func (AttendanceRecord) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "attendance_records"},
	}
}
