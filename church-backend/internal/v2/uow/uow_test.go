package uow_test

import (
	"context"
	"database/sql"
	"errors"
	"github.com/hofchurchng/church-backend/internal/v2/testutil"
	"testing"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/v2/fixtures"
	"github.com/hofchurchng/church-backend/internal/v2/migration"
	"github.com/hofchurchng/church-backend/internal/v2/platform/clock"
	"github.com/hofchurchng/church-backend/internal/v2/uow"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupUowDB(t *testing.T) (*sql.DB, *uow.UnitOfWork) {
	t.Helper()
	db := testutil.Open(t)
	ctx := context.Background()

	runner, err := migration.NewRunner(db, nil)
	if err != nil {
		t.Fatalf("migration runner: %v", err)
	}
	if _, err := runner.Up(ctx); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	if err := fixtures.LoadSyntheticFixtures(ctx, db); err != nil {
		t.Fatalf("seed fixtures: %v", err)
	}

	unitOfWork := uow.NewUnitOfWork(db, clock.NewRealClock())
	return db, unitOfWork
}

func TestUnitOfWork_Commit(t *testing.T) {
	db, unitOfWork := setupUowDB(t)
	defer db.Close()
	ctx := context.Background()

	personID := uuid.New()
	actionName := "person.registered"

	err := unitOfWork.Execute(ctx, func(scope *uow.TxScope) error {
		// 1. Domain action: insert person
		_, err := scope.Tx.ExecContext(ctx, `
			INSERT INTO people (id, organization_id, first_name, last_name, identity_status)
			VALUES ($1, $2, 'John', 'Doe', 'verified')
		`, personID, fixtures.OrgHeritageID)
		if err != nil {
			return err
		}

		// 2. Append audit
		_, err = scope.AppendAudit(ctx, uow.AuditEventInput{
			OrganizationID: fixtures.OrgHeritageID,
			ActorPersonID:  &fixtures.PersonAdaID,
			Action:         actionName,
			ResourceType:   "person",
			ResourceID:     &personID,
			PayloadDiff:    map[string]interface{}{"first_name": "John", "last_name": "Doe"},
		})
		if err != nil {
			return err
		}

		// 3. Enqueue outbox event
		_, err = scope.EnqueueOutbox(ctx, uow.OutboxEventInput{
			OrganizationID: fixtures.OrgHeritageID,
			EventType:      "person.created.v1",
			AggregateType:  "person",
			AggregateID:    personID,
			Payload:        map[string]interface{}{"person_id": personID.String()},
		})
		return err
	})
	if err != nil {
		t.Fatalf("execute transaction: %v", err)
	}

	// Verify all 3 were committed
	var count int
	err = db.QueryRowContext(ctx, `SELECT count(*) FROM people WHERE id = $1`, personID).Scan(&count)
	if err != nil || count != 1 {
		t.Errorf("expected person in db, got count=%d, err=%v", count, err)
	}

	err = db.QueryRowContext(ctx, `SELECT count(*) FROM audit_events WHERE resource_id = $1`, personID).Scan(&count)
	if err != nil || count != 1 {
		t.Errorf("expected audit event in db, got count=%d, err=%v", count, err)
	}

	err = db.QueryRowContext(ctx, `SELECT count(*) FROM outbox_events WHERE aggregate_id = $1`, personID).Scan(&count)
	if err != nil || count != 1 {
		t.Errorf("expected outbox event in db, got count=%d, err=%v", count, err)
	}
}

func TestUnitOfWork_RollbackOnFailure(t *testing.T) {
	db, unitOfWork := setupUowDB(t)
	defer db.Close()
	ctx := context.Background()

	personID := uuid.New()
	simulatedErr := errors.New("simulated business rule validation failure")

	err := unitOfWork.Execute(ctx, func(scope *uow.TxScope) error {
		// 1. Domain action
		_, err := scope.Tx.ExecContext(ctx, `
			INSERT INTO people (id, organization_id, first_name, last_name, identity_status)
			VALUES ($1, $2, 'Failed', 'User', 'pending')
		`, personID, fixtures.OrgHeritageID)
		if err != nil {
			return err
		}

		// 2. Audit
		_, err = scope.AppendAudit(ctx, uow.AuditEventInput{
			OrganizationID: fixtures.OrgHeritageID,
			Action:         "person.attempt",
			ResourceType:   "person",
			ResourceID:     &personID,
		})
		if err != nil {
			return err
		}

		// 3. Outbox
		_, err = scope.EnqueueOutbox(ctx, uow.OutboxEventInput{
			OrganizationID: fixtures.OrgHeritageID,
			EventType:      "person.failed.v1",
			AggregateType:  "person",
			AggregateID:    personID,
		})
		if err != nil {
			return err
		}

		// Fail the transaction
		return simulatedErr
	})

	if !errors.Is(err, simulatedErr) {
		t.Fatalf("expected simulated error, got %v", err)
	}

	// Verify complete rollback: zero rows persisted in people, audit_events, or outbox_events
	var count int
	err = db.QueryRowContext(ctx, `SELECT count(*) FROM people WHERE id = $1`, personID).Scan(&count)
	if err != nil || count != 0 {
		t.Errorf("expected person rolled back, got count=%d", count)
	}

	err = db.QueryRowContext(ctx, `SELECT count(*) FROM audit_events WHERE resource_id = $1`, personID).Scan(&count)
	if err != nil || count != 0 {
		t.Errorf("expected audit event rolled back, got count=%d", count)
	}

	err = db.QueryRowContext(ctx, `SELECT count(*) FROM outbox_events WHERE aggregate_id = $1`, personID).Scan(&count)
	if err != nil || count != 0 {
		t.Errorf("expected outbox event rolled back, got count=%d", count)
	}
}

func TestUnitOfWorkPanicRollsBack(t *testing.T) {
	db, unit := setupUowDB(t)
	ctx := context.Background()
	func() {
		defer func() {
			if recover() == nil {
				t.Error("expected domain panic")
			}
		}()
		_ = unit.Execute(ctx, func(scope *uow.TxScope) error {
			if _, err := scope.Tx.ExecContext(ctx, "UPDATE people SET first_name='ShouldRollback' WHERE id=$1", fixtures.PersonAdaID); err != nil {
				t.Fatal(err)
			}
			panic("domain panic")
		})
	}()
	var name string
	if err := db.QueryRowContext(ctx, "SELECT first_name FROM people WHERE id=$1", fixtures.PersonAdaID).Scan(&name); err != nil || name != "Ada" {
		t.Fatalf("panic leaked transaction: %s %v", name, err)
	}
}
