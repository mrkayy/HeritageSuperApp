package database

import (
	"context"
	"database/sql"
	"errors"
)

// VerifyRuntimeRole refuses migration-owner credentials, even in development.
func VerifyRuntimeRole(ctx context.Context, db *sql.DB) error {
	var unsafe bool
	err := db.QueryRowContext(ctx, `SELECT r.rolsuper OR r.rolcreaterole OR r.rolcreatedb
 OR pg_has_role(current_user,d.datdba,'MEMBER')
 OR has_schema_privilege(current_user,'public','CREATE')
 OR has_table_privilege(current_user,'audit_events','UPDATE,DELETE,TRUNCATE')
 OR has_table_privilege(current_user,'schema_migrations_v2','INSERT,UPDATE,DELETE,TRUNCATE')
 FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user`).Scan(&unsafe)
	if err != nil {
		return errors.New("runtime database role verification failed; migrate explicitly first")
	}
	if unsafe {
		return errors.New("V2 API requires a restricted runtime database role, not the migration owner")
	}
	return nil
}
