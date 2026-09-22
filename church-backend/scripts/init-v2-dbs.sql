-- Create test database alongside dev database
SELECT 'CREATE DATABASE hof_v2_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hof_v2_test')\gexec

GRANT ALL PRIVILEGES ON DATABASE hof_v2_dev TO hof_v2_user;
GRANT ALL PRIVILEGES ON DATABASE hof_v2_test TO hof_v2_user;

-- Synthetic local credentials only. The API never uses the migration owner.
DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='hof_v2_app') THEN CREATE ROLE hof_v2_app NOLOGIN; END IF;
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='hof_v2_runtime') THEN
  CREATE ROLE hof_v2_runtime LOGIN PASSWORD 'hof_v2_runtime_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE;
 END IF;
END $$;
GRANT hof_v2_app TO hof_v2_runtime;
GRANT CONNECT ON DATABASE hof_v2_dev TO hof_v2_runtime;
