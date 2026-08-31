package admin

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/attendancerecord"
	"github.com/hofchurchng/church-backend/internal/ent/auditlog"
	"github.com/hofchurchng/church-backend/internal/ent/localchurch"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/membershipstagehistory"
	"github.com/hofchurchng/church-backend/internal/ent/otpinvites"
	"github.com/hofchurchng/church-backend/internal/ent/visitor"
)

type Repository struct {
	client *ent.Client
}

func NewRepository(client *ent.Client) *Repository {
	return &Repository{client: client}
}

// ---------------------------------------------------------------------------
// Local Churches (Branches)
// ---------------------------------------------------------------------------

func (r *Repository) ListChurches(ctx context.Context) ([]contracts.LocalChurchDTO, error) {
	churches, err := r.client.LocalChurch.Query().
		Order(ent.Asc(localchurch.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	res := make([]contracts.LocalChurchDTO, 0, len(churches))
	for _, c := range churches {
		memCount, _ := r.client.Member.Query().
			Where(member.LocalChurchIDEQ(c.ID)).
			Count(ctx)

		dto := contracts.LocalChurchDTO{
			ID:           c.ID.String(),
			Name:         c.Name,
			Center:       c.Center,
			Slug:         c.Slug,
			Description:  c.Description,
			Address:      c.Address,
			City:         c.City,
			State:        c.State,
			IsActive:     c.IsActive,
			TotalMembers: memCount,
			CreatedAt:    c.CreatedAt,
		}

		if c.ResidentPastorID != nil {
			pid := c.ResidentPastorID.String()
			dto.ResidentPastorID = &pid
			if u, err := r.client.User.Get(ctx, *c.ResidentPastorID); err == nil {
				name := fmt.Sprintf("%s %s", u.FirstName, u.LastName)
				dto.ResidentPastorName = &name
			}
		}

		if c.ChurchAdminID != nil {
			aid := c.ChurchAdminID.String()
			dto.ChurchAdminID = &aid
			if u, err := r.client.User.Get(ctx, *c.ChurchAdminID); err == nil {
				name := fmt.Sprintf("%s %s", u.FirstName, u.LastName)
				dto.ChurchAdminName = &name
			}
		}

		res = append(res, dto)
	}

	return res, nil
}

func (r *Repository) CreateChurch(ctx context.Context, input contracts.CreateLocalChurchDTO) (contracts.LocalChurchDTO, error) {
	builder := r.client.LocalChurch.Create().
		SetName(input.Name).
		SetCenter(input.Center).
		SetSlug(input.Slug).
		SetIsActive(true)

	if input.Description != nil {
		builder.SetDescription(*input.Description)
	}
	if input.Address != nil {
		builder.SetAddress(*input.Address)
	}
	if input.City != nil {
		builder.SetCity(*input.City)
	}
	if input.State != nil {
		builder.SetState(*input.State)
	}

	if input.ResidentPastorID != nil && *input.ResidentPastorID != "" {
		if pid, err := uuid.Parse(*input.ResidentPastorID); err == nil {
			builder.SetResidentPastorID(pid)
		}
	}
	if input.ChurchAdminID != nil && *input.ChurchAdminID != "" {
		if aid, err := uuid.Parse(*input.ChurchAdminID); err == nil {
			builder.SetChurchAdminID(aid)
		}
	}

	c, err := builder.Save(ctx)
	if err != nil {
		return contracts.LocalChurchDTO{}, err
	}

	return contracts.LocalChurchDTO{
		ID:          c.ID.String(),
		Name:        c.Name,
		Center:      c.Center,
		Slug:        c.Slug,
		Description: c.Description,
		Address:     c.Address,
		City:        c.City,
		State:       c.State,
		IsActive:    c.IsActive,
		CreatedAt:   c.CreatedAt,
	}, nil
}

func (r *Repository) UpdateChurch(ctx context.Context, id uuid.UUID, input contracts.UpdateLocalChurchDTO) (contracts.LocalChurchDTO, error) {
	builder := r.client.LocalChurch.UpdateOneID(id)

	if input.Name != nil {
		builder.SetName(*input.Name)
	}
	if input.Center != nil {
		builder.SetCenter(*input.Center)
	}
	if input.Slug != nil {
		builder.SetSlug(*input.Slug)
	}
	if input.Description != nil {
		builder.SetDescription(*input.Description)
	}
	if input.Address != nil {
		builder.SetAddress(*input.Address)
	}
	if input.City != nil {
		builder.SetCity(*input.City)
	}
	if input.State != nil {
		builder.SetState(*input.State)
	}
	if input.IsActive != nil {
		builder.SetIsActive(*input.IsActive)
	}

	c, err := builder.Save(ctx)
	if err != nil {
		return contracts.LocalChurchDTO{}, err
	}

	return contracts.LocalChurchDTO{
		ID:          c.ID.String(),
		Name:        c.Name,
		Center:      c.Center,
		Slug:        c.Slug,
		Description: c.Description,
		Address:     c.Address,
		City:        c.City,
		State:       c.State,
		IsActive:    c.IsActive,
		CreatedAt:   c.CreatedAt,
	}, nil
}

func (r *Repository) ReassignLeadership(ctx context.Context, id uuid.UUID, input contracts.ReassignLeadershipDTO) error {
	builder := r.client.LocalChurch.UpdateOneID(id)

	if input.ResidentPastorID != nil {
		if *input.ResidentPastorID == "" {
			builder.ClearResidentPastorID()
		} else if pid, err := uuid.Parse(*input.ResidentPastorID); err == nil {
			builder.SetResidentPastorID(pid)
		}
	}

	if input.ChurchAdminID != nil {
		if *input.ChurchAdminID == "" {
			builder.ClearChurchAdminID()
		} else if aid, err := uuid.Parse(*input.ChurchAdminID); err == nil {
			builder.SetChurchAdminID(aid)
		}
	}

	return builder.Exec(ctx)
}

func (r *Repository) ToggleChurchStatus(ctx context.Context, id uuid.UUID) (bool, error) {
	c, err := r.client.LocalChurch.Get(ctx, id)
	if err != nil {
		return false, err
	}

	newStatus := !c.IsActive
	err = r.client.LocalChurch.UpdateOneID(id).
		SetIsActive(newStatus).
		Exec(ctx)
	return newStatus, err
}

// ---------------------------------------------------------------------------
// Leadership Invitations
// ---------------------------------------------------------------------------

func (r *Repository) ListLeadershipInvites(ctx context.Context) ([]contracts.LeadershipInviteDTO, error) {
	invites, err := r.client.OtpInvites.Query().
		Order(ent.Desc(otpinvites.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	res := make([]contracts.LeadershipInviteDTO, 0, len(invites))
	for _, inv := range invites {
		dto := contracts.LeadershipInviteDTO{
			ID:        inv.ID.String(),
			Email:     inv.Email,
			FirstName: inv.FirstName,
			LastName:  inv.LastName,
			Role:      string(inv.Role),
			OtpCode:   inv.OtpCode,
			Used:      inv.Used,
			ExpiresAt: inv.ExpiresAt,
			CreatedAt: inv.CreatedAt,
		}
		if inv.ChurchID != nil {
			cid := inv.ChurchID.String()
			dto.ChurchID = &cid
			if c, err := r.client.LocalChurch.Get(ctx, *inv.ChurchID); err == nil {
				dto.ChurchName = &c.Name
			}
		}
		if inv.SectorID != nil {
			sid := inv.SectorID.String()
			dto.SectorID = &sid
		}
		res = append(res, dto)
	}

	return res, nil
}

func (r *Repository) CreateLeadershipInvite(ctx context.Context, input contracts.CreateLeadershipInviteDTO, otpCode string, creatorID uuid.UUID) (contracts.LeadershipInviteDTO, error) {
	builder := r.client.OtpInvites.Create().
		SetEmail(input.Email).
		SetFirstName(input.FirstName).
		SetLastName(input.LastName).
		SetRole(otpinvites.Role(input.Role)).
		SetOtpCode(otpCode).
		SetExpiresAt(time.Now().Add(72 * time.Hour)).
		SetCreatedByUserID(creatorID)

	if input.ChurchID != nil && *input.ChurchID != "" {
		if cid, err := uuid.Parse(*input.ChurchID); err == nil {
			builder.SetChurchID(cid)
		}
	}
	if input.SectorID != nil && *input.SectorID != "" {
		if sid, err := uuid.Parse(*input.SectorID); err == nil {
			builder.SetSectorID(sid)
		}
	}

	inv, err := builder.Save(ctx)
	if err != nil {
		return contracts.LeadershipInviteDTO{}, err
	}

	return contracts.LeadershipInviteDTO{
		ID:        inv.ID.String(),
		Email:     inv.Email,
		FirstName: inv.FirstName,
		LastName:  inv.LastName,
		Role:      string(inv.Role),
		OtpCode:   inv.OtpCode,
		Used:      inv.Used,
		ExpiresAt: inv.ExpiresAt,
		CreatedAt: inv.CreatedAt,
	}, nil
}

func (r *Repository) RevokeInvite(ctx context.Context, id uuid.UUID) error {
	return r.client.OtpInvites.DeleteOneID(id).Exec(ctx)
}

// ---------------------------------------------------------------------------
// General Overseer Universal Member Intelligence Dossier
// ---------------------------------------------------------------------------

func (r *Repository) SearchUniversalMembers(ctx context.Context, q string) ([]contracts.UniversalMemberSearchResultDTO, error) {
	members, err := r.client.Member.Query().
		Where(
			member.Or(
				member.FirstNameContainsFold(q),
				member.SurnameContainsFold(q),
				member.PhoneNumberContainsFold(q),
				member.EmailContainsFold(q),
			),
		).
		Limit(30).
		All(ctx)
	if err != nil {
		return nil, err
	}

	res := make([]contracts.UniversalMemberSearchResultDTO, 0, len(members))
	for _, m := range members {
		churchName := "Global / Unassigned"
		cidStr := ""
		if m.LocalChurchID != nil {
			cidStr = m.LocalChurchID.String()
			if c, err := r.client.LocalChurch.Get(ctx, *m.LocalChurchID); err == nil {
				churchName = c.Name
			}
		}

		res = append(res, contracts.UniversalMemberSearchResultDTO{
			ID:           m.ID.String(),
			FirstName:    m.FirstName,
			Surname:      m.Surname,
			Email:        m.Email,
			PhoneNumber:  m.PhoneNumber,
			ChurchID:     cidStr,
			ChurchName:   churchName,
			CurrentStage: string(m.CurrentStage),
			Role:         "member",
		})
	}

	return res, nil
}

func (r *Repository) GetMember360Dossier(ctx context.Context, memberID uuid.UUID) (contracts.Member360DossierDTO, error) {
	m, err := r.client.Member.Get(ctx, memberID)
	if err != nil {
		return contracts.Member360DossierDTO{}, err
	}

	churchName := "Global / Unassigned"
	if m.LocalChurchID != nil {
		if c, err := r.client.LocalChurch.Get(ctx, *m.LocalChurchID); err == nil {
			churchName = c.Name
		}
	}

	// Fetch stage histories
	stageHistories, _ := r.client.MembershipStageHistory.Query().
		Where(membershipstagehistory.MemberIDEQ(memberID)).
		Order(ent.Asc(membershipstagehistory.FieldEnteredAt)).
		All(ctx)

	stages := make([]contracts.StageHistoryDTO, 0, len(stageHistories))
	for _, sh := range stageHistories {
		stages = append(stages, contracts.StageHistoryDTO{
			Stage:     string(sh.Stage),
			ChangedAt: sh.EnteredAt,
		})
	}

	// Count total visits / attendance records
	attendanceCount, _ := r.client.AttendanceRecord.Query().
		Where(attendancerecord.VisitorIDEQ(memberID)).
		Count(ctx)

	var genderStr *string
	if m.Gender != nil {
		g := string(*m.Gender)
		genderStr = &g
	}

	var maritalStr *string
	if m.MaritalStatus != nil {
		ms := string(*m.MaritalStatus)
		maritalStr = &ms
	}

	contractMember := contracts.Member{
		ID:                      m.ID.String(),
		FirstName:               m.FirstName,
		Surname:                 m.Surname,
		Email:                   m.Email,
		PhoneNumber:             m.PhoneNumber,
		HomeAddress:             m.HomeAddress,
		Gender:                  genderStr,
		DateOfBirthDay:          m.DateOfBirthDay,
		DateOfBirthMonth:        m.DateOfBirthMonth,
		MaritalStatus:           maritalStr,
		WeddingAnniversaryDay:   m.WeddingAnniversaryDay,
		WeddingAnniversaryMonth: m.WeddingAnniversaryMonth,
		JobOccupation:           m.JobOccupation,
		CurrentStage:            string(m.CurrentStage),
		IsProfiled:              m.IsProfiled,
	}

	return contracts.Member360DossierDTO{
		Member:      contractMember,
		ChurchName:  churchName,
		Stages:      stages,
		TotalVisits: attendanceCount,
		Teams:       []string{},
		SitReps:     []contracts.SitRepItemDTO{},
	}, nil
}

// ---------------------------------------------------------------------------
// Executive Analytics
// ---------------------------------------------------------------------------

func (r *Repository) GetExecutiveSummary(ctx context.Context, churchID *uuid.UUID) (contracts.ExecutiveSummaryDTO, error) {
	memQuery := r.client.Member.Query()
	visQuery := r.client.Visitor.Query()
	soulQuery := r.client.Soul.Query()

	if churchID != nil {
		memQuery = memQuery.Where(member.LocalChurchIDEQ(*churchID))
		visQuery = visQuery.Where(visitor.ChurchIDEQ(*churchID))
	}

	totalMembers, _ := memQuery.Count(ctx)
	totalVisitors, _ := visQuery.Count(ctx)
	firstTimers, _ := r.client.Visitor.Query().Where(visitor.StatusEQ(visitor.StatusFirstTimer)).Count(ctx)
	foundationCandidates, _ := r.client.Visitor.Query().Where(visitor.StatusEQ(visitor.StatusFoundationClassCandidate)).Count(ctx)
	stewards, _ := r.client.Member.Query().Where(member.CurrentStageEQ(member.CurrentStageStewardship)).Count(ctx)
	soulsWon, _ := soulQuery.Count(ctx)

	// Fetch per-branch performance
	churches, _ := r.client.LocalChurch.Query().Where(localchurch.IsActive(true)).All(ctx)
	branchPerf := make([]contracts.BranchPerformanceDTO, 0, len(churches))

	for _, c := range churches {
		bMem, _ := r.client.Member.Query().Where(member.LocalChurchIDEQ(c.ID)).Count(ctx)
		bVis, _ := r.client.Visitor.Query().Where(visitor.ChurchIDEQ(c.ID)).Count(ctx)
		bFT, _ := r.client.Visitor.Query().Where(visitor.ChurchIDEQ(c.ID), visitor.StatusEQ(visitor.StatusFirstTimer)).Count(ctx)

		branchPerf = append(branchPerf, contracts.BranchPerformanceDTO{
			ChurchID:        c.ID.String(),
			ChurchName:      c.Name,
			MemberCount:     bMem,
			VisitorCount:    bVis,
			FirstTimerCount: bFT,
			SoulsWonCount:   0,
		})
	}

	return contracts.ExecutiveSummaryDTO{
		TotalActiveMembers:   totalMembers,
		TotalVisitors:        totalVisitors,
		TotalFirstTimers:     firstTimers,
		TotalFoundationClass: foundationCandidates,
		TotalStewards:        stewards,
		TotalSoulsWon:        soulsWon,
		BranchPerformance:    branchPerf,
	}, nil
}

// ---------------------------------------------------------------------------
// Security Center & Audit Logs
// ---------------------------------------------------------------------------

func (r *Repository) CreateAuditLog(ctx context.Context, log contracts.AuditLogDTO) error {
	builder := r.client.AuditLog.Create().
		SetAction(log.Action).
		SetResourceType(log.ResourceType).
		SetResourceID(log.ResourceID).
		SetDetails(log.Details).
		SetIPAddress(log.IPAddress).
		SetUserAgent(log.UserAgent).
		SetActorName(log.ActorName).
		SetActorEmail(log.ActorEmail).
		SetActorRole(log.ActorRole)

	if log.ActorUserID != nil && *log.ActorUserID != "" {
		if uid, err := uuid.Parse(*log.ActorUserID); err == nil {
			builder.SetActorUserID(uid)
		}
	}
	if log.ChurchID != nil && *log.ChurchID != "" {
		if cid, err := uuid.Parse(*log.ChurchID); err == nil {
			builder.SetChurchID(cid)
		}
	}

	_, err := builder.Save(ctx)
	return err
}

func (r *Repository) ListAuditLogs(ctx context.Context, limit int) ([]contracts.AuditLogDTO, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	logs, err := r.client.AuditLog.Query().
		Order(ent.Desc(auditlog.FieldCreatedAt)).
		Limit(limit).
		All(ctx)
	if err != nil {
		return nil, err
	}

	res := make([]contracts.AuditLogDTO, 0, len(logs))
	for _, l := range logs {
		dto := contracts.AuditLogDTO{
			ID:           l.ID.String(),
			ActorName:    l.ActorName,
			ActorEmail:   l.ActorEmail,
			ActorRole:    l.ActorRole,
			Action:       l.Action,
			ResourceType: l.ResourceType,
			ResourceID:   l.ResourceID,
			Details:      l.Details,
			IPAddress:    l.IPAddress,
			UserAgent:    l.UserAgent,
			CreatedAt:    l.CreatedAt,
		}
		if l.ActorUserID != nil {
			uid := l.ActorUserID.String()
			dto.ActorUserID = &uid
		}
		if l.ChurchID != nil {
			cid := l.ChurchID.String()
			dto.ChurchID = &cid
		}
		res = append(res, dto)
	}

	return res, nil
}
