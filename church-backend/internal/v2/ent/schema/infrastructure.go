package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type AuditEvent struct {
	ent.Schema
}

func (AuditEvent) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Immutable(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("branch_id", uuid.UUID{}).Optional().Nillable(),
		field.UUID("actor_person_id", uuid.UUID{}).Optional().Nillable(),
		field.String("action"),
		field.String("resource_type"),
		field.UUID("resource_id", uuid.UUID{}).Optional().Nillable(),
		field.String("sensitivity").Default("GENERAL"),
		field.JSON("payload_diff", map[string]interface{}{}),
		field.Time("occurred_at").Default(time.Now),
	}
}

func (AuditEvent) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("organization_id", "occurred_at"),
	}
}

type OutboxEvent struct {
	ent.Schema
}

func (OutboxEvent) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Positive(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now),
		field.UUID("lease_token", uuid.UUID{}).Optional().Nillable(),
		field.String("last_error").Optional().Nillable(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("branch_id", uuid.UUID{}).Optional().Nillable(),
		field.String("event_type"),
		field.String("aggregate_type"),
		field.UUID("aggregate_id", uuid.UUID{}),
		field.JSON("payload", map[string]interface{}{}),
		field.String("state").Default("pending"), // pending, published, failed
		field.Int("retry_count").Default(0),
		field.Time("next_retry_at").Default(time.Now),
		field.String("locked_by").Optional().Nillable(),
		field.Time("locked_until").Optional().Nillable(),
		field.Time("occurred_at").Default(time.Now),
	}
}

func (OutboxEvent) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("state", "next_retry_at"),
	}
}

type ConsumerReceipt struct {
	ent.Schema
}

func (ConsumerReceipt) Fields() []ent.Field {
	return []ent.Field{
		field.Int("version").Default(1).Immutable(),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.String("consumer_name"),
		field.UUID("event_id", uuid.UUID{}),
		field.Time("processed_at").Default(time.Now),
	}
}

func (ConsumerReceipt) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("consumer_name", "event_id").Unique(),
	}
}

type IdempotencyRecord struct {
	ent.Schema
}

func (IdempotencyRecord) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.Int("version").Default(1).Positive(),
		field.Time("updated_at").Default(time.Now),
		field.String("idempotency_key"),
		field.UUID("organization_id", uuid.UUID{}),
		field.String("request_hash"),
		field.Int("status_code"),
		field.Bytes("response_body"),
		field.Time("created_at").Default(time.Now),
		field.Time("expires_at"),
	}
}

func (IdempotencyRecord) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("organization_id", "idempotency_key").Unique(),
		index.Fields("expires_at"),
	}
}

type LegacyRecordMap struct {
	ent.Schema
}

func (LegacyRecordMap) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("organization_id", uuid.UUID{}),
		field.String("source_system").Default("legacy-v1"),
		field.UUID("id", uuid.UUID{}).Default(uuid.New),
		field.Int("version").Default(1).Positive(),
		field.Time("updated_at").Default(time.Now),
		field.String("source_entity"),
		field.String("source_id"),
		field.UUID("target_id", uuid.UUID{}),
		field.String("target_entity"),
		field.String("migration_run_id"),
		field.Time("created_at").Default(time.Now),
	}
}

func (LegacyRecordMap) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("organization_id", "source_system", "source_entity", "source_id", "migration_run_id").Unique(),
	}
}
