package followup

import (
	"context"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/followup"
)

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func (r *Repository) mapFollowUpToDTO(f *ent.FollowUp) contracts.FollowUpDTO {
	var assignedToUserID *string
	if f.AssignedToUserID != nil {
		id := f.AssignedToUserID.String()
		assignedToUserID = &id
	}

	var soulSub *contracts.FollowUpSoulSubDTO
	if f.Edges.Soul != nil {
		soulSub = &contracts.FollowUpSoulSubDTO{
			FullName: f.Edges.Soul.FullName,
			Phone:    f.Edges.Soul.Phone,
		}
	}

	var userSub *contracts.FollowUpUserSubDTO
	if f.Edges.AssignedToUser != nil {
		userSub = &contracts.FollowUpUserSubDTO{
			FirstName: f.Edges.AssignedToUser.FirstName,
			LastName:  f.Edges.AssignedToUser.LastName,
		}
	}

	return contracts.FollowUpDTO{
		ID:               f.ID.String(),
		SoulID:           f.SoulID.String(),
		AssignedToUserID: assignedToUserID,
		DueDate:          f.DueDate,
		Status:           contracts.FollowUpStatus(f.Status),
		CreatedAt:        f.CreatedAt,
		Soul:             soulSub,
		AssignedUser:     userSub,
	}
}

func (r *Repository) Create(ctx context.Context, input contracts.CreateFollowUpDTO) (contracts.FollowUpDTO, error) {
	soulUUID, err := uuid.Parse(input.SoulID)
	if err != nil {
		return contracts.FollowUpDTO{}, err
	}

	builder := r.db.FollowUp.Create().
		SetSoulID(soulUUID).
		SetDueDate(input.DueDate)

	if input.AssignedToUserID != nil && *input.AssignedToUserID != "" {
		userUUID, err := uuid.Parse(*input.AssignedToUserID)
		if err == nil {
			builder.SetAssignedToUserID(userUUID)
		}
	}

	if input.Status != "" {
		builder.SetStatus(followup.Status(input.Status))
	}

	f, err := builder.Save(ctx)
	if err != nil {
		return contracts.FollowUpDTO{}, err
	}

	return r.Get(ctx, f.ID.String())
}

func (r *Repository) Update(ctx context.Context, id string, input contracts.UpdateFollowUpDTO) (contracts.FollowUpDTO, error) {
	fUUID, err := uuid.Parse(id)
	if err != nil {
		return contracts.FollowUpDTO{}, err
	}

	builder := r.db.FollowUp.UpdateOneID(fUUID)

	if input.SoulID != nil && *input.SoulID != "" {
		soulUUID, err := uuid.Parse(*input.SoulID)
		if err == nil {
			builder.SetSoulID(soulUUID)
		}
	}

	if input.AssignedToUserID != nil {
		if *input.AssignedToUserID == "" {
			builder.ClearAssignedToUser()
		} else {
			userUUID, err := uuid.Parse(*input.AssignedToUserID)
			if err == nil {
				builder.SetAssignedToUserID(userUUID)
			}
		}
	}

	if input.DueDate != nil {
		builder.SetDueDate(*input.DueDate)
	}

	if input.Status != nil && *input.Status != "" {
		builder.SetStatus(followup.Status(*input.Status))
	}

	_, err = builder.Save(ctx)
	if err != nil {
		return contracts.FollowUpDTO{}, err
	}

	return r.Get(ctx, id)
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	fUUID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return r.db.FollowUp.DeleteOneID(fUUID).Exec(ctx)
}

func (r *Repository) Get(ctx context.Context, id string) (contracts.FollowUpDTO, error) {
	fUUID, err := uuid.Parse(id)
	if err != nil {
		return contracts.FollowUpDTO{}, err
	}

	f, err := r.db.FollowUp.Query().
		Where(followup.IDEQ(fUUID)).
		WithSoul().
		WithAssignedToUser().
		Only(ctx)
	if err != nil {
		return contracts.FollowUpDTO{}, err
	}

	return r.mapFollowUpToDTO(f), nil
}

func (r *Repository) List(ctx context.Context) ([]contracts.FollowUpDTO, error) {
	items, err := r.db.FollowUp.Query().
		WithSoul().
		WithAssignedToUser().
		Order(ent.Desc(followup.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.FollowUpDTO, 0, len(items))
	for _, it := range items {
		out = append(out, r.mapFollowUpToDTO(it))
	}
	return out, nil
}
