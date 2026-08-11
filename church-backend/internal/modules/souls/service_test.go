package souls

import (
	"context"
	"testing"

	"github.com/hofchurchng/church-backend/internal/contracts"
)

func TestService_Validations(t *testing.T) {
	svc := NewService(nil)
	ctx := context.Background()

	t.Run("CreateSoul requires full_name", func(t *testing.T) {
		_, err := svc.CreateSoul(ctx, contracts.CreateSoulDTO{Phone: "123"}, "user-123")
		if err == nil || err.Error() != "full_name is required" {
			t.Errorf("expected full_name is required error, got %v", err)
		}
	})

	t.Run("CreateSoul requires phone", func(t *testing.T) {
		_, err := svc.CreateSoul(ctx, contracts.CreateSoulDTO{FullName: "John Doe"}, "user-123")
		if err == nil || err.Error() != "phone is required" {
			t.Errorf("expected phone is required error, got %v", err)
		}
	})

	t.Run("GetSoul requires id", func(t *testing.T) {
		_, err := svc.GetSoul(ctx, "")
		if err == nil || err.Error() != "id is required" {
			t.Errorf("expected id is required error, got %v", err)
		}
	})

	t.Run("AddSoulJournal requires note", func(t *testing.T) {
		_, err := svc.AddSoulJournal(ctx, "soul-123", nil, "")
		if err == nil || err.Error() != "note is required" {
			t.Errorf("expected note is required error, got %v", err)
		}
	})
}
