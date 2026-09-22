package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Organization struct {
	ent.Schema
}

func (Organization) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.String("name").NotEmpty(),
		field.String("slug").NotEmpty().Unique(),
		field.String("status").Default("active"),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Organization) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("branches", Branch.Type),
		edge.To("people", Person.Type),
	}
}

type Branch struct {
	ent.Schema
}

func (Branch) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.String("name").NotEmpty(),
		field.String("center").Optional().Nillable(),
		field.String("slug").NotEmpty(),
		field.String("timezone").Default("Africa/Lagos"),
		field.String("status").Default("active"),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Branch) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("branches").
			Field("organization_id").
			Unique().
			Required(),
		edge.To("sectors", Sector.Type),
		edge.To("teams", Team.Type),
		edge.To("affiliations", ChurchAffiliation.Type),
	}
}

func (Branch) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("organization_id", "slug").Unique(),
	}
}

type Sector struct {
	ent.Schema
}

func (Sector) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("branch_id", uuid.UUID{}),
		field.String("name").NotEmpty(),
		field.String("status").Default("active"),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Sector) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("branch", Branch.Type).
			Ref("sectors").
			Field("branch_id").
			Unique().
			Required(),
	}
}

func (Sector) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("branch_id", "name").Unique(),
	}
}

type Team struct {
	ent.Schema
}

func (Team) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("branch_id", uuid.UUID{}),
		field.String("name").NotEmpty(),
		field.String("status").Default("active"),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Team) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("branch", Branch.Type).
			Ref("teams").
			Field("branch_id").
			Unique().
			Required(),
	}
}

func (Team) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("branch_id", "name").Unique(),
	}
}
