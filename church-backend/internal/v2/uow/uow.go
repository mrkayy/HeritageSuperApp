package uow

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/platform/uid"
)

type AuditEventInput struct {
	OrganizationID uuid.UUID
	BranchID       *uuid.UUID
	ActorPersonID  *uuid.UUID
	Action         string
	ResourceType   string
	ResourceID     *uuid.UUID
	Sensitivity    string
	PayloadDiff    map[string]interface{}
}

type OutboxEventInput struct {
	OrganizationID uuid.UUID
	BranchID       *uuid.UUID
	EventType      string
	AggregateType  string
	AggregateID    uuid.UUID
	Payload        map[string]interface{}
}

type TxScope struct {
	Tx    *sql.Tx
	clock clock.Clock
	ids   uid.Generator
}

func (s *TxScope) AppendAudit(ctx context.Context, input AuditEventInput) (uuid.UUID, error) {
	eventID := s.ids.New()
	now := s.clock.Now()
	if input.Sensitivity == "" {
		input.Sensitivity = "GENERAL"
	}
	if input.PayloadDiff == nil {
		input.PayloadDiff = map[string]interface{}{}
	}

	diffJSON, err := json.Marshal(input.PayloadDiff)
	if err != nil {
		return uuid.Nil, fmt.Errorf("marshal audit diff: %w", err)
	}

	query := `
		INSERT INTO audit_events (
			id, organization_id, branch_id, actor_person_id, action,
			resource_type, resource_id, sensitivity, payload_diff, occurred_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = s.Tx.ExecContext(ctx, query,
		eventID, input.OrganizationID, input.BranchID, input.ActorPersonID,
		input.Action, input.ResourceType, input.ResourceID, input.Sensitivity,
		diffJSON, now,
	)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert audit event: %w", err)
	}

	return eventID, nil
}

func (s *TxScope) EnqueueOutbox(ctx context.Context, input OutboxEventInput) (uuid.UUID, error) {
	eventID := s.ids.New()
	now := s.clock.Now()

	payloadJSON, err := json.Marshal(input.Payload)
	if err != nil {
		return uuid.Nil, fmt.Errorf("marshal outbox payload: %w", err)
	}

	query := `
		INSERT INTO outbox_events (
			id, organization_id, branch_id, event_type, aggregate_type,
			aggregate_id, payload, state, retry_count, next_retry_at, occurred_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, $8, $8)
	`
	_, err = s.Tx.ExecContext(ctx, query,
		eventID, input.OrganizationID, input.BranchID, input.EventType,
		input.AggregateType, input.AggregateID, payloadJSON, now,
	)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert outbox event: %w", err)
	}

	return eventID, nil
}

type UnitOfWork struct {
	db    *sql.DB
	clock clock.Clock
	ids   uid.Generator
}

func NewUnitOfWork(db *sql.DB, clk clock.Clock, generators ...uid.Generator) *UnitOfWork {
	if clk == nil {
		clk = clock.NewRealClock()
	}
	ids := uid.NewGenerator()
	if len(generators) > 0 && generators[0] != nil {
		ids = generators[0]
	}
	return &UnitOfWork{
		ids:   ids,
		db:    db,
		clock: clk,
	}
}

// Execute runs a transaction block with support for atomic audit and outbox events.
func (u *UnitOfWork) Execute(ctx context.Context, fn func(scope *TxScope) error) error {
	tx, err := u.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	defer tx.Rollback()
	scope := &TxScope{
		ids:   u.ids,
		Tx:    tx,
		clock: u.clock,
	}

	if err := fn(scope); err != nil {
		_ = tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

// Scope joins an existing transaction, including idempotency.Execute callbacks.
// The caller owns commit/rollback; audit and outbox use this same transaction.
func (u *UnitOfWork) Scope(tx *sql.Tx) *TxScope { return &TxScope{Tx: tx, clock: u.clock, ids: u.ids} }
