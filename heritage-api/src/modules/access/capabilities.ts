import type { Role } from '../../generated/prisma/client.js';

/**
 * Capability catalogue. Roles are templates that expand into capabilities;
 * UI and API both check capabilities, never role names (master-architecture §2.14–15).
 *
 * Scope:
 *   CHURCH — anywhere in the church
 *   TEAM   — only within the team of the assignment that granted it
 */
export const CAPABILITIES = [
  'stewards.read',
  'stewards.invite',
  'stewards.manage', // suspend / reactivate / end appointment
  'teams.read',
  'teams.manage',
  'people.read',
  'people.write',
  'visitors.capture',
  'attendance.record',
  'followups.read',
  'followups.assign',
  'followups.record',
  'reports.read',
] as const;

export type Capability = (typeof CAPABILITIES)[number];
export type Scope = 'CHURCH' | 'TEAM';

export interface Grant {
  capability: Capability;
  scope: Scope;
  teamId: string | null;
  assignmentId: string;
}

type Template = Partial<Record<Capability, Scope>>;

export const ROLE_TEMPLATES: Record<Role, Template> = {
  ADMIN: {
    'stewards.read': 'CHURCH',
    'stewards.invite': 'CHURCH',
    'stewards.manage': 'CHURCH',
    'teams.read': 'CHURCH',
    'teams.manage': 'CHURCH',
    'people.read': 'CHURCH',
    'people.write': 'CHURCH',
    'visitors.capture': 'CHURCH',
    'attendance.record': 'CHURCH',
    'followups.read': 'CHURCH',
    'followups.assign': 'CHURCH',
    'followups.record': 'CHURCH',
    'reports.read': 'CHURCH',
  },
  PASTOR: {
    'stewards.read': 'CHURCH',
    'teams.read': 'CHURCH',
    'people.read': 'CHURCH',
    'people.write': 'CHURCH',
    'visitors.capture': 'CHURCH',
    'attendance.record': 'CHURCH',
    'followups.read': 'CHURCH',
    'followups.assign': 'CHURCH',
    'followups.record': 'CHURCH',
    'reports.read': 'CHURCH',
  },
  TEAM_LEAD: {
    'stewards.read': 'TEAM',
    'stewards.invite': 'TEAM',
    'stewards.manage': 'TEAM',
    'teams.read': 'CHURCH',
    'people.read': 'CHURCH',
    'people.write': 'CHURCH',
    'visitors.capture': 'CHURCH',
    'attendance.record': 'CHURCH',
    'followups.read': 'TEAM',
    'followups.assign': 'TEAM',
    'followups.record': 'TEAM',
    'reports.read': 'TEAM',
  },
  STEWARD: {
    'teams.read': 'CHURCH',
    'people.read': 'CHURCH',
    'visitors.capture': 'CHURCH',
    'attendance.record': 'CHURCH',
    'followups.read': 'TEAM',
    'followups.record': 'TEAM',
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Church Admin',
  PASTOR: 'Pastor',
  TEAM_LEAD: 'Team Lead',
  STEWARD: 'Steward',
};

/** Team-scoped roles must be attached to a team. */
export const TEAM_SCOPED_ROLES: ReadonlySet<Role> = new Set<Role>(['TEAM_LEAD', 'STEWARD']);

export function expandGrants(
  assignments: { id: string; role: Role; teamId: string | null }[],
): Grant[] {
  const grants: Grant[] = [];
  for (const a of assignments) {
    for (const [capability, scope] of Object.entries(ROLE_TEMPLATES[a.role])) {
      grants.push({ capability: capability as Capability, scope: scope!, teamId: a.teamId, assignmentId: a.id });
    }
  }
  return grants;
}

/**
 * Each grant is evaluated on its own — a TEAM grant from one assignment can
 * never be widened by a CHURCH grant of a different capability.
 */
export function can(grants: Grant[], capability: Capability, ctx?: { teamId?: string | null }): boolean {
  return grants.some(
    (g) =>
      g.capability === capability &&
      (g.scope === 'CHURCH' || (ctx?.teamId != null && g.teamId === ctx.teamId) || ctx === undefined),
  );
}
