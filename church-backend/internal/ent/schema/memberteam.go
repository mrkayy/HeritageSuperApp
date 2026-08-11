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

// MemberTeam holds the schema definition for the MemberTeam entity.
type MemberTeam struct {
	ent.Schema
}

// Fields of the MemberTeam.
func (MemberTeam) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("member_id", uuid.UUID{}),
		field.UUID("team_id", uuid.UUID{}),
		field.Bool("is_primary").
			Default(false),
		field.Time("joined_at").
			Default(time.Now),
	}
}

// Edges of the MemberTeam.
func (MemberTeam) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("member", Member.Type).
			Ref("teams").
			Unique().
			Field("member_id").
			Required().
			Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.From("team", Team.Type).
			Ref("member_teams").
			Unique().
			Field("team_id").
			Required(),
	}
}

// Indexes of the MemberTeam.
func (MemberTeam) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("member_id", "team_id").
			Unique(),
	}
}

// Annotations of the MemberTeam.
func (MemberTeam) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "member_teams"},
	}
}
