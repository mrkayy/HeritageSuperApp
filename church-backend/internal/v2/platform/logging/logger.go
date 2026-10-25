package logging

import (
	"context"
	"io"
	"log/slog"
	"os"
	"strings"
)

type RedactingHandler struct {
	slog.Handler
}

var sensitiveKeys = map[string]bool{
	"password":        true,
	"password_hash":   true,
	"pin":             true,
	"pin_hash":        true,
	"token":           true,
	"session_token":   true,
	"secret":          true,
	"authorization":   true,
	"credential":      true,
	"credit_card":     true,
	"cookie":          true,
	"database_url":    true,
	"dsn":             true,
	"error":           true,
	"prayer_request":  true,
	"medical_notes":   true,
	"situation_notes": true,
}

func (h *RedactingHandler) Handle(ctx context.Context, r slog.Record) error {
	var newAttrs []slog.Attr
	r.Attrs(func(a slog.Attr) bool {
		newAttrs = append(newAttrs, redactAttr(a))
		return true
	})

	newRecord := slog.NewRecord(r.Time, r.Level, r.Message, r.PC)
	newRecord.AddAttrs(newAttrs...)
	return h.Handler.Handle(ctx, newRecord)
}

func redactAttr(a slog.Attr) slog.Attr {
	a.Value = a.Value.Resolve()
	keyLower := strings.ToLower(a.Key)
	if sensitiveKeys[keyLower] {
		return slog.String(a.Key, "[REDACTED]")
	}

	if a.Value.Kind() == slog.KindGroup {
		attrs := a.Value.Group()
		redacted := make([]slog.Attr, len(attrs))
		for i, attr := range attrs {
			redacted[i] = redactAttr(attr)
		}
		return slog.Attr{
			Key:   a.Key,
			Value: slog.GroupValue(redacted...),
		}
	}

	return a
}

func NewLogger(out io.Writer, levelStr string) *slog.Logger {
	if out == nil {
		out = os.Stdout
	}

	var level slog.Level
	switch strings.ToLower(levelStr) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	jsonHandler := slog.NewJSONHandler(out, &slog.HandlerOptions{
		Level: level,
	})

	redacting := &RedactingHandler{Handler: jsonHandler}
	return slog.New(redacting)
}

func (h *RedactingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	clean := make([]slog.Attr, len(attrs))
	for i, a := range attrs {
		clean[i] = redactAttr(a)
	}
	return &RedactingHandler{Handler: h.Handler.WithAttrs(clean)}
}
func (h *RedactingHandler) WithGroup(name string) slog.Handler {
	return &RedactingHandler{Handler: h.Handler.WithGroup(name)}
}
