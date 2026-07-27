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

// TransportRequest holds the schema definition for the TransportRequest entity.
type TransportRequest struct {
	ent.Schema
}

// Fields of the TransportRequest.
func (TransportRequest) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("request_id"),
		field.UUID("soul_id", uuid.UUID{}),
		field.Text("pickup_address").
			Optional().
			Nillable(),
		field.UUID("assigned_team_id", uuid.UUID{}).
			Optional().
			Nillable(),
		field.Text("status").
			Default("pending").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the TransportRequest.
func (TransportRequest) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("soul", Soul.Type).
			Ref("transport_requests").
			Unique().
			Field("soul_id").
			Required(),
		edge.From("assigned_team", Team.Type).
			Ref("transport_requests").
			Unique().
			Field("assigned_team_id"),
	}
}

// Annotations of the TransportRequest.
func (TransportRequest) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "transport_request"},
	}
}
