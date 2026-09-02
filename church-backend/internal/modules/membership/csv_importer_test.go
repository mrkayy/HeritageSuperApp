package membership

import (
	"testing"
)

func TestLevenshteinDistance(t *testing.T) {
	tests := []struct {
		s1       string
		s2       string
		expected int
	}{
		{"John Doe", "John Doe", 0},
		{"John Doe", "Jon Doe", 1},
		{"Oladipo", "Oladipupo", 2},
		{"08012345678", "08012345678", 0},
		{"08012345678", "08012345679", 1},
		{"", "Test", 4},
		{"Test", "", 4},
	}

	for _, tt := range tests {
		dist := LevenshteinDistance(tt.s1, tt.s2)
		if dist != tt.expected {
			t.Errorf("LevenshteinDistance(%q, %q) = %d; want %d", tt.s1, tt.s2, dist, tt.expected)
		}
	}
}

func TestNormalizePhoneNumber(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"08012345678", "08012345678"},
		{"8012345678", "08012345678"},
		{"+234 801 234 5678", "08012345678"},
		{"2348012345678", "08012345678"},
	}

	for _, tt := range tests {
		res := normalizePhoneNumber(tt.input)
		if res != tt.expected {
			t.Errorf("normalizePhoneNumber(%q) = %q; want %q", tt.input, res, tt.expected)
		}
	}
}
