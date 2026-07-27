package db

import (
	"context"
	"database/sql"
	"fmt"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/hofchurchng/church-backend/internal/ent"
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
