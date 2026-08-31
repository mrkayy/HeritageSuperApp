package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/featureflag"
	"github.com/hofchurchng/church-backend/internal/ent/localchurch"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/sector"
	"github.com/hofchurchng/church-backend/internal/ent/team"
	entuser "github.com/hofchurchng/church-backend/internal/ent/user"
	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

// Connect initializes the PostgreSQL connection using pgx/v5 standard library driver,
// creates the Ent client, runs automatic database migrations, seeds the default super admin, and returns the client.
func Connect(ctx context.Context, url string) (*ent.Client, error) {
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, err
	}
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}

	drv := entsql.OpenDB(dialect.Postgres, db)
	client := ent.NewClient(ent.Driver(drv))

	// Run automatic migration to create/update tables matching Ent schemas
	if err := client.Schema.Create(ctx); err != nil {
		client.Close()
		return nil, err
	}

	// Seed default super admin user if none exists
	if err := seedDefaultAdmin(ctx, client); err != nil {
		client.Close()
		return nil, fmt.Errorf("seed default admin: %w", err)
	}

	// Seed churches, sectors, and teams
	if err := seedChurchesTeamsSectors(ctx, client); err != nil {
		client.Close()
		return nil, fmt.Errorf("seed org tables: %w", err)
	}

	// Seed default feature flags
	if err := seedFeatureFlags(ctx, client); err != nil {
		client.Close()
		return nil, fmt.Errorf("seed feature flags: %w", err)
	}

	// Sync all leadership invites into Member and User directory tables
	if err := syncAllInvitesToMembersAndUsers(ctx, client); err != nil {
		log.Printf("[db] warning: syncAllInvitesToMembersAndUsers: %v", err)
	}

	return client, nil
}

func seedDefaultAdmin(ctx context.Context, client *ent.Client) error {
	existingUser, err := client.User.Query().
		Where(entuser.EmailEQ("josepholukayode05+admin@gmail.com")).
		Only(ctx)
	if err == nil && existingUser != nil {
		if existingUser.Role != entuser.RoleSuperAdmin {
			return existingUser.Update().
				SetRole(entuser.RoleSuperAdmin).
				Exec(ctx)
		}
		return nil
	} else if err != nil && !ent.IsNotFound(err) {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("Password123@"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = client.User.Create().
		SetEmail("josepholukayode05+admin@gmail.com").
		SetPasswordHash(string(hash)).
		SetFirstName("Super").
		SetLastName("Admin").
		SetRole(entuser.RoleSuperAdmin).
		SetAccountStatus(entuser.AccountStatusActive).
		SetIsProfileComplete(true).
		Save(ctx)
	return err
}

func seedChurchesTeamsSectors(ctx context.Context, client *ent.Client) error {
	log.Println("[db] Seeding local churches...")
	churches := []struct {
		ID          string
		Name        string
		Center      string
		Slug        string
		Description string
	}{
		{"7769b083-feac-480d-ae83-79828a9dced4", "God's Heritage of Faith Church", "Ikeja Center", "hof-ikeja", "A vibrant church in Ikeja."},
		{"0f136e90-a86c-4b0d-93db-007d5efd5de4", "God's Heritage of Faith Church", "Alimosho Center", "hof-alimosho", "Church with a focus on evangelism."},
		{"6d737463-f5a7-4e3d-9cc9-d55d0930fe30", "God's Heritage of Faith Church", "Ibadan Center", "hof-ibadan", "Community-based urban church."},
		{"8d73d746-53eb-403e-aba6-8278e61caeb6", "God's Heritage of Faith Church", "Oshogbo Center", "hof-oshogbo", "Known for bible teaching and prayer."},
		{"b136eafe-f1d8-4685-96cb-f8cf0df6215a", "God's Heritage of Faith Church", "Scotland Church", "hof-scotland", "Youth-focused city church."},
		{"ed2c747e-e17f-4667-ac3e-4f8813cab1e3", "God's Heritage of Faith Church", "Oxford Church", "hof-oxford", "Youth-focused city church."},
		{"1d5e594d-5ea8-4b51-8810-07600bd983bf", "God's Heritage of Faith Church", "Christ Tribe", "hof-christ-tribe", "Youth-focused city church."},
	}

	for _, c := range churches {
		cid, err := uuid.Parse(c.ID)
		if err != nil {
			return err
		}
		exists, err := client.LocalChurch.Query().
			Where(
				localchurch.Or(
					localchurch.IDEQ(cid),
					localchurch.SlugEQ(c.Slug),
				),
			).
			Exist(ctx)
		if err != nil {
			return err
		}
		if !exists {
			_, err = client.LocalChurch.Create().
				SetID(cid).
				SetName(c.Name).
				SetCenter(c.Center).
				SetSlug(c.Slug).
				SetDescription(c.Description).
				Save(ctx)
			if err != nil {
				return err
			}
			log.Printf("[db] Seeded church center: %s", c.Center)
		}
	}

	log.Println("[db] Seeding sectors...")
	sectors := []struct {
		ChurchID    string
		SectorName  string
		Description string
	}{
		{"7769b083-feac-480d-ae83-79828a9dced4", "Ikeja Central", "Central outreach region covering Allen and Opebi."},
		{"7769b083-feac-480d-ae83-79828a9dced4", "Ikeja North", "Northern boundary near Lagos State Secretariat."},
		{"7769b083-feac-480d-ae83-79828a9dced4", "Ikeja South", "Southern reach towards Awolowo Way."},
		{"7769b083-feac-480d-ae83-79828a9dced4", "Opebi Extension", "Extended outreach zone around Opebi Link Road."},
		{"7769b083-feac-480d-ae83-79828a9dced4", "Alausa Precinct", "Covers Alausa and part of Ogba."},
	}

	for _, s := range sectors {
		cid, err := uuid.Parse(s.ChurchID)
		if err != nil {
			return err
		}
		exists, err := client.Sector.Query().
			Where(
				sector.SectorNameEQ(s.SectorName),
				sector.ChurchIDEQ(cid),
			).
			Exist(ctx)
		if err != nil {
			return err
		}
		if !exists {
			_, err = client.Sector.Create().
				SetChurchID(cid).
				SetSectorName(s.SectorName).
				SetDescription(s.Description).
				Save(ctx)
			if err != nil {
				return err
			}
			log.Printf("[db] Seeded sector: %s", s.SectorName)
		}
	}

	log.Println("[db] Seeding teams...")
	teams := []struct {
		Name        string
		Description string
	}{
		{"Worship Team", "Handles music and worship during services"},
		{"Joyful Sounds", "Handles music and worship during services"},
		{"Membership Team", "Handles membership and integration of new members"},
		{"Media Ministry", "Manages church audio, visuals, and streaming"},
		{"Communications Team", "Manages church audio, visuals, and streaming"},
		{"Publishers Team", "Manages church audio, visuals, and streaming"},
		{"Kids Ministry", "Manages church audio, visuals, and streaming"},
		{"Teens Ministry", "Manages church audio, visuals, and streaming"},
		{"Hospitality Team", "Coordinates seating and welcoming of attendees"},
		{"Greeters Team", "Responsible for reaching out to new converts"},
		{"Transport Team", "Intercedes for church events and members"},
		{"Information Center", "Intercedes for church events and members"},
		{"Sanctuary Team", "Intercedes for church events and members"},
		{"Technical Team", "Intercedes for church events and members"},
		{"Stage Management Team", "Intercedes for church events and members"},
		{"Alter Servers Team", "Intercedes for church events and members"},
	}

	for _, t := range teams {
		exists, err := client.Team.Query().Where(team.NameEQ(t.Name)).Exist(ctx)
		if err != nil {
			return err
		}
		if !exists {
			_, err = client.Team.Create().
				SetName(t.Name).
				SetDescription(t.Description).
				Save(ctx)
			if err != nil {
				return err
			}
			log.Printf("[db] Seeded team: %s", t.Name)
		}
	}

	return nil
}

func seedFeatureFlags(ctx context.Context, client *ent.Client) error {
	log.Println("[db] Seeding default feature flags...")
	defaultFlags := []struct {
		Key         string
		Name        string
		Description string
		Category    string
		IsEnabled   bool
	}{
		{
			Key:         "feature_souls",
			Name:        "Soul Winning & Registration",
			Description: "Allows members to register converts and soul winning activities",
			Category:    "main_menu",
			IsEnabled:   true,
		},
		{
			Key:         "feature_soul_journal",
			Name:        "Soul Journal",
			Description: "Personal journal for tracking soul follow-up and discipleship logs",
			Category:    "main_menu",
			IsEnabled:   true,
		},
		{
			Key:         "feature_followup",
			Name:        "Follow-Up Ministry",
			Description: "Task assignment, outreach follow-ups, and convert check-ins",
			Category:    "main_menu",
			IsEnabled:   true,
		},
		{
			Key:         "feature_transport",
			Name:        "Transport Coordination",
			Description: "Bus routing, bus stops, and Sunday transport requests",
			Category:    "main_menu",
			IsEnabled:   true,
		},
		{
			Key:         "feature_leaderboard",
			Name:        "Ministry Leaderboard",
			Description: "Evangelism and soul-winning team rankings and metrics",
			Category:    "main_menu",
			IsEnabled:   true,
		},
		{
			Key:         "feature_admin_panel",
			Name:        "Church Administration Panel",
			Description: "Church admin oversight tools, user management, and stats",
			Category:    "admin",
			IsEnabled:   true,
		},
		{
			Key:         "feature_membership_team",
			Name:        "Membership Team Module",
			Description: "Complete member onboarding, stages journey, birthdays, and anniversaries CRM",
			Category:    "teams",
			IsEnabled:   true,
		},
		{
			Key:         "feature_info_center",
			Name:        "Information Center Module",
			Description: "First-time visitor registration, member directory, and guardian matching",
			Category:    "teams",
			IsEnabled:   true,
		},
	}

	for _, f := range defaultFlags {
		exists, err := client.FeatureFlag.Query().Where(featureflag.KeyEQ(f.Key)).Exist(ctx)
		if err != nil {
			return err
		}
		if !exists {
			_, err = client.FeatureFlag.Create().
				SetKey(f.Key).
				SetName(f.Name).
				SetDescription(f.Description).
				SetCategory(f.Category).
				SetIsEnabled(f.IsEnabled).
				Save(ctx)
			if err != nil {
				return err
			}
			log.Printf("[db] Seeded feature flag: %s (%s)", f.Name, f.Key)
		}
	}

	return nil
}

func seedDummyUsers(ctx context.Context, client *ent.Client) error {
	log.Println("[db] Seeding dummy users...")

	ikejaChurchID, err := uuid.Parse("7769b083-feac-480d-ae83-79828a9dced4")
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("Password123@"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	users := []struct {
		FirstName string
		LastName  string
		Email     string
		Role      entuser.Role
		Phone     string
	}{
		{"Olayinka", "Adekunle", "josepholukayode05+olayinka@gmail.com", entuser.RoleChurchAdmin, "+2348101000001"},
		{"Chidinma", "Okafor", "josepholukayode05+chidinma@gmail.com", entuser.RoleTeamLead, "+2348101000002"},
		{"Emeka", "Nwosu", "josepholukayode05+emeka@gmail.com", entuser.RoleSteward, "+2348101000003"},
		{"Funke", "Adeyemi", "josepholukayode05+funke@gmail.com", entuser.RoleTeamLead, "+2348101000004"},
		{"Tunde", "Bakare", "josepholukayode05+tunde@gmail.com", entuser.RoleTeamLead, "+2348101000005"},
		{"Amara", "Eze", "josepholukayode05+amara@gmail.com", entuser.RoleSteward, "+2348101000006"},
		{"Biodun", "Salami", "josepholukayode05+biodun@gmail.com", entuser.RoleMember, "+2348101000007"},
		{"Ngozi", "Uche", "josepholukayode05+ngozi@gmail.com", entuser.RoleMember, "+2348101000008"},
		{"Dare", "Afolabi", "josepholukayode05+dare@gmail.com", entuser.RoleFirstTimer, "+2348101000009"},
		{"Kemi", "Oluwole", "josepholukayode05+kemi@gmail.com", entuser.RoleGuest, "+2348101000010"},
	}

	for _, u := range users {
		exists, err := client.User.Query().Where(entuser.EmailEQ(u.Email)).Exist(ctx)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		_, err = client.User.Create().
			SetEmail(u.Email).
			SetPasswordHash(string(hash)).
			SetFirstName(u.FirstName).
			SetLastName(u.LastName).
			SetRole(u.Role).
			SetPhoneNumber(u.Phone).
			SetChurchID(ikejaChurchID).
			SetAccountStatus(entuser.AccountStatusActive).
			SetIsProfileComplete(true).
			Save(ctx)
		if err != nil {
			return err
		}
		log.Printf("[db] Seeded user: %s %s (%s)", u.FirstName, u.LastName, u.Role)
	}

	return nil
}

func syncAllInvitesToMembersAndUsers(ctx context.Context, client *ent.Client) error {
	invites, err := client.OtpInvites.Query().All(ctx)
	if err != nil {
		return err
	}

	for _, inv := range invites {
		if inv.Email == "" {
			continue
		}
		roleStr := string(inv.Role)
		if roleStr == "" {
			roleStr = "member"
		}

		// 1. Sync Member record
		_, err = client.Member.Query().
			Where(member.EmailEqualFold(inv.Email)).
			Only(ctx)

		if err != nil {
			cp := client.Member.Create().
				SetEmail(inv.Email).
				SetFirstName(inv.FirstName).
				SetSurname(inv.LastName).
				SetCurrentStage(member.CurrentStageStewardship)

			if inv.ChurchID != nil {
				cp.SetLocalChurchID(*inv.ChurchID)
			}
			if inv.SectorID != nil {
				cp.SetSectorID(*inv.SectorID)
			}
			_, err = cp.Save(ctx)
			if err != nil {
				log.Printf("[db] error syncing member for %s: %v", inv.Email, err)
			}
		}

		// 2. Sync User record
		eu, err := client.User.Query().
			Where(entuser.EmailEqualFold(inv.Email)).
			Only(ctx)

		if err != nil {
			status := entuser.AccountStatusPending
			if inv.Used {
				status = entuser.AccountStatusActive
			}
			cp := client.User.Create().
				SetEmail(inv.Email).
				SetPasswordHash("pending-magic-link-activation").
				SetFirstName(inv.FirstName).
				SetLastName(inv.LastName).
				SetRole(entuser.Role(roleStr)).
				SetRoles([]string{roleStr}).
				SetAccountStatus(status).
				SetIsProfileComplete(inv.Used)

			if inv.ChurchID != nil {
				cp.SetChurchID(*inv.ChurchID)
			}
			if inv.SectorID != nil {
				cp.SetSectorID(*inv.SectorID)
			}
			_, err = cp.Save(ctx)
			if err != nil {
				log.Printf("[db] error syncing user for %s: %v", inv.Email, err)
			}
		} else {
			up := client.User.UpdateOneID(eu.ID).
				SetRole(entuser.Role(roleStr)).
				SetRoles([]string{roleStr})
			_ = up.Exec(ctx)
		}
	}
	return nil
}

