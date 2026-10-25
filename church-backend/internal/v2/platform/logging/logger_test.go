package logging

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"
)

func TestRedactionSurvivesWithAndGroups(t *testing.T) {
	var buffer bytes.Buffer
	logger := NewLogger(&buffer, "info").With("password", "secret-one").WithGroup("request")
	logger.Info("test", slog.Group("nested", slog.String("token", "secret-two")), "error", "postgres://secret-three")
	for _, secret := range []string{"secret-one", "secret-two", "secret-three"} {
		if strings.Contains(buffer.String(), secret) {
			t.Fatalf("secret leaked: %s", buffer.String())
		}
	}
	if !strings.Contains(buffer.String(), "REDACTED") {
		t.Fatal("missing redaction")
	}
}
