import type { Role } from '../../generated/prisma/client.js';

/**
 * Capability catalogue. Roles are templates that expand into capabilities;
 * UI and API both check capabilities, never role names (master-architecture §2.14–15).
 *
 * Scope:
 *   SELF   — only the authenticated person's own profile & journey (baseline for all active accounts)
 *   TEAM   — only within the team of the assignment that granted it
 *   CHURCH — anywhere in the church
 */
export const CAPABILITIES = [
  'self.profile.read',
  'self.profile.write',
  'self.journey.read',
  'stewards.read',
  'stewards.invite',
  'stewards.manage', // suspend / reactivate / end appointment
  'teams.read',
  'teams.manage',
  'people.read',
  'people.write',
  'people.import',
  'visitors.capture',
  'attendance.record',
  'followups.read',
  'followups.assign',
  'followups.record',
  'reports.read',
  'prayer_notes.manage',
  'prayer_notes.email_pastor',
  'celebrations.read',
  'celebrations.contact',
  'landmarks.write',
  'landmarks.approve',
  'governance.audit.read',
] as const;

export type Capability = (typeof CAPABILITIES)[number];
export type Scope = 'SELF' | 'TEAM' | 'CHURCH';

export interface Grant {
  capability: Capability;
  scope: Scope;
  teamId: string | null;
  teamKey?: string | null;
  assignmentId: string;
}

export interface AssignmentContext {
  id: string;
  role: Role;
  teamId: string | null;
  teamKey?: string | null;
}

/**
 * HOF-002-S01: Every active claimed account receives personal SELF baseline grants
 * (`self.profile.read`, `self.profile.write`, `self.journey.read`) without any inferred
 * ministry or department appointment.
 */
export const BASELINE_SELF_CAPABILITIES: readonly Capability[] = [
  'self.profile.read',
  'self.profile.write',
  'self.journey.read',
];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Church Admin',
  PASTOR: 'Pastor',
  TEAM_LEAD: 'Team Lead',
  ASSISTANT_TEAM_LEAD: 'Assistant Team Lead',
  STEWARD: 'Steward',
};

/** Team-scoped roles must be attached to a team. */
export const TEAM_SCOPED_ROLES: ReadonlySet<Role> = new Set<Role>([
  'TEAM_LEAD',
  'ASSISTANT_TEAM_LEAD',
  'STEWARD',
]);

export function expandGrants(assignments: AssignmentContext[]): Grant[] {
  const grants: Grant[] = BASELINE_SELF_CAPABILITIES.map((capability) => ({
    capability,
    scope: 'SELF',
    teamId: null,
    assignmentId: 'baseline:self',
  }));

  for (const a of assignments) {
    const push = (cap: Capability, scope: Scope) => {
      grants.push({
        capability: cap,
        scope,
        teamId: a.teamId,
        teamKey: a.teamKey,
        assignmentId: a.id,
      });
    };

    if (a.role === 'ADMIN') {
      push('stewards.read', 'CHURCH');
      push('stewards.invite', 'CHURCH');
      push('stewards.manage', 'CHURCH');
      push('teams.read', 'CHURCH');
      push('teams.manage', 'CHURCH');
      push('people.read', 'CHURCH');
      push('people.import', 'CHURCH');
      push('people.write', 'CHURCH');
      push('visitors.capture', 'CHURCH');
      push('attendance.record', 'CHURCH');
      push('followups.read', 'CHURCH');
      push('followups.assign', 'CHURCH');
      push('followups.record', 'CHURCH');
      push('reports.read', 'CHURCH');
      push('prayer_notes.manage', 'CHURCH');
      push('prayer_notes.email_pastor', 'CHURCH');
      push('celebrations.read', 'CHURCH');
      push('celebrations.contact', 'CHURCH');
      push('landmarks.write', 'CHURCH');
      push('landmarks.approve', 'CHURCH');
    } else if (a.role === 'PASTOR') {
      push('stewards.read', 'CHURCH');
      push('teams.read', 'CHURCH');
      push('people.read', 'CHURCH');
      push('people.import', 'CHURCH');
      push('people.write', 'CHURCH');
      push('visitors.capture', 'CHURCH');
      push('attendance.record', 'CHURCH');
      push('followups.read', 'CHURCH');
      push('followups.assign', 'CHURCH');
      push('followups.record', 'CHURCH');
      push('reports.read', 'CHURCH');
      push('prayer_notes.manage', 'CHURCH');
      push('celebrations.read', 'CHURCH');
      push('celebrations.contact', 'CHURCH');
      push('landmarks.write', 'CHURCH');
      push('landmarks.approve', 'CHURCH');
    } else if (a.role === 'TEAM_LEAD') {
      push('stewards.read', 'TEAM');
      push('stewards.invite', 'TEAM');
      push('stewards.manage', 'TEAM');
      push('teams.read', 'CHURCH');
      push('people.read', 'CHURCH');
      push('people.import', 'CHURCH');
      push('people.write', 'CHURCH');
      push('visitors.capture', 'CHURCH');
      push('reports.read', 'TEAM');
      push('celebrations.read', 'CHURCH');
      push('celebrations.contact', 'CHURCH');
      push('landmarks.write', 'CHURCH');
      push('landmarks.approve', 'CHURCH');

      // Information Center exclusive: attendance.record
      if (a.teamKey === 'information_center') {
        push('attendance.record', 'CHURCH');
      }

      // Membership Team Lead exclusive: followups and pastoral prayer notes
      if (a.teamKey === 'membership') {
        push('followups.read', 'TEAM');
        push('followups.assign', 'TEAM');
        push('followups.record', 'TEAM');
        push('prayer_notes.manage', 'TEAM');
        push('prayer_notes.email_pastor', 'TEAM');
      }
    } else if (a.role === 'ASSISTANT_TEAM_LEAD') {
      push('stewards.read', 'TEAM');
      push('stewards.invite', 'TEAM');
      push('teams.read', 'CHURCH');
      push('people.read', 'CHURCH');
      push('people.import', 'CHURCH');
      push('visitors.capture', 'CHURCH');
      push('reports.read', 'TEAM');
      push('celebrations.read', 'CHURCH');
      push('celebrations.contact', 'CHURCH');
      push('landmarks.write', 'CHURCH');
      push('landmarks.approve', 'CHURCH');

      // Information Center exclusive: attendance.record
      if (a.teamKey === 'information_center') {
        push('attendance.record', 'CHURCH');
      }

      // Membership Assistant Team Lead: can view, record, and assign follow-ups
      if (a.teamKey === 'membership') {
        push('followups.read', 'TEAM');
        push('followups.assign', 'TEAM');
        push('followups.record', 'TEAM');
      }
    } else if (a.role === 'STEWARD') {
      push('teams.read', 'CHURCH');
      push('people.read', 'TEAM');
      push('visitors.capture', 'CHURCH');
      push('celebrations.read', 'TEAM');
      push('celebrations.contact', 'TEAM');
      push('landmarks.write', 'TEAM');

      // Information Center steward: attendance.record
      if (a.teamKey === 'information_center') {
        push('attendance.record', 'CHURCH');
      }

      // Membership steward: follow-ups (view and record call outcomes within team/assigned)
      if (a.teamKey === 'membership') {
        push('followups.read', 'TEAM');
        push('followups.record', 'TEAM');
      }
    }
  }

  return grants;
}

/**
 * Each grant is evaluated on its own — a TEAM grant from one assignment can
 * never be widened by a CHURCH grant of a different capability.
 */
export function can(
  grants: Grant[],
  capability: Capability,
  ctx?: { teamId?: string | null; teamKey?: string | null },
): boolean {
  return grants.some(
    (g) =>
      g.capability === capability &&
      (g.scope === 'CHURCH' ||
        g.scope === 'SELF' ||
        (ctx?.teamId != null && g.teamId === ctx.teamId) ||
        (ctx?.teamKey != null && g.teamKey === ctx.teamKey) ||
        ctx === undefined),
  );
}
