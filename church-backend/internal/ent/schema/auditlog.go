package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// AuditLog holds the schema definition for the AuditLog entity.
type AuditLog struct {
	ent.Schema
}

// Fields of the AuditLog.
func (AuditLog) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("actor_user_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("actor_name").
			Optional().
			Default(""),
		field.Text("actor_email").
			Optional().
			Default(""),
		field.Text("actor_role").
			Optional().
			Default(""),
		field.UUID("church_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("action"),
		field.Text("resource_type"),
		field.Text("resource_id").
			Optional().
			Default(""),
		field.Text("details").
			Optional().
			Default("{}"),
		field.Text("ip_address").
			Optional().
			Default(""),
		field.Text("user_agent").
			Optional().
			Default(""),
		field.Time("created_at").
			Default(time.Now).
			Annotations(entsql.Default("CURRENT_TIMESTAMP")),
	}
}

// Edges of the AuditLog.
func (AuditLog) Edges() []ent.Edge {
	return nil
}

// Annotations of the AuditLog.
func (AuditLog) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "audit_logs"},
	}
}
