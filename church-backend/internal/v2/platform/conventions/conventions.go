// Package conventions contains contracts shared by subsequent V2 resource modules.
package conventions

import (
	"database/sql"
	"encoding/base64"
	"errors"
	"github.com/google/uuid"
	"net/url"
	"strconv"
	"strings"
)

var ErrVersionConflict = errors.New("resource version changed")

type Page struct {
	Limit int
	After *uuid.UUID
}

// ParsePage uses stable ascending UUID keyset order; filters must be reapplied by the repository.
func ParsePage(values url.Values) (Page, error) {
	page := Page{Limit: 25}
	if raw := values.Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 100 {
			return page, errors.New("limit must be between 1 and 100")
		}
		page.Limit = n
	}
	if raw := values.Get("cursor"); raw != "" {
		decoded, err := base64.RawURLEncoding.DecodeString(raw)
		if err != nil {
			return page, errors.New("invalid cursor")
		}
		id, err := uuid.Parse(string(decoded))
		if err != nil {
			return page, errors.New("invalid cursor")
		}
		page.After = &id
	}
	return page, nil
}
func Cursor(id uuid.UUID) string { return base64.RawURLEncoding.EncodeToString([]byte(id.String())) }

// ExpectedVersion accepts a strong numeric ETag, e.g. If-Match: "7".
func ExpectedVersion(value string) (int, error) {
	if len(value) < 3 || !strings.HasPrefix(value, "\"") || !strings.HasSuffix(value, "\"") {
		return 0, errors.New("If-Match must contain a quoted positive version")
	}
	n, err := strconv.Atoi(value[1 : len(value)-1])
	if err != nil || n < 1 {
		return 0, errors.New("invalid expected version")
	}
	return n, nil
}
func RequireOne(result sql.Result) error {
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n != 1 {
		return ErrVersionConflict
	}
	return nil
}
