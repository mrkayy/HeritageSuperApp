package idempotency

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
)

var (
	ErrIdempotencyConflict = errors.New("idempotency key already used with a different request payload")
)

type Record struct {
	Key          string
	RequestHash  string
	StatusCode   int
	ResponseBody []byte
	ExpiresAt    time.Time
}

type Store struct {
	db    *sql.DB
	clock clock.Clock
}

func NewStore(db *sql.DB, clk clock.Clock) *Store {
	if clk == nil {
		clk = clock.NewRealClock()
	}
	return &Store{
		db:    db,
		clock: clk,
	}
}

func HashPayload(body []byte) string {
	h := sha256.Sum256(body)
	return hex.EncodeToString(h[:])
}

// Check verifies if the idempotency key was previously processed.
// If reused with a different request body, returns ErrIdempotencyConflict.
// If previously completed, returns the cached Record.
// If not found, returns nil, nil.
func (s *Store) Check(ctx context.Context, orgID uuid.UUID, key string, body []byte) (*Record, error) {
	if key == "" {
		return nil, nil
	}

	requestHash := HashPayload(body)
	now := s.clock.Now()

	query := `
		SELECT request_hash, status_code, response_body, expires_at
		FROM idempotency_records
		WHERE organization_id = $1 AND idempotency_key = $2
	`

	var rec Record
	rec.Key = key

	err := s.db.QueryRowContext(ctx, query, orgID, key).Scan(
		&rec.RequestHash, &rec.StatusCode, &rec.ResponseBody, &rec.ExpiresAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("check idempotency key: %w", err)
	}

	if !now.Before(rec.ExpiresAt) {
		return nil, nil // Expired record can be overwritten or ignored
	}

	if rec.RequestHash != requestHash {
		return nil, ErrIdempotencyConflict
	}

	return &rec, nil
}

// Execute serializes an idempotency key and commits domain effects and its response together.
// Callers must perform all database effects through tx and no external side effects.
func (s *Store) Execute(ctx context.Context, orgID uuid.UUID, key string, body []byte, ttl time.Duration, fn func(*sql.Tx) (int, []byte, error)) (*Record, error) {
	if key == "" || len(key) > 512 || orgID == uuid.Nil || ttl <= 0 || fn == nil {
		return nil, errors.New("invalid idempotency parameters")
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", orgID.String()+":"+key); err != nil {
		return nil, err
	}
	now := s.clock.Now()
	rec := &Record{Key: key}
	err = tx.QueryRowContext(ctx, `SELECT request_hash,status_code,response_body,expires_at FROM idempotency_records WHERE organization_id=$1 AND idempotency_key=$2`, orgID, key).Scan(&rec.RequestHash, &rec.StatusCode, &rec.ResponseBody, &rec.ExpiresAt)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	hash := HashPayload(body)
	if err == nil && now.Before(rec.ExpiresAt) {
		if rec.RequestHash != hash {
			return nil, ErrIdempotencyConflict
		}
		return rec, tx.Commit()
	}
	status, response, err := fn(tx)
	if err != nil {
		return nil, err
	}
	rec = &Record{Key: key, RequestHash: hash, StatusCode: status, ResponseBody: response, ExpiresAt: now.Add(ttl)}
	_, err = tx.ExecContext(ctx, `INSERT INTO idempotency_records(organization_id,idempotency_key,request_hash,status_code,response_body,created_at,expires_at)
 VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(organization_id,idempotency_key) DO UPDATE SET request_hash=EXCLUDED.request_hash,status_code=EXCLUDED.status_code,response_body=EXCLUDED.response_body,created_at=EXCLUDED.created_at,expires_at=EXCLUDED.expires_at`, orgID, key, hash, status, response, now, rec.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return rec, tx.Commit()
}

// Save is for storing an already-computed response only. Mutating workflows must use Execute.
func (s *Store) Save(ctx context.Context, orgID uuid.UUID, key string, body []byte, statusCode int, responseBody []byte, ttl time.Duration) error {
	_, err := s.Execute(ctx, orgID, key, body, ttl, func(*sql.Tx) (int, []byte, error) { return statusCode, responseBody, nil })
	return err
}

// ScopedKey isolates keys by authenticated actor and operation. Request handlers
// must use a stable operation identifier, not a raw user-controlled URL.
func ScopedKey(actor uuid.UUID, operation, key string) string {
	return HashPayload([]byte(actor.String() + "\x00" + operation + "\x00" + key))
}
