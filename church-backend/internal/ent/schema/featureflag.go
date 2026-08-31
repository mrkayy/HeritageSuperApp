package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// FeatureFlag holds the schema definition for the FeatureFlag entity.
type FeatureFlag struct {
	ent.Schema
}

// Fields of the FeatureFlag.
func (FeatureFlag) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			StorageKey("feature_flag_id"),
		field.String("key").
			NotEmpty().
			Unique(),
		field.String("name").
			NotEmpty(),
		field.Text("description").
			Optional().
			Nillable(),
		field.String("category").
			Default("global"),
		field.Bool("is_enabled").
			Default(true),
		field.JSON("allowed_roles", []string{}).
			Optional(),
		field.String("updated_by").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the FeatureFlag.
func (FeatureFlag) Edges() []ent.Edge {
	return nil
}

// Annotations of the FeatureFlag.
func (FeatureFlag) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "feature_flags"},
	}
}
