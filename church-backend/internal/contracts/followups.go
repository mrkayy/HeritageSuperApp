package contracts

import (
	"context"
	"time"
)

type FollowUpStatus string

const (
	FollowUpStatusPending    FollowUpStatus = "pending"
	FollowUpStatusInProgress FollowUpStatus = "in_progress"
	FollowUpStatusCompleted  FollowUpStatus = "completed"
	FollowUpStatusCancelled  FollowUpStatus = "cancelled"
)

type FollowUpDTO struct {
	ID               string         `json:"follow_up_id"`
	SoulID           string         `json:"soul_id"`
	AssignedToUserID *string        `json:"assigned_to_user_id,omitempty"`
	DueDate          time.Time      `json:"due_date"`
	Status           FollowUpStatus `json:"status"`
	CreatedAt        time.Time      `json:"created_at"`

	// Preloaded edge data
	Soul         *FollowUpSoulSubDTO `json:"soul,omitempty"`
	AssignedUser *FollowUpUserSubDTO `json:"assigned_user,omitempty"`
}

type FollowUpSoulSubDTO struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

type FollowUpUserSubDTO struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type CreateFollowUpDTO struct {
	SoulID           string         `json:"soul_id"`
	AssignedToUserID *string        `json:"assigned_to_user_id,omitempty"`
	DueDate          time.Time      `json:"due_date"`
	Status           FollowUpStatus `json:"status"`
}

type UpdateFollowUpDTO struct {
	SoulID           *string         `json:"soul_id,omitempty"`
	AssignedToUserID *string         `json:"assigned_to_user_id,omitempty"`
	DueDate          *time.Time      `json:"due_date,omitempty"`
	Status           *FollowUpStatus `json:"status,omitempty"`
}

type FollowUpReader interface {
	GetFollowUp(ctx context.Context, id string) (FollowUpDTO, error)
	ListFollowUps(ctx context.Context) ([]FollowUpDTO, error)
}
