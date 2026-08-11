package contracts

import (
	"context"
	"time"
)

type TransportRequestDTO struct {
	ID             string    `json:"request_id"`
	SoulID         string    `json:"soul_id"`
	PickupAddress  *string   `json:"pickup_address,omitempty"`
	AssignedTeamID *string   `json:"assigned_team_id,omitempty"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`

	Soul         *TransportSoulSubDTO `json:"soul,omitempty"`
	AssignedTeam *TransportTeamSubDTO `json:"assigned_team,omitempty"`
}

type TransportSoulSubDTO struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

type TransportTeamSubDTO struct {
	Name string `json:"name"`
}

type CreateTransportRequestDTO struct {
	SoulID         string  `json:"soul_id"`
	PickupAddress  *string `json:"pickup_address,omitempty"`
	AssignedTeamID *string `json:"assigned_team_id,omitempty"`
	Status         *string `json:"status,omitempty"`
}

type UpdateTransportRequestDTO struct {
	SoulID         *string `json:"soul_id,omitempty"`
	PickupAddress  *string `json:"pickup_address,omitempty"`
	AssignedTeamID *string `json:"assigned_team_id,omitempty"`
	Status         *string `json:"status,omitempty"`
}

type TransportReader interface {
	GetTransportRequest(ctx context.Context, id string) (TransportRequestDTO, error)
	ListTransportRequests(ctx context.Context) ([]TransportRequestDTO, error)
}
