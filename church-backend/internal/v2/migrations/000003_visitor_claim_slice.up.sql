-- Visitor capture and controlled account-claim slice.
-- This migration does not create an account from a visitor capture.

CREATE TABLE IF NOT EXISTS service_occurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    starts_at TIMESTAMPTZ NOT NULL,
    service_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('scheduled','open','closed','cancelled')),
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, id),
    UNIQUE (organization_id, branch_id, starts_at, service_type)
);

CREATE TABLE IF NOT EXISTS visitor_captures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
    service_occurrence_id UUID NOT NULL REFERENCES service_occurrences(id) ON DELETE RESTRICT,
    source TEXT NOT NULL CHECK (source IN ('info_center','self_service_qr','import')),
    inviter_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    missing_contact_reason TEXT,
    restricted_prayer_note JSONB,
    captured_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    UNIQUE (organization_id, id),
    UNIQUE (service_occurrence_id, person_id),
    FOREIGN KEY (organization_id, branch_id) REFERENCES branches(organization_id, id),
    FOREIGN KEY (organization_id, person_id) REFERENCES people(organization_id, id),
    FOREIGN KEY (organization_id, service_occurrence_id) REFERENCES service_occurrences(organization_id, id),
    FOREIGN KEY (organization_id, inviter_person_id) REFERENCES people(organization_id, id)
);

CREATE TABLE IF NOT EXISTS follow_up_work_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
    visitor_capture_id UUID REFERENCES visitor_captures(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('welcome','foundation_recommendation')),
    status TEXT NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned','assigned','completed','declined','cancelled')),
    assignee_assignment_id UUID REFERENCES assignments(id) ON DELETE RESTRICT,
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, id),
    FOREIGN KEY (organization_id, branch_id) REFERENCES branches(organization_id, id),
    FOREIGN KEY (organization_id, person_id) REFERENCES people(organization_id, id),
    FOREIGN KEY (organization_id, visitor_capture_id) REFERENCES visitor_captures(organization_id, id),
    FOREIGN KEY (organization_id, assignee_assignment_id) REFERENCES assignments(organization_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_welcome_work ON follow_up_work_items(person_id, kind) WHERE kind='welcome' AND status IN ('unassigned','assigned');

CREATE TABLE IF NOT EXISTS profile_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
    verified_by_assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
    evidence JSONB NOT NULL DEFAULT '{}',
    scope TEXT NOT NULL DEFAULT 'identity' CHECK (scope IN ('identity','contact','profile')),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    FOREIGN KEY (organization_id, person_id) REFERENCES people(organization_id, id),
    FOREIGN KEY (organization_id, verified_by_assignment_id) REFERENCES assignments(organization_id, id)
);

CREATE TABLE IF NOT EXISTS claim_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
    issued_by_assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
    auth_method_kind TEXT NOT NULL CHECK (auth_method_kind IN ('email','phone','provider')),
    destination_hash TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL DEFAULT 'claim_account' CHECK (purpose='claim_account'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','consumed','revoked','expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id, person_id) REFERENCES people(organization_id, id),
    FOREIGN KEY (organization_id, issued_by_assignment_id) REFERENCES assignments(organization_id, id),
    CHECK (expires_at > created_at),
    CHECK ((status='consumed') = (consumed_at IS NOT NULL)),
    CHECK (status <> 'revoked' OR revoked_at IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_claim_invitation ON claim_invitations(organization_id, person_id) WHERE status='pending';

CREATE INDEX IF NOT EXISTS idx_visitor_captures_branch_time ON visitor_captures(organization_id, branch_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_up_work_branch_status ON follow_up_work_items(organization_id, branch_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_claim_invitations_person ON claim_invitations(organization_id, person_id, status);

CREATE OR REPLACE FUNCTION v2_visitor_version() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.version := OLD.version + 1; NEW.updated_at := clock_timestamp(); RETURN NEW; END $$;
CREATE TRIGGER service_occurrence_version BEFORE UPDATE ON service_occurrences FOR EACH ROW EXECUTE FUNCTION v2_visitor_version();
CREATE TRIGGER follow_up_work_version BEFORE UPDATE ON follow_up_work_items FOR EACH ROW EXECUTE FUNCTION v2_visitor_version();

-- A visitor capture always creates a separate welcome work item in the same transaction.
CREATE OR REPLACE FUNCTION v2_capture_welcome_work() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO follow_up_work_items(organization_id,branch_id,person_id,visitor_capture_id,kind)
 VALUES(NEW.organization_id,NEW.branch_id,NEW.person_id,NEW.id,'welcome')
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER visitor_capture_welcome AFTER INSERT ON visitor_captures FOR EACH ROW EXECUTE FUNCTION v2_capture_welcome_work();
