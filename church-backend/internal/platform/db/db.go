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
	"github.com/hofchurchng/church-backend/internal/ent/localchurch"
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

	return client, nil
}

func seedDefaultAdmin(ctx context.Context, client *ent.Client) error {
	exists, err := client.User.Query().
		Where(entuser.RoleEQ(entuser.RoleChurchAdmin)).
		Exist(ctx)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("Password123@"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = client.User.Create().
		SetEmail("admin@hofchurch.org").
		SetPasswordHash(string(hash)).
		SetFirstName("Super").
		SetLastName("Admin").
		SetRole(entuser.RoleChurchAdmin).
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
