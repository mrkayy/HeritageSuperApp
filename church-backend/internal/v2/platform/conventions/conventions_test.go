package conventions

import (
	"github.com/google/uuid"
	"net/url"
	"testing"
)

func TestPageAndVersionValidation(t *testing.T) {
	id := uuid.New()
	page, err := ParsePage(url.Values{"cursor": {Cursor(id)}, "limit": {"100"}})
	if err != nil || page.After == nil || *page.After != id || page.Limit != 100 {
		t.Fatalf("page: %+v %v", page, err)
	}
	for _, values := range []url.Values{{"limit": {"101"}}, {"cursor": {"invalid"}}, {"limit": {"-1"}}} {
		if _, err := ParsePage(values); err == nil {
			t.Fatal("invalid page accepted")
		}
	}
	for _, value := range []string{"", "*", "W/\"2\"", "\"0\""} {
		if _, err := ExpectedVersion(value); err == nil {
			t.Fatal("invalid version accepted")
		}
	}
	if n, err := ExpectedVersion("\"7\""); err != nil || n != 7 {
		t.Fatal(n, err)
	}
}
