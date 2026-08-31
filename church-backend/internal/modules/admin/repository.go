package admin

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/attendancerecord"
	"github.com/hofchurchng/church-backend/internal/ent/auditlog"
	"github.com/hofchurchng/church-backend/internal/ent/churchsetting"
	"github.com/hofchurchng/church-backend/internal/ent/featureflag"
	"github.com/hofchurchng/church-backend/internal/ent/localchurch"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/membershipstagehistory"
	"github.com/hofchurchng/church-backend/internal/ent/otpinvites"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
	"github.com/hofchurchng/church-backend/internal/ent/visitor"
)

var (
	settingsMu     sync.RWMutex
	globalSettings = contracts.SystemSettingsDTO{
		MinistryName:                 "Heritage of Faith International Church",
		SupportEmail:                 "support@hofchurchng.org",
		SupportPhone:                 "+234 800 463 2487",
		WebsiteURL:                   "https://hofchurchng.org",
		Timezone:                     "Africa/Lagos",
		DateFormat:                   "DD/MM/YYYY",
		DefaultLanguage:              "en",
		SessionTimeoutMinutes:        60,
		MaxPinAttempts:               5,
		PinLockoutMinutes:            15,
		MagicLinkExpiryHours:         72,
		EnforcePinLogin:              true,
		MaintenanceMode:              false,
		MaintenanceMessage:           "System undergoing scheduled platform maintenance. Please check back shortly.",
		FoundationClassMinAttendance: 2,
		FollowupSlaDays:              3,
		AutoArchiveInactiveMonths:    6,
		EmailSenderName:              "HOF Admin",
		EmailSenderAddress:           "no-reply@hofchurchng.org",
		SmsEnabled:                   true,
		SmsSenderID:                  "HOFCHURCH",
		UpdatedAt:                    time.Now(),
	}

	permsMu         sync.RWMutex
	rolePermissions = defaultRolePermissions()
)

func defaultRolePermissions() map[string]map[string]map[string]bool {
	modulePerms := map[string][]string{
		"souls":       {"can_create", "can_update", "can_view", "can_delete", "can_view_only_self", "can_export"},
		"follow_ups":  {"can_create", "can_update", "can_view", "can_delete", "can_assign", "can_view_only_assigned"},
		"transport":   {"can_create", "can_update", "can_view", "can_delete", "can_approve", "can_view_only_team"},
		"admin":       {"can_create", "can_update", "can_view", "can_delete", "can_invite_users", "can_manage_roles"},
		"reports":     {"can_view", "can_export", "can_view_church_stats", "can_view_global_stats"},
		"events":      {"can_create", "can_update", "can_view", "can_delete", "can_publish"},
		"data":        {"can_backup", "can_restore", "can_bulk_import", "can_bulk_export"},
	}

	roles := []string{
		"super_admin", "general_overseer", "church_admin", "resident_pastor", "team_lead", "steward", "member", "guest",
	}

	matrix := make(map[string]map[string]map[string]bool)
	for _, r := range roles {
		matrix[r] = make(map[string]map[string]bool)
		for mod, perms := range modulePerms {
			matrix[r][mod] = make(map[string]bool)
			for _, p := range perms {
				switch r {
				case "super_admin":
					matrix[r][mod][p] = true
				case "general_overseer":
					matrix[r][mod][p] = p == "can_view" || p == "can_export" || p == "can_view_church_stats" || p == "can_view_global_stats"
				case "resident_pastor":
					matrix[r][mod][p] = p != "can_delete" && p != "can_backup" && p != "can_restore"
				case "church_admin":
					matrix[r][mod][p] = p != "can_delete" && p != "can_backup" && p != "can_restore" && p != "can_view_global_stats"
				case "team_lead":
					matrix[r][mod][p] = p == "can_view" || p == "can_create" || p == "can_update" || p == "can_view_only_team" || p == "can_assign" || p == "can_approve"
				case "steward":
					matrix[r][mod][p] = p == "can_view" || p == "can_create" || p == "can_update" || p == "can_view_only_self"
				case "member":
					matrix[r][mod][p] = p == "can_view" || p == "can_view_only_self"
				case "guest":
					matrix[r][mod][p] = p == "can_view"
				default:
					matrix[r][mod][p] = false
				}
			}
		}
	}
	return matrix
}


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

	var churchUUID *uuid.UUID
	var sectorUUID *uuid.UUID

	if input.ChurchID != nil && *input.ChurchID != "" {
		if cid, err := uuid.Parse(*input.ChurchID); err == nil {
			builder.SetChurchID(cid)
			churchUUID = &cid
		}
	}
	if input.SectorID != nil && *input.SectorID != "" {
		if sid, err := uuid.Parse(*input.SectorID); err == nil {
			builder.SetSectorID(sid)
			sectorUUID = &sid
		}
	}

	inv, err := builder.Save(ctx)
	if err != nil {
		return contracts.LeadershipInviteDTO{}, err
	}

	r.syncLeadershipInviteToMemberAndUser(ctx, input.Email, input.FirstName, input.LastName, input.Role, churchUUID, sectorUUID)

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

func (r *Repository) syncLeadershipInviteToMemberAndUser(ctx context.Context, email, firstName, lastName, roleStr string, churchID, sectorID *uuid.UUID) {
	if email == "" {
		return
	}
	if roleStr == "" {
		roleStr = "member"
	}

	// 1. Sync Member record in members table
	m, err := r.client.Member.Query().
		Where(member.EmailEqualFold(email)).
		Only(ctx)

	if err == nil {
		up := r.client.Member.UpdateOneID(m.ID).
			SetFirstName(firstName).
			SetSurname(lastName)

		if churchID != nil {
			up.SetLocalChurchID(*churchID)
		}
		if sectorID != nil {
			up.SetSectorID(*sectorID)
		}
		m, _ = up.Save(ctx)
	} else {
		cp := r.client.Member.Create().
			SetEmail(email).
			SetFirstName(firstName).
			SetSurname(lastName).
			SetCurrentStage(member.CurrentStageStewardship)

		if churchID != nil {
			cp.SetLocalChurchID(*churchID)
		}
		if sectorID != nil {
			cp.SetSectorID(*sectorID)
		}
		m, _ = cp.Save(ctx)
	}

	// 2. Sync User record in users table
	eu, err := r.client.User.Query().
		Where(entuser.EmailEqualFold(email)).
		Only(ctx)

	if err == nil {
		up := r.client.User.UpdateOneID(eu.ID).
			SetFirstName(firstName).
			SetLastName(lastName).
			SetRole(entuser.Role(roleStr)).
			SetRoles([]string{roleStr})

		if churchID != nil {
			up.SetChurchID(*churchID)
		}
		if sectorID != nil {
			up.SetSectorID(*sectorID)
		}
		_, _ = up.Save(ctx)
	} else {
		cp := r.client.User.Create().
			SetEmail(email).
			SetPasswordHash("pending-magic-link-activation").
			SetFirstName(firstName).
			SetLastName(lastName).
			SetRole(entuser.Role(roleStr)).
			SetRoles([]string{roleStr}).
			SetAccountStatus(entuser.AccountStatusPending).
			SetIsProfileComplete(false)

		if churchID != nil {
			cp.SetChurchID(*churchID)
		}
		if sectorID != nil {
			cp.SetSectorID(*sectorID)
		}
		_, _ = cp.Save(ctx)
	}
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

// ---------------------------------------------------------------------------
// System Settings & Governance
// ---------------------------------------------------------------------------

func (r *Repository) GetSystemSettings(ctx context.Context) (contracts.SystemSettingsDTO, error) {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	return globalSettings, nil
}

func (r *Repository) UpdateSystemSettings(ctx context.Context, input contracts.UpdateSystemSettingsDTO) (contracts.SystemSettingsDTO, error) {
	settingsMu.Lock()
	defer settingsMu.Unlock()

	if input.MinistryName != nil {
		globalSettings.MinistryName = *input.MinistryName
	}
	if input.SupportEmail != nil {
		globalSettings.SupportEmail = *input.SupportEmail
	}
	if input.SupportPhone != nil {
		globalSettings.SupportPhone = *input.SupportPhone
	}
	if input.WebsiteURL != nil {
		globalSettings.WebsiteURL = *input.WebsiteURL
	}
	if input.Timezone != nil {
		globalSettings.Timezone = *input.Timezone
	}
	if input.DateFormat != nil {
		globalSettings.DateFormat = *input.DateFormat
	}
	if input.DefaultLanguage != nil {
		globalSettings.DefaultLanguage = *input.DefaultLanguage
	}
	if input.SessionTimeoutMinutes != nil {
		globalSettings.SessionTimeoutMinutes = *input.SessionTimeoutMinutes
	}
	if input.MaxPinAttempts != nil {
		globalSettings.MaxPinAttempts = *input.MaxPinAttempts
	}
	if input.PinLockoutMinutes != nil {
		globalSettings.PinLockoutMinutes = *input.PinLockoutMinutes
	}
	if input.MagicLinkExpiryHours != nil {
		globalSettings.MagicLinkExpiryHours = *input.MagicLinkExpiryHours
	}
	if input.EnforcePinLogin != nil {
		globalSettings.EnforcePinLogin = *input.EnforcePinLogin
	}
	if input.MaintenanceMode != nil {
		globalSettings.MaintenanceMode = *input.MaintenanceMode
	}
	if input.MaintenanceMessage != nil {
		globalSettings.MaintenanceMessage = *input.MaintenanceMessage
	}
	if input.FoundationClassMinAttendance != nil {
		globalSettings.FoundationClassMinAttendance = *input.FoundationClassMinAttendance
	}
	if input.FollowupSlaDays != nil {
		globalSettings.FollowupSlaDays = *input.FollowupSlaDays
	}
	if input.AutoArchiveInactiveMonths != nil {
		globalSettings.AutoArchiveInactiveMonths = *input.AutoArchiveInactiveMonths
	}
	if input.EmailSenderName != nil {
		globalSettings.EmailSenderName = *input.EmailSenderName
	}
	if input.EmailSenderAddress != nil {
		globalSettings.EmailSenderAddress = *input.EmailSenderAddress
	}
	if input.SmsEnabled != nil {
		globalSettings.SmsEnabled = *input.SmsEnabled
	}
	if input.SmsSenderID != nil {
		globalSettings.SmsSenderID = *input.SmsSenderID
	}
	globalSettings.UpdatedAt = time.Now()

	return globalSettings, nil
}

func (r *Repository) GetRolePermissions(ctx context.Context) (contracts.RolePermissionsMatrixDTO, error) {
	permsMu.RLock()
	defer permsMu.RUnlock()

	// Clone matrix
	cloned := make(map[string]map[string]map[string]bool)
	for role, modules := range rolePermissions {
		cloned[role] = make(map[string]map[string]bool)
		for mod, perms := range modules {
			cloned[role][mod] = make(map[string]bool)
			for p, val := range perms {
				cloned[role][mod][p] = val
			}
		}
	}

	return contracts.RolePermissionsMatrixDTO{
		Permissions: cloned,
		UpdatedAt:   time.Now(),
	}, nil
}

func (r *Repository) UpdateRolePermissions(ctx context.Context, input contracts.UpdateRolePermissionsDTO) (contracts.RolePermissionsMatrixDTO, error) {
	permsMu.Lock()
	defer permsMu.Unlock()

	if input.Permissions != nil {
		for role, modules := range input.Permissions {
			if _, ok := rolePermissions[role]; !ok {
				rolePermissions[role] = make(map[string]map[string]bool)
			}
			for mod, perms := range modules {
				if _, ok := rolePermissions[role][mod]; !ok {
					rolePermissions[role][mod] = make(map[string]bool)
				}
				for p, val := range perms {
					rolePermissions[role][mod][p] = val
				}
			}
		}
	}

	return contracts.RolePermissionsMatrixDTO{
		Permissions: rolePermissions,
		UpdatedAt:   time.Now(),
	}, nil
}

func (r *Repository) GetSystemDiagnostics(ctx context.Context, uptimeSeconds int64) (contracts.SystemDiagnosticsDTO, error) {
	totalUsers, _ := r.client.User.Query().Count(ctx)
	totalChurches, _ := r.client.LocalChurch.Query().Count(ctx)
	totalMembers, _ := r.client.Member.Query().Count(ctx)
	activeFlags, _ := r.client.FeatureFlag.Query().Where(featureflag.IsEnabledEQ(true)).Count(ctx)

	dbStatus := "connected"
	if _, err := r.client.User.Query().Limit(1).All(ctx); err != nil {
		dbStatus = "degraded"
	}

	return contracts.SystemDiagnosticsDTO{
		Status:             "healthy",
		DatabaseStatus:     dbStatus,
		ServerTime:         time.Now(),
		UptimeSeconds:      uptimeSeconds,
		Environment:        "production",
		Version:            "v2.4.0",
		TotalUsers:         totalUsers,
		TotalChurches:      totalChurches,
		TotalMembers:       totalMembers,
		ActiveFeatureFlags: activeFlags,
	}, nil
}

func (r *Repository) GetChurchSettings(ctx context.Context, churchID uuid.UUID) (contracts.ChurchSettingDTO, error) {
	s, err := r.client.ChurchSetting.Query().
		Where(churchsetting.ChurchIDEQ(churchID)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			created, createErr := r.client.ChurchSetting.Create().
				SetChurchID(churchID).
				SetFoundationClassMinAttendance(2).
				Save(ctx)
			if createErr != nil {
				return contracts.ChurchSettingDTO{}, createErr
			}
			return contracts.ChurchSettingDTO{
				ID:                           created.ID.String(),
				ChurchID:                     created.ChurchID.String(),
				FoundationClassMinAttendance: created.FoundationClassMinAttendance,
			}, nil
		}
		return contracts.ChurchSettingDTO{}, err
	}
	return contracts.ChurchSettingDTO{
		ID:                           s.ID.String(),
		ChurchID:                     s.ChurchID.String(),
		FoundationClassMinAttendance: s.FoundationClassMinAttendance,
	}, nil
}

func (r *Repository) UpdateChurchSettings(ctx context.Context, churchID uuid.UUID, minAttendance int) (contracts.ChurchSettingDTO, error) {
	s, err := r.client.ChurchSetting.Query().
		Where(churchsetting.ChurchIDEQ(churchID)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			created, createErr := r.client.ChurchSetting.Create().
				SetChurchID(churchID).
				SetFoundationClassMinAttendance(minAttendance).
				Save(ctx)
			if createErr != nil {
				return contracts.ChurchSettingDTO{}, createErr
			}
			return contracts.ChurchSettingDTO{
				ID:                           created.ID.String(),
				ChurchID:                     created.ChurchID.String(),
				FoundationClassMinAttendance: created.FoundationClassMinAttendance,
			}, nil
		}
		return contracts.ChurchSettingDTO{}, err
	}

	updated, err := s.Update().
		SetFoundationClassMinAttendance(minAttendance).
		SetUpdatedAt(time.Now()).
		Save(ctx)
	if err != nil {
		return contracts.ChurchSettingDTO{}, err
	}

	return contracts.ChurchSettingDTO{
		ID:                           updated.ID.String(),
		ChurchID:                     updated.ChurchID.String(),
		FoundationClassMinAttendance: updated.FoundationClassMinAttendance,
	}, nil
}


