package contracts

import (
	"context"
	"time"
)

type ResponseStatus string

const (
	ResponseStatusNotSaved ResponseStatus = "not_saved"
	ResponseStatusSaved    ResponseStatus = "saved"
	ResponseStatusPending  ResponseStatus = "pending"
)

type SoulDTO struct {
	ID             string         `json:"soul_id"`
	FullName       string         `json:"full_name"`
	Phone          string         `json:"phone"`
	Gender         *string        `json:"gender,omitempty"`
	AgeRange       *string        `json:"age_range,omitempty"`
	Address        *string        `json:"address,omitempty"`
	OutreachDate   *time.Time     `json:"outreach_date,omitempty"`
	Latitude       *float64       `json:"latitude,omitempty"`
	Longitude      *float64       `json:"longitude,omitempty"`
	IsActive       *bool          `json:"is_active,omitempty"`
	ResponseStatus ResponseStatus `json:"response_status"`
	Note           *string        `json:"note,omitempty"`
	SectorID       *string        `json:"sector_id,omitempty"`
	AddedByUserID  *string        `json:"added_by_user_id,omitempty"`
	TeamID         *string        `json:"team_id,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
}

type SoulJournalDTO struct {
	ID        string    `json:"journal_id"`
	SoulID    string    `json:"soul_id"`
	UserID    *string   `json:"user_id,omitempty"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateSoulDTO struct {
	FullName       string         `json:"full_name"`
	Phone          string         `json:"phone"`
	Gender         *string        `json:"gender,omitempty"`
	AgeRange       *string        `json:"age_range,omitempty"`
	Address        *string        `json:"address,omitempty"`
	OutreachDate   *time.Time     `json:"outreach_date,omitempty"`
	Latitude       *float64       `json:"latitude,omitempty"`
	Longitude      *float64       `json:"longitude,omitempty"`
	IsActive       *bool          `json:"is_active,omitempty"`
	ResponseStatus ResponseStatus `json:"response_status,omitempty"`
	Note           *string        `json:"note,omitempty"`
	SectorID       *string        `json:"sector_id,omitempty"`
	TeamID         *string        `json:"team_id,omitempty"`
}

type UpdateSoulDTO struct {
	FullName       *string         `json:"full_name,omitempty"`
	Phone          *string         `json:"phone,omitempty"`
	Gender         *string         `json:"gender,omitempty"`
	AgeRange       *string         `json:"age_range,omitempty"`
	Address        *string         `json:"address,omitempty"`
	OutreachDate   *time.Time      `json:"outreach_date,omitempty"`
	Latitude       *float64        `json:"latitude,omitempty"`
	Longitude      *float64        `json:"longitude,omitempty"`
	IsActive       *bool           `json:"is_active,omitempty"`
	ResponseStatus *ResponseStatus `json:"response_status,omitempty"`
	Note           *string         `json:"note,omitempty"`
	SectorID       *string         `json:"sector_id,omitempty"`
	TeamID         *string         `json:"team_id,omitempty"`
}

type SoulFilter struct {
	UserID         *string
	ResponseStatus *ResponseStatus
	SectorID       *string
	TeamID         *string
}

type SoulReader interface {
	GetSoul(ctx context.Context, id string) (SoulDTO, error)
	ListSouls(ctx context.Context, filter SoulFilter) ([]SoulDTO, error)
}
