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

// GuardianRelationship holds the schema definition for the GuardianRelationship entity.
type GuardianRelationship struct {
	ent.Schema
}

// Fields of the GuardianRelationship.
func (GuardianRelationship) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("child_member_id", uuid.UUID{}),
		field.UUID("guardian_member_id", uuid.UUID{}),
		field.Enum("relationship").
			Values("parent", "guardian", "grandparent", "sibling_guardian").
			Default("parent"),
		field.Time("created_at").
			Default(time.Now),
	}
}

// Edges of the GuardianRelationship.
func (GuardianRelationship) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("child", Member.Type).
			Ref("guardian_relationships_as_child").
			Unique().
			Field("child_member_id").
			Required(),
		edge.From("guardian", Member.Type).
			Ref("guardian_relationships_as_guardian").
			Unique().
			Field("guardian_member_id").
			Required(),
	}
}

// Indexes of the GuardianRelationship.
func (GuardianRelationship) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("child_member_id", "guardian_member_id").
			Unique(),
	}
}

// Annotations of the GuardianRelationship.
func (GuardianRelationship) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "guardian_relationships"},
	}
}
