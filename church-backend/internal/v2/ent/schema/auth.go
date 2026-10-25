package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Account struct {
	ent.Schema
}

func (Account) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("person_id", uuid.UUID{}),
		field.String("status").Default("active"), // active, suspended, pending
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Account) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("person", Person.Type).
			Ref("accounts").
			Field("person_id").
			Unique().
			Required(),
		edge.To("auth_methods", AuthMethod.Type),
		edge.To("sessions", Session.Type),
		edge.To("baseline_grants", BaselineGrant.Type),
	}
}

func (Account) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("person_id"),
	}
}

type AuthMethod struct {
	ent.Schema
}

func (AuthMethod) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("account_id", uuid.UUID{}),
		field.String("kind"), // password, google_oauth, magic_link
		field.String("identifier"),
		field.String("credential_hash").Optional().Nillable(),
		field.Time("verified_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (AuthMethod) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("account", Account.Type).
			Ref("auth_methods").
			Field("account_id").
			Unique().
			Required(),
	}
}

func (AuthMethod) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("kind", "identifier").Unique(),
		index.Fields("account_id"),
	}
}

type Session struct {
	ent.Schema
}

func (Session) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.Time("updated_at").Default(time.Now),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("account_id", uuid.UUID{}),
		field.String("session_token_hash").Unique(),
		field.String("user_agent").Optional().Nillable(),
		field.String("ip_address").Optional().Nillable(),
		field.Time("expires_at"),
		field.Time("revoked_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
		field.Time("last_active_at").Default(time.Now),
	}
}

func (Session) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("account", Account.Type).
			Ref("sessions").
			Field("account_id").
			Unique().
			Required(),
	}
}

func (Session) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("account_id"),
		index.Fields("session_token_hash"),
	}
}
