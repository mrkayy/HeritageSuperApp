-- Additive V2 hardening. Migration 000001 remains byte-for-byte unchanged.
ALTER TABLE branches ADD CONSTRAINT branches_org_identity UNIQUE (organization_id,id);
ALTER TABLE sectors ADD CONSTRAINT sectors_org_identity UNIQUE (organization_id,id);
ALTER TABLE teams ADD CONSTRAINT teams_org_identity UNIQUE (organization_id,id);
ALTER TABLE people ADD CONSTRAINT people_org_identity UNIQUE (organization_id,id);
ALTER TABLE accounts ADD CONSTRAINT accounts_org_identity UNIQUE (organization_id,id);
ALTER TABLE role_templates ADD CONSTRAINT role_templates_org_identity UNIQUE (organization_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_org_identity UNIQUE (organization_id,id);
ALTER TABLE sectors ADD CONSTRAINT sectors_branch_id_tenant FOREIGN KEY (organization_id,branch_id) REFERENCES branches(organization_id,id);
ALTER TABLE teams ADD CONSTRAINT teams_branch_id_tenant FOREIGN KEY (organization_id,branch_id) REFERENCES branches(organization_id,id);
ALTER TABLE people ADD CONSTRAINT people_merged_into_person_id_tenant FOREIGN KEY (organization_id,merged_into_person_id) REFERENCES people(organization_id,id);
ALTER TABLE contact_points ADD CONSTRAINT contact_points_person_id_tenant FOREIGN KEY (organization_id,person_id) REFERENCES people(organization_id,id);
ALTER TABLE church_affiliations ADD CONSTRAINT church_affiliations_person_id_tenant FOREIGN KEY (organization_id,person_id) REFERENCES people(organization_id,id);
ALTER TABLE church_affiliations ADD CONSTRAINT church_affiliations_branch_id_tenant FOREIGN KEY (organization_id,branch_id) REFERENCES branches(organization_id,id);
ALTER TABLE accounts ADD CONSTRAINT accounts_person_id_tenant FOREIGN KEY (organization_id,person_id) REFERENCES people(organization_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_person_id_tenant FOREIGN KEY (organization_id,person_id) REFERENCES people(organization_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_branch_id_tenant FOREIGN KEY (organization_id,branch_id) REFERENCES branches(organization_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_role_template_id_tenant FOREIGN KEY (organization_id,role_template_id) REFERENCES role_templates(organization_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_team_id_tenant FOREIGN KEY (organization_id,team_id) REFERENCES teams(organization_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_sector_id_tenant FOREIGN KEY (organization_id,sector_id) REFERENCES sectors(organization_id,id);
ALTER TABLE baseline_grants ADD CONSTRAINT baseline_grants_account_id_tenant FOREIGN KEY (organization_id,account_id) REFERENCES accounts(organization_id,id);
ALTER TABLE audit_events ADD CONSTRAINT audit_events_branch_id_tenant FOREIGN KEY (organization_id,branch_id) REFERENCES branches(organization_id,id);
ALTER TABLE audit_events ADD CONSTRAINT audit_events_actor_person_id_tenant FOREIGN KEY (organization_id,actor_person_id) REFERENCES people(organization_id,id);
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_branch_id_tenant FOREIGN KEY (organization_id,branch_id) REFERENCES branches(organization_id,id);
ALTER TABLE teams ADD CONSTRAINT teams_branch_identity UNIQUE (organization_id,branch_id,id);
ALTER TABLE sectors ADD CONSTRAINT sectors_branch_identity UNIQUE (organization_id,branch_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_team_id_branch FOREIGN KEY (organization_id,branch_id,team_id) REFERENCES teams(organization_id,branch_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_sector_id_branch FOREIGN KEY (organization_id,branch_id,sector_id) REFERENCES sectors(organization_id,branch_id,id);
ALTER TABLE assignments ADD CONSTRAINT assignments_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from);
ALTER TABLE scoped_grants ADD CONSTRAINT scoped_grants_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from);
ALTER TABLE delegations ADD CONSTRAINT delegations_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from);
ALTER TABLE church_affiliations ADD CONSTRAINT church_affiliations_valid_period CHECK (ended_at IS NULL OR ended_at > joined_at);
ALTER TABLE sessions ADD CONSTRAINT sessions_valid_period CHECK (expires_at IS NULL OR expires_at > created_at);
ALTER TABLE idempotency_records ADD CONSTRAINT idempotency_records_valid_period CHECK (expires_at IS NULL OR expires_at > created_at);
ALTER TABLE baseline_grants ADD CONSTRAINT baseline_self_only CHECK (scope_level = 'SELF');
ALTER TABLE scoped_grants ADD COLUMN revoked_at TIMESTAMPTZ;
ALTER TABLE scoped_grants ADD COLUMN delegable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE assignments ADD CONSTRAINT assignments_scope_enum CHECK (scope_level IN ('SELF','ASSIGNED','TEAM','SECTOR','CHURCH','ORGANIZATION','PLATFORM'));
ALTER TABLE scoped_grants ADD CONSTRAINT scoped_grants_scope_enum CHECK (scope_level IN ('SELF','ASSIGNED','TEAM','SECTOR','CHURCH','ORGANIZATION','PLATFORM'));
ALTER TABLE scoped_grants ADD CONSTRAINT grant_sensitivity_enum CHECK (sensitivity_class IN ('GENERAL','MINISTRY_INTERNAL','PASTORAL_CONFIDENTIAL','CHILD_SAFEGUARDING','EXECUTIVE_RESTRICTED','SECURITY_RESTRICTED'));
ALTER TABLE role_capabilities DROP CONSTRAINT role_capabilities_pkey;
ALTER TABLE role_capabilities ADD COLUMN id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY;
ALTER TABLE role_capabilities ADD CONSTRAINT role_capabilities_natural_key UNIQUE (role_template_id,capability_id);
ALTER TABLE consumer_receipts DROP CONSTRAINT consumer_receipts_pkey;
ALTER TABLE consumer_receipts ADD COLUMN id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY;
ALTER TABLE consumer_receipts ADD CONSTRAINT consumer_receipts_natural_key UNIQUE (consumer_name,event_id);
ALTER TABLE idempotency_records DROP CONSTRAINT idempotency_records_pkey;
ALTER TABLE idempotency_records ADD COLUMN id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY;
ALTER TABLE idempotency_records ADD CONSTRAINT idempotency_records_natural_key UNIQUE (organization_id,idempotency_key);
ALTER TABLE legacy_record_maps DROP CONSTRAINT legacy_record_maps_pkey;
ALTER TABLE legacy_record_maps ADD COLUMN id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY;
ALTER TABLE legacy_record_maps ADD CONSTRAINT legacy_record_maps_natural_key UNIQUE (source_entity,source_id,migration_run_id);
CREATE FUNCTION v2_bump_version() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.version := OLD.version + 1; NEW.updated_at := clock_timestamp(); RETURN NEW; END $$;
ALTER TABLE organizations ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER organizations_version BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE branches ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER branches_version BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE sectors ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER sectors_version BEFORE UPDATE ON sectors FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE teams ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER teams_version BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE people ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE people ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE people ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER people_version BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE contact_points ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE contact_points ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE contact_points ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER contact_points_version BEFORE UPDATE ON contact_points FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE church_affiliations ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE church_affiliations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE church_affiliations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER church_affiliations_version BEFORE UPDATE ON church_affiliations FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE accounts ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER accounts_version BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE auth_methods ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE auth_methods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE auth_methods ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER auth_methods_version BEFORE UPDATE ON auth_methods FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE sessions ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER sessions_version BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE role_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE role_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER role_templates_version BEFORE UPDATE ON role_templates FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE capabilities ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER capabilities_version BEFORE UPDATE ON capabilities FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE role_capabilities ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE role_capabilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE role_capabilities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER role_capabilities_version BEFORE UPDATE ON role_capabilities FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE assignments ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER assignments_version BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE scoped_grants ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE scoped_grants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scoped_grants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER scoped_grants_version BEFORE UPDATE ON scoped_grants FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE baseline_grants ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE baseline_grants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE baseline_grants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER baseline_grants_version BEFORE UPDATE ON baseline_grants FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE delegations ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE delegations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE delegations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER delegations_version BEFORE UPDATE ON delegations FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE outbox_events ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER outbox_events_version BEFORE UPDATE ON outbox_events FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE idempotency_records ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE idempotency_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE idempotency_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER idempotency_records_version BEFORE UPDATE ON idempotency_records FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
ALTER TABLE legacy_record_maps ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE legacy_record_maps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE legacy_record_maps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER legacy_record_maps_version BEFORE UPDATE ON legacy_record_maps FOR EACH ROW EXECUTE FUNCTION v2_bump_version();
CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION trg_audit_events_immutable();
ALTER TABLE outbox_events ADD COLUMN lease_token UUID;
ALTER TABLE outbox_events ADD COLUMN last_error TEXT;
ALTER TABLE outbox_events ADD CONSTRAINT outbox_state CHECK (state IN ('pending','published','failed'));
ALTER TABLE outbox_events ADD CONSTRAINT outbox_retries CHECK (retry_count >= 0);

CREATE FUNCTION v2_validate_assignment_scope() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE resource UUID;
BEGIN
 IF (NEW.team_id IS NOT NULL OR NEW.sector_id IS NOT NULL) AND NEW.branch_id IS NULL THEN RAISE EXCEPTION 'team/sector assignment requires branch'; END IF;
 IF NEW.scope_level = 'TEAM' THEN
  resource := COALESCE(NEW.scope_resource_id, NEW.team_id);
  IF resource IS NULL OR (NEW.team_id IS NOT NULL AND NEW.team_id <> resource) OR NOT EXISTS (SELECT 1 FROM teams WHERE id=resource AND organization_id=NEW.organization_id AND branch_id=NEW.branch_id) THEN RAISE EXCEPTION 'invalid team scope'; END IF;
 ELSIF NEW.scope_level = 'SECTOR' THEN
  resource := COALESCE(NEW.scope_resource_id, NEW.sector_id);
  IF resource IS NULL OR (NEW.sector_id IS NOT NULL AND NEW.sector_id <> resource) OR NOT EXISTS (SELECT 1 FROM sectors WHERE id=resource AND organization_id=NEW.organization_id AND branch_id=NEW.branch_id) THEN RAISE EXCEPTION 'invalid sector scope'; END IF;
 ELSIF NEW.scope_level = 'CHURCH' THEN
  IF NEW.branch_id IS NULL OR (NEW.scope_resource_id IS NOT NULL AND NEW.scope_resource_id <> NEW.branch_id) THEN RAISE EXCEPTION 'invalid branch scope'; END IF;
 ELSIF NEW.scope_level IN ('ASSIGNED','SELF') THEN
  resource := COALESCE(NEW.scope_resource_id, CASE WHEN NEW.scope_level='SELF' THEN NEW.person_id END);
  IF resource IS NULL OR NOT EXISTS (SELECT 1 FROM people WHERE id=resource AND organization_id=NEW.organization_id) OR (NEW.scope_level='SELF' AND resource<>NEW.person_id) THEN RAISE EXCEPTION 'invalid person scope'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assignment_scope BEFORE INSERT OR UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION v2_validate_assignment_scope();

CREATE FUNCTION v2_validate_grant() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE a assignments;
BEGIN
 SELECT * INTO STRICT a FROM assignments WHERE id=NEW.assignment_id FOR SHARE;
 IF NEW.scope_level <> a.scope_level OR NEW.scope_resource_id IS DISTINCT FROM a.scope_resource_id THEN RAISE EXCEPTION 'grant must retain assignment scope'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER grant_scope BEFORE INSERT OR UPDATE ON scoped_grants FOR EACH ROW EXECUTE FUNCTION v2_validate_grant();

CREATE FUNCTION v2_validate_delegation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE g scoped_grants; source assignments; recipient assignments;
BEGIN
 SELECT * INTO STRICT g FROM scoped_grants WHERE id=NEW.parent_grant_id FOR SHARE;
 SELECT * INTO STRICT source FROM assignments WHERE id=g.assignment_id FOR SHARE;
 SELECT * INTO STRICT recipient FROM assignments WHERE id=NEW.delegated_to_assignment_id FOR SHARE;
 IF NOT g.delegable OR g.revoked_at IS NOT NULL OR source.revoked_at IS NOT NULL OR recipient.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'grant cannot be delegated'; END IF;
 IF source.organization_id <> recipient.organization_id OR source.scope_level <> recipient.scope_level OR source.scope_resource_id IS DISTINCT FROM recipient.scope_resource_id OR source.branch_id IS DISTINCT FROM recipient.branch_id THEN RAISE EXCEPTION 'delegation exceeds source scope'; END IF;
 IF NEW.valid_from < GREATEST(g.valid_from,source.valid_from,recipient.valid_from) OR NEW.valid_until > LEAST(COALESCE(g.valid_until,'infinity'),COALESCE(source.valid_until,'infinity'),COALESCE(recipient.valid_until,'infinity')) THEN RAISE EXCEPTION 'delegation exceeds source validity'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER delegation_bounds BEFORE INSERT OR UPDATE ON delegations FOR EACH ROW EXECUTE FUNCTION v2_validate_delegation();


-- Scope ownership cannot be moved out from underneath existing grants/delegations.
CREATE FUNCTION v2_assignment_identity_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.organization_id,NEW.person_id,NEW.branch_id,NEW.team_id,NEW.sector_id,NEW.scope_level,NEW.scope_resource_id)
 IS DISTINCT FROM (OLD.organization_id,OLD.person_id,OLD.branch_id,OLD.team_id,OLD.sector_id,OLD.scope_level,OLD.scope_resource_id)
 THEN RAISE EXCEPTION 'revoke and replace assignment to change scope or owner'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assignment_identity BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION v2_assignment_identity_immutable();

-- A migration owner provisions privileges; API credentials must only inherit this role.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='hof_v2_app') THEN
  CREATE ROLE hof_v2_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
 END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO hof_v2_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO hof_v2_app;
GRANT INSERT, UPDATE, DELETE ON organizations, branches, sectors, teams, people,
 contact_points, church_affiliations, accounts, auth_methods, sessions, role_templates,
 capabilities, role_capabilities, assignments, scoped_grants, baseline_grants,
 delegations, outbox_events, consumer_receipts, idempotency_records, legacy_record_maps TO hof_v2_app;
GRANT INSERT ON audit_events TO hof_v2_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM hof_v2_app;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON schema_migrations_v2 FROM hof_v2_app;

-- Legacy imports must identify their tenant; no ambiguous existing rows are guessed.
ALTER TABLE legacy_record_maps ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id);
ALTER TABLE legacy_record_maps ADD COLUMN source_system TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE legacy_record_maps DROP CONSTRAINT legacy_record_maps_natural_key;
ALTER TABLE legacy_record_maps ADD CONSTRAINT legacy_record_maps_natural_key UNIQUE(organization_id,source_system,source_entity,source_id,migration_run_id);
CREATE FUNCTION v2_validate_legacy_target() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE matches BOOLEAN;
BEGIN
 IF NEW.target_entity NOT IN ('organizations','branches','sectors','teams','people','accounts','role_templates','assignments') THEN RAISE EXCEPTION 'unsupported legacy target type'; END IF;
 IF NEW.target_entity='organizations' THEN
  matches := NEW.target_id=NEW.organization_id;
 ELSE
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE id=$1 AND organization_id=$2)',NEW.target_entity) INTO matches USING NEW.target_id,NEW.organization_id;
 END IF;
 IF NOT matches THEN RAISE EXCEPTION 'legacy target belongs to another organization or does not exist'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legacy_target BEFORE INSERT OR UPDATE ON legacy_record_maps FOR EACH ROW EXECUTE FUNCTION v2_validate_legacy_target();
ALTER TABLE audit_events ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK(version=1);
ALTER TABLE consumer_receipts ADD COLUMN version INT NOT NULL DEFAULT 1 CHECK(version=1);
