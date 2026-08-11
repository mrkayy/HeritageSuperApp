package souls

import (
	"context"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/soul"
	"github.com/hofchurchng/church-backend/internal/ent/souljournal"
)

type Repository struct {
	db *ent.Client
}

func NewRepository(db *ent.Client) *Repository {
	return &Repository{db: db}
}

func (r *Repository) mapSoulToDTO(s *ent.Soul) contracts.SoulDTO {
	var sectorID *string
	if s.SectorID != nil {
		id := s.SectorID.String()
		sectorID = &id
	}

	var addedByUserID *string
	if s.AddedByUserID != nil {
		id := s.AddedByUserID.String()
		addedByUserID = &id
	}

	var teamID *string
	if s.TeamID != nil {
		id := s.TeamID.String()
		teamID = &id
	}

	respStatus := contracts.ResponseStatusNotSaved
	if s.ResponseStatus != nil {
		respStatus = contracts.ResponseStatus(string(*s.ResponseStatus))
	}

	return contracts.SoulDTO{
		ID:             s.ID.String(),
		FullName:       s.FullName,
		Phone:          s.Phone,
		Gender:         s.Gender,
		AgeRange:       s.AgeRange,
		Address:        s.Address,
		OutreachDate:   s.OutreachDate,
		Latitude:       s.Latitude,
		Longitude:      s.Longitude,
		IsActive:       s.IsActive,
		ResponseStatus: respStatus,
		Note:           s.Note,
		SectorID:       sectorID,
		AddedByUserID:  addedByUserID,
		TeamID:         teamID,
		CreatedAt:      s.CreatedAt,
	}
}

func (r *Repository) mapJournalToDTO(j *ent.SoulJournal) contracts.SoulJournalDTO {
	var userID *string
	if j.UserID != nil {
		id := j.UserID.String()
		userID = &id
	}

	return contracts.SoulJournalDTO{
		ID:        j.ID.String(),
		SoulID:    j.SoulID.String(),
		UserID:    userID,
		Note:      j.Note,
		CreatedAt: j.CreatedAt,
	}
}

func (r *Repository) CreateSoul(ctx context.Context, input contracts.CreateSoulDTO, addedByUserID string) (contracts.SoulDTO, error) {
	builder := r.db.Soul.Create().
		SetFullName(input.FullName).
		SetPhone(input.Phone).
		SetNillableGender(input.Gender).
		SetNillableAgeRange(input.AgeRange).
		SetNillableAddress(input.Address).
		SetNillableOutreachDate(input.OutreachDate).
		SetNillableLatitude(input.Latitude).
		SetNillableLongitude(input.Longitude).
		SetNillableIsActive(input.IsActive).
		SetNillableNote(input.Note)

	if input.ResponseStatus != "" {
		builder.SetResponseStatus(soul.ResponseStatus(string(input.ResponseStatus)))
	}

	if addedByUserID != "" {
		uid, err := uuid.Parse(addedByUserID)
		if err == nil {
			builder.SetAddedByUserID(uid)
		}
	}

	if input.SectorID != nil && *input.SectorID != "" {
		sid, err := uuid.Parse(*input.SectorID)
		if err == nil {
			builder.SetSectorID(sid)
		}
	}

	if input.TeamID != nil && *input.TeamID != "" {
		tid, err := uuid.Parse(*input.TeamID)
		if err == nil {
			builder.SetTeamID(tid)
		}
	}

	s, err := builder.Save(ctx)
	if err != nil {
		return contracts.SoulDTO{}, err
	}

	return r.mapSoulToDTO(s), nil
}

func (r *Repository) GetSoulByID(ctx context.Context, id string) (contracts.SoulDTO, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.SoulDTO{}, err
	}

	s, err := r.db.Soul.Get(ctx, uid)
	if err != nil {
		return contracts.SoulDTO{}, err
	}

	return r.mapSoulToDTO(s), nil
}

func (r *Repository) ListSouls(ctx context.Context, filter contracts.SoulFilter) ([]contracts.SoulDTO, error) {
	query := r.db.Soul.Query()

	if filter.UserID != nil && *filter.UserID != "" {
		uid, err := uuid.Parse(*filter.UserID)
		if err == nil {
			query.Where(soul.AddedByUserIDEQ(uid))
		}
	}

	if filter.ResponseStatus != nil && *filter.ResponseStatus != "" {
		query.Where(soul.ResponseStatusEQ(soul.ResponseStatus(string(*filter.ResponseStatus))))
	}

	if filter.SectorID != nil && *filter.SectorID != "" {
		sid, err := uuid.Parse(*filter.SectorID)
		if err == nil {
			query.Where(soul.SectorIDEQ(sid))
		}
	}

	if filter.TeamID != nil && *filter.TeamID != "" {
		tid, err := uuid.Parse(*filter.TeamID)
		if err == nil {
			query.Where(soul.TeamIDEQ(tid))
		}
	}

	souls, err := query.Order(ent.Desc(soul.FieldCreatedAt)).All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.SoulDTO, 0, len(souls))
	for _, s := range souls {
		out = append(out, r.mapSoulToDTO(s))
	}
	return out, nil
}

func (r *Repository) UpdateSoul(ctx context.Context, id string, input contracts.UpdateSoulDTO) (contracts.SoulDTO, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return contracts.SoulDTO{}, err
	}

	updater := r.db.Soul.UpdateOneID(uid)

	if input.FullName != nil {
		updater.SetFullName(*input.FullName)
	}
	if input.Phone != nil {
		updater.SetPhone(*input.Phone)
	}
	if input.Gender != nil {
		updater.SetGender(*input.Gender)
	}
	if input.AgeRange != nil {
		updater.SetAgeRange(*input.AgeRange)
	}
	if input.Address != nil {
		updater.SetAddress(*input.Address)
	}
	if input.OutreachDate != nil {
		updater.SetOutreachDate(*input.OutreachDate)
	}
	if input.Latitude != nil {
		updater.SetLatitude(*input.Latitude)
	}
	if input.Longitude != nil {
		updater.SetLongitude(*input.Longitude)
	}
	if input.IsActive != nil {
		updater.SetIsActive(*input.IsActive)
	}
	if input.ResponseStatus != nil {
		updater.SetResponseStatus(soul.ResponseStatus(string(*input.ResponseStatus)))
	}
	if input.Note != nil {
		updater.SetNote(*input.Note)
	}

	if input.SectorID != nil {
		if *input.SectorID != "" {
			sid, err := uuid.Parse(*input.SectorID)
			if err == nil {
				updater.SetSectorID(sid)
			}
		} else {
			updater.ClearSector()
		}
	}

	if input.TeamID != nil {
		if *input.TeamID != "" {
			tid, err := uuid.Parse(*input.TeamID)
			if err == nil {
				updater.SetTeamID(tid)
			}
		} else {
			updater.ClearTeam()
		}
	}

	s, err := updater.Save(ctx)
	if err != nil {
		return contracts.SoulDTO{}, err
	}

	return r.mapSoulToDTO(s), nil
}

func (r *Repository) DeleteSoul(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return r.db.Soul.DeleteOneID(uid).Exec(ctx)
}

func (r *Repository) AddSoulJournal(ctx context.Context, soulID string, userID *string, note string) (contracts.SoulJournalDTO, error) {
	sid, err := uuid.Parse(soulID)
	if err != nil {
		return contracts.SoulJournalDTO{}, err
	}

	builder := r.db.SoulJournal.Create().
		SetSoulID(sid).
		SetNote(note)

	if userID != nil && *userID != "" {
		uid, err := uuid.Parse(*userID)
		if err == nil {
			builder.SetUserID(uid)
		}
	}

	j, err := builder.Save(ctx)
	if err != nil {
		return contracts.SoulJournalDTO{}, err
	}

	return r.mapJournalToDTO(j), nil
}

func (r *Repository) GetSoulJournals(ctx context.Context, soulID string) ([]contracts.SoulJournalDTO, error) {
	sid, err := uuid.Parse(soulID)
	if err != nil {
		return nil, err
	}

	journals, err := r.db.SoulJournal.Query().
		Where(souljournal.SoulIDEQ(sid)).
		Order(ent.Desc(souljournal.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]contracts.SoulJournalDTO, 0, len(journals))
	for _, j := range journals {
		out = append(out, r.mapJournalToDTO(j))
	}
	return out, nil
}
