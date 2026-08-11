package transport

import (
	"context"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/transportrequest"
)

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func (r *Repository) mapToDTO(t *ent.TransportRequest) contracts.TransportRequestDTO {
	var assignedTeamID *string
	if t.AssignedTeamID != nil {
		id := t.AssignedTeamID.String()
		assignedTeamID = &id
	}

	var soulSub *contracts.TransportSoulSubDTO
	if t.Edges.Soul != nil {
		soulSub = &contracts.TransportSoulSubDTO{
			FullName: t.Edges.Soul.FullName,
			Phone:    t.Edges.Soul.Phone,
		}
	}

	var teamSub *contracts.TransportTeamSubDTO
	if t.Edges.AssignedTeam != nil {
		teamSub = &contracts.TransportTeamSubDTO{
			Name: t.Edges.AssignedTeam.Name,
		}
	}

	statusVal := "pending"
	if t.Status != nil {
		statusVal = *t.Status
	}

	return contracts.TransportRequestDTO{
		ID:             t.ID.String(),
		SoulID:         t.SoulID.String(),
		PickupAddress:  t.PickupAddress,
		AssignedTeamID: assignedTeamID,
		Status:         statusVal,
		CreatedAt:      t.CreatedAt,
		Soul:           soulSub,
		AssignedTeam:   teamSub,
	}
}

func (r *Repository) Create(ctx context.Context, input contracts.CreateTransportRequestDTO) (contracts.TransportRequestDTO, error) {
	soulUUID, err := uuid.Parse(input.SoulID)
	if err != nil {
		return contracts.TransportRequestDTO{}, err
	}

	builder := r.db.TransportRequest.Create().
		SetSoulID(soulUUID).
		SetNillablePickupAddress(input.PickupAddress)

	if input.AssignedTeamID != nil && *input.AssignedTeamID != "" {
		teamUUID, err := uuid.Parse(*input.AssignedTeamID)
		if err == nil {
			builder.SetAssignedTeamID(teamUUID)
		}
	}

	if input.Status != nil {
		builder.SetStatus(*input.Status)
	}

	tr, err := builder.Save(ctx)
	if err != nil {
		return contracts.TransportRequestDTO{}, err
	}

	return r.Get(ctx, tr.ID.String())
}

func (r *Repository) Update(ctx context.Context, id string, input contracts.UpdateTransportRequestDTO) (contracts.TransportRequestDTO, error) {
	trUUID, err := uuid.Parse(id)
	if err != nil {
		return contracts.TransportRequestDTO{}, err
	}

	builder := r.db.TransportRequest.UpdateOneID(trUUID).
		SetNillablePickupAddress(input.PickupAddress)

	if input.SoulID != nil && *input.SoulID != "" {
		soulUUID, err := uuid.Parse(*input.SoulID)
		if err == nil {
			builder.SetSoulID(soulUUID)
		}
	}

	if input.AssignedTeamID != nil {
		if *input.AssignedTeamID == "" {
			builder.ClearAssignedTeam()
		} else {
			teamUUID, err := uuid.Parse(*input.AssignedTeamID)
			if err == nil {
				builder.SetAssignedTeamID(teamUUID)
			}
		}
	}

	if input.Status != nil {
		builder.SetStatus(*input.Status)
	}

	_, err = builder.Save(ctx)
	if err != nil {
		return contracts.TransportRequestDTO{}, err
	}

	return r.Get(ctx, id)
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	trUUID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return r.db.TransportRequest.DeleteOneID(trUUID).Exec(ctx)
}

func (r *Repository) Get(ctx context.Context, id string) (contracts.TransportRequestDTO, error) {
	trUUID, err := uuid.Parse(id)
	if err != nil {
		return contracts.TransportRequestDTO{}, err
	}

	tr, err := r.db.TransportRequest.Query().
		Where(transportrequest.IDEQ(trUUID)).
		WithSoul().
		WithAssignedTeam().
		Only(ctx)
	if err != nil {
		return contracts.TransportRequestDTO{}, err
	}

	return r.mapToDTO(tr), nil
}

func (r *Repository) List(ctx context.Context) ([]contracts.TransportRequestDTO, error) {
	items, err := r.db.TransportRequest.Query().
		WithSoul().
		WithAssignedTeam().
		Order(ent.Desc(transportrequest.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.TransportRequestDTO, 0, len(items))
	for _, it := range items {
		out = append(out, r.mapToDTO(it))
	}
	return out, nil
}
