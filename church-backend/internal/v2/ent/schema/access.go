package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type RoleTemplate struct {
	ent.Schema
}

func (RoleTemplate) Fields() []ent.Field {
	return []ent.Field{
		field.Time("updated_at").Default(time.Now),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.String("name").NotEmpty(),
		field.String("description").Optional().Nillable(),
		field.Int("version").Default(1),
		field.Time("created_at").Default(time.Now),
	}
}

func (RoleTemplate) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("capabilities", Capability.Type).
			Through("role_capabilities", RoleCapability.Type),
		edge.To("assignments", Assignment.Type),
	}
}

func (RoleTemplate) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("organization_id", "name").Unique(),
	}
}

type Capability struct {
	ent.Schema
}

func (Capability) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.Time("updated_at").Default(time.Now),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.String("code").NotEmpty().Unique(),
		field.String("description").Optional().Nillable(),
		field.String("category").Default("general"),
		field.Time("created_at").Default(time.Now),
	}
}

func (Capability) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("roles", RoleTemplate.Type).
			Ref("capabilities").
			Through("role_capabilities", RoleCapability.Type),
		edge.To("scoped_grants", ScopedGrant.Type),
		edge.To("baseline_grants", BaselineGrant.Type),
	}
}

type RoleCapability struct {
	ent.Schema
}

func (RoleCapability) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.Int("version").Default(1).Positive(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now),
		field.UUID("role_template_id", uuid.UUID{}),
		field.UUID("capability_id", uuid.UUID{}),
	}
}

func (RoleCapability) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("role", RoleTemplate.Type).
			Field("role_template_id").
			Unique().
			Required(),
		edge.To("capability", Capability.Type).
			Field("capability_id").
			Unique().
			Required(),
	}
}

type Assignment struct {
	ent.Schema
}

func (Assignment) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.Time("updated_at").Default(time.Now),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("branch_id", uuid.UUID{}).Optional().Nillable(),
		field.UUID("person_id", uuid.UUID{}),
		field.UUID("role_template_id", uuid.UUID{}).Optional().Nillable(),
		field.UUID("team_id", uuid.UUID{}).Optional().Nillable(),
		field.UUID("sector_id", uuid.UUID{}).Optional().Nillable(),
		field.String("scope_level"), // SELF, ASSIGNED, TEAM, SECTOR, CHURCH, ORGANIZATION, PLATFORM
		field.UUID("scope_resource_id", uuid.UUID{}).Optional().Nillable(),
		field.Time("valid_from").Default(time.Now),
		field.Time("valid_until").Optional().Nillable(),
		field.Time("revoked_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
	}
}

func (Assignment) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("person", Person.Type).
			Ref("assignments").
			Field("person_id").
			Unique().
			Required(),
		edge.From("role_template", RoleTemplate.Type).
			Ref("assignments").
			Field("role_template_id").
			Unique(),
		edge.To("scoped_grants", ScopedGrant.Type),
	}
}

func (Assignment) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("person_id"),
		index.Fields("branch_id"),
	}
}

type ScopedGrant struct {
	ent.Schema
}

func (ScopedGrant) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now),
		field.Time("revoked_at").Optional().Nillable(),
		field.Bool("delegable").Default(false),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("assignment_id", uuid.UUID{}),
		field.UUID("capability_id", uuid.UUID{}),
		field.String("scope_level"),
		field.UUID("scope_resource_id", uuid.UUID{}).Optional().Nillable(),
		field.String("sensitivity_class").Default("GENERAL"),
		field.Time("valid_from").Default(time.Now),
		field.Time("valid_until").Optional().Nillable(),
	}
}

func (ScopedGrant) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("assignment", Assignment.Type).
			Ref("scoped_grants").
			Field("assignment_id").
			Unique().
			Required(),
		edge.From("capability", Capability.Type).
			Ref("scoped_grants").
			Field("capability_id").
			Unique().
			Required(),
		edge.To("delegations", Delegation.Type),
	}
}

type BaselineGrant struct {
	ent.Schema
}

func (BaselineGrant) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.Time("updated_at").Default(time.Now),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("account_id", uuid.UUID{}),
		field.UUID("capability_id", uuid.UUID{}),
		field.String("scope_level").Default("SELF"),
		field.Time("created_at").Default(time.Now),
	}
}

func (BaselineGrant) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("account", Account.Type).
			Ref("baseline_grants").
			Field("account_id").
			Unique().
			Required(),
		edge.From("capability", Capability.Type).
			Ref("baseline_grants").
			Field("capability_id").
			Unique().
			Required(),
	}
}

func (BaselineGrant) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("account_id", "capability_id").Unique(),
	}
}

type Delegation struct {
	ent.Schema
}

func (Delegation) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.Time("updated_at").Default(time.Now),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("parent_grant_id", uuid.UUID{}),
		field.UUID("delegated_to_assignment_id", uuid.UUID{}),
		field.Time("valid_from").Default(time.Now),
		field.Time("valid_until"),
		field.Time("revoked_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
	}
}

func (Delegation) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("parent_grant", ScopedGrant.Type).
			Ref("delegations").
			Field("parent_grant_id").
			Unique().
			Required(),
	}
}
