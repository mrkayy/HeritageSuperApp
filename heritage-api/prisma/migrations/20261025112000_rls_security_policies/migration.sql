-- ─── Row-Level Security (RLS) Helper Functions ──────────────────────────────

CREATE OR REPLACE FUNCTION current_app_person_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_person_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_roles() RETURNS text AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_roles', true), '');
EXCEPTION WHEN OTHERS THEN
  RETURN '';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_team_ids() RETURNS text AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_team_ids', true), '');
EXCEPTION WHEN OTHERS THEN
  RETURN '';
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── Enable RLS On Sensitive Domain Tables ──────────────────────────────────

ALTER TABLE "PrayerNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FollowUpTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;

-- ─── 1. PrayerNote: Pastoral & Membership Lead Isolation ─────────────────────

DROP POLICY IF EXISTS prayer_notes_pastoral_isolation ON "PrayerNote";
CREATE POLICY prayer_notes_pastoral_isolation ON "PrayerNote"
  FOR ALL
  USING (
    current_app_person_id() IS NULL
    OR current_app_roles() ~* '(ADMIN|PASTOR)'
    OR (
      current_app_roles() ~* 'TEAM_LEAD'
      AND EXISTS (
        SELECT 1 FROM "Assignment" a
        JOIN "Team" t ON t.id = a."teamId"
        WHERE a."personId" = current_app_person_id()
          AND a."role" = 'TEAM_LEAD'
          AND t."key" = 'membership'
          AND a."endedAt" IS NULL
      )
    )
  );

-- ─── 2. FollowUpTask: Scoped Assignment & Queue Visibility ───────────────────

DROP POLICY IF EXISTS followup_task_scoped_access ON "FollowUpTask";
CREATE POLICY followup_task_scoped_access ON "FollowUpTask"
  FOR ALL
  USING (
    current_app_person_id() IS NULL
    OR current_app_roles() ~* '(ADMIN|PASTOR)'
    OR (
      current_app_roles() ~* '(TEAM_LEAD|ASSISTANT_TEAM_LEAD)'
      AND EXISTS (
        SELECT 1 FROM "Assignment" a
        JOIN "Team" t ON t.id = a."teamId"
        WHERE a."personId" = current_app_person_id()
          AND a."role" IN ('TEAM_LEAD', 'ASSISTANT_TEAM_LEAD')
          AND t."key" = 'membership'
          AND a."endedAt" IS NULL
      )
    )
    OR (
      "assigneePersonId" = current_app_person_id()
      OR "assigneePersonId" IS NULL
    )
  );

-- ─── 3. CallLog: Provenance & Worker Scope ───────────────────────────────────

DROP POLICY IF EXISTS calllog_scope ON "CallLog";
CREATE POLICY calllog_scope ON "CallLog"
  FOR ALL
  USING (
    current_app_person_id() IS NULL
    OR current_app_roles() ~* '(ADMIN|PASTOR)'
    OR "callerPersonId" = current_app_person_id()
    OR EXISTS (
      SELECT 1 FROM "FollowUpTask" f
      WHERE f.id = "taskId"
        AND (
          f."assigneePersonId" = current_app_person_id()
          OR current_app_roles() ~* '(TEAM_LEAD|ASSISTANT_TEAM_LEAD)'
        )
    )
  );

-- ─── 4. AttendanceRecord: Information Center Exclusive ───────────────────────

DROP POLICY IF EXISTS attendance_info_center_isolation ON "AttendanceRecord";
CREATE POLICY attendance_info_center_isolation ON "AttendanceRecord"
  FOR ALL
  USING (
    current_app_person_id() IS NULL
    OR current_app_roles() ~* '(ADMIN|PASTOR)'
    OR EXISTS (
      SELECT 1 FROM "Assignment" a
      JOIN "Team" t ON t.id = a."teamId"
      WHERE a."personId" = current_app_person_id()
        AND t."key" = 'information_center'
        AND a."endedAt" IS NULL
    )
  );

-- ─── 5. AuditEvent: Append-Only Immutable Ledger ─────────────────────────────

CREATE OR REPLACE RULE audit_event_no_update AS ON UPDATE TO "AuditEvent" DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_event_no_delete AS ON DELETE TO "AuditEvent" DO INSTEAD NOTHING;
