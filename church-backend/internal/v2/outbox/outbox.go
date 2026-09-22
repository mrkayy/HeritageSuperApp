package outbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/platform/uid"
)

var (
	ErrAlreadyProcessed = errors.New("event already processed by this consumer")
	ErrLeaseExpired     = errors.New("lease expired or not owned by worker")
)

type Event struct {
	ID             uuid.UUID
	LeaseToken     uuid.UUID
	OrganizationID uuid.UUID
	BranchID       *uuid.UUID
	EventType      string
	AggregateType  string
	AggregateID    uuid.UUID
	Payload        json.RawMessage
	State          string
	RetryCount     int
	OccurredAt     time.Time
}

type Dispatcher struct {
	db    *sql.DB
	clock clock.Clock
	ids   uid.Generator
}

func NewDispatcher(db *sql.DB, clk clock.Clock, generators ...uid.Generator) *Dispatcher {
	if clk == nil {
		clk = clock.NewRealClock()
	}
	ids := uid.NewGenerator()
	if len(generators) > 0 && generators[0] != nil {
		ids = generators[0]
	}
	return &Dispatcher{ids: ids,
		db:    db,
		clock: clk,
	}
}

// LeaseEvents acquires a batch of pending/failed events using SELECT ... FOR UPDATE SKIP LOCKED.
func (d *Dispatcher) LeaseEvents(ctx context.Context, workerID string, limit int, leaseDuration time.Duration) ([]Event, error) {
	if workerID == "" || limit < 1 || limit > 1000 || leaseDuration <= 0 {
		return nil, errors.New("invalid lease parameters")
	}
	now := d.clock.Now()
	lockedUntil := now.Add(leaseDuration)

	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin lease tx: %w", err)
	}
	defer tx.Rollback()

	query := `
		SELECT id, organization_id, branch_id, event_type, aggregate_type, aggregate_id, payload, state, retry_count, occurred_at
		FROM outbox_events
		WHERE state = 'pending'
		  AND next_retry_at <= $1
		  AND (locked_until IS NULL OR locked_until <= $1)
		ORDER BY occurred_at ASC
		LIMIT $2
		FOR UPDATE SKIP LOCKED
	`

	rows, err := tx.QueryContext(ctx, query, now, limit)
	if err != nil {
		return nil, fmt.Errorf("query events for lease: %w", err)
	}
	defer rows.Close()

	var events []Event

	for rows.Next() {
		var e Event
		var payloadBytes []byte
		if err := rows.Scan(
			&e.ID, &e.OrganizationID, &e.BranchID, &e.EventType, &e.AggregateType,
			&e.AggregateID, &payloadBytes, &e.State, &e.RetryCount, &e.OccurredAt,
		); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		e.Payload = payloadBytes
		e.LeaseToken = d.ids.New()
		events = append(events, e)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	if len(events) == 0 {
		return nil, nil
	}

	// Update lease on selected events
	for _, e := range events {
		updateQuery := `
			UPDATE outbox_events 
			SET locked_by = $1, locked_until = $2, lease_token = $4 
			WHERE id = $3
		`
		if _, err := tx.ExecContext(ctx, updateQuery, workerID, lockedUntil, e.ID, e.LeaseToken); err != nil {
			return nil, fmt.Errorf("update lease: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit lease: %w", err)
	}

	return events, nil
}

// MarkPublished marks the event published and releases lock.
func (d *Dispatcher) MarkPublished(ctx context.Context, eventID uuid.UUID, workerID string, token uuid.UUID) error {
	query := `
		UPDATE outbox_events
		SET state = 'published', locked_by = NULL, locked_until = NULL, lease_token = NULL
		WHERE id = $1 AND locked_by = $2 AND lease_token=$3 AND locked_until > $4 AND state='pending'
	`
	res, err := d.db.ExecContext(ctx, query, eventID, workerID, token, d.clock.Now())
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrLeaseExpired
	}
	return nil
}

// MarkFailed handles bounded exponential backoff retry or marks failed.
func (d *Dispatcher) MarkFailed(ctx context.Context, eventID uuid.UUID, workerID string, token uuid.UUID, maxRetries int) error {
	if maxRetries < 1 {
		return errors.New("max retries must be positive")
	}
	now := d.clock.Now()

	query := `
		UPDATE outbox_events
		SET retry_count = retry_count + 1,
		    state = CASE WHEN retry_count + 1 >= $3 THEN 'failed' ELSE 'pending' END,
		    next_retry_at = $4::timestamptz + (LEAST(3600, power(2, LEAST(retry_count+1,12))) * interval '1 second'),
 last_error = 'consumer processing failed',
 lease_token=NULL,
		    locked_by = NULL,
		    locked_until = NULL
		WHERE id = $1 AND locked_by = $2 AND lease_token=$5 AND locked_until > $4 AND state='pending'
	`
	res, err := d.db.ExecContext(ctx, query, eventID, workerID, maxRetries, now, token)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrLeaseExpired
	}
	return nil
}

// RecordReceipt records a consumer receipt in the given transaction to prevent duplicate processing.
func RecordReceipt(ctx context.Context, tx *sql.Tx, consumerName string, eventID uuid.UUID) error {
	query := `
		INSERT INTO consumer_receipts (consumer_name, event_id, processed_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (consumer_name, event_id) DO NOTHING
	`
	res, err := tx.ExecContext(ctx, query, consumerName, eventID)
	if err != nil {
		return fmt.Errorf("insert consumer receipt: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrAlreadyProcessed
	}
	return nil
}

// Consume atomically records a receipt with a consumer's local database effects.
// Outbound network delivery remains at-least-once and needs provider idempotency.
func (d *Dispatcher) Consume(ctx context.Context, consumer string, event Event, fn func(*sql.Tx) error) error {
	if consumer == "" || fn == nil {
		return errors.New("consumer and handler required")
	}
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = RecordReceipt(ctx, tx, consumer, event.ID); err != nil {
		return err
	}
	if err = fn(tx); err != nil {
		return err
	}
	return tx.Commit()
}

// DispatchOnce performs one bounded worker batch of local transactional consumers.
// A receipt committed before an acknowledgement makes lease recovery safe to replay.
func (d *Dispatcher) DispatchOnce(ctx context.Context, worker, consumer string, limit int, lease time.Duration, maxAttempts int, handler func(*sql.Tx, Event) error) (int, error) {
	if handler == nil || consumer == "" || maxAttempts < 1 {
		return 0, errors.New("invalid worker configuration")
	}
	events, err := d.LeaseEvents(ctx, worker, limit, lease)
	if err != nil {
		return 0, err
	}
	completed := 0
	for _, event := range events {
		err = d.Consume(ctx, consumer, event, func(tx *sql.Tx) error { return handler(tx, event) })
		if err != nil && !errors.Is(err, ErrAlreadyProcessed) {
			if failErr := d.MarkFailed(ctx, event.ID, worker, event.LeaseToken, maxAttempts); failErr != nil {
				return completed, failErr
			}
			continue
		}
		if err = d.MarkPublished(ctx, event.ID, worker, event.LeaseToken); err != nil {
			return completed, err
		}
		completed++
	}
	return completed, nil
}
