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

type Person struct {
	ent.Schema
}

func (Person) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.String("first_name").Default(""),
		field.String("last_name").Default(""),
		field.String("identity_status").Default("provisional"),
		field.UUID("merged_into_person_id", uuid.UUID{}).Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Person) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("people").
			Field("organization_id").
			Unique().
			Required(),
		edge.To("contact_points", ContactPoint.Type),
		edge.To("affiliations", ChurchAffiliation.Type),
		edge.To("accounts", Account.Type),
		edge.To("assignments", Assignment.Type),
	}
}

type ContactPoint struct {
	ent.Schema
}

func (ContactPoint) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("person_id", uuid.UUID{}),
		field.String("kind"), // phone, email
		field.String("raw_value"),
		field.String("normalized_value"),
		field.Bool("is_primary").Default(false),
		field.Bool("is_shared").Default(false),
		field.Time("verified_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (ContactPoint) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("person", Person.Type).
			Ref("contact_points").
			Field("person_id").
			Unique().
			Required(),
	}
}

func (ContactPoint) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("organization_id", "kind", "normalized_value"),
		index.Fields("person_id"),
	}
}

type ChurchAffiliation struct {
	ent.Schema
}

func (ChurchAffiliation) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("person_id", uuid.UUID{}),
		field.UUID("branch_id", uuid.UUID{}),
		field.String("relationship_status").Default("active"), // active, transferring, ended
		field.String("membership_status").Default("visitor"),  // visitor, attendee, candidate, member, steward, inactive_member
		field.Bool("is_primary").Default(true),
		field.Time("joined_at").Default(time.Now),
		field.Time("ended_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (ChurchAffiliation) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("person", Person.Type).
			Ref("affiliations").
			Field("person_id").
			Unique().
			Required(),
		edge.From("branch", Branch.Type).
			Ref("affiliations").
			Field("branch_id").
			Unique().
			Required(),
	}
}

func (ChurchAffiliation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("person_id"),
		index.Fields("branch_id"),
	}
}

func (Person) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "people"}}
}
