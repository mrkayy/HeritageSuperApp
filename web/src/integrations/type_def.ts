/**
 * Backwards-compatible re-exports of shared domain entity types.
 * Prefer importing directly from '@repo/dto' in new code.
 */
export type {
  LocalChurch as Church,
  LocalChurch,
  Sector,
  Team,
  User,
  Soul,
  AdminUser,
  AdminUser as Admin,
  OtpInvite as Invite,
  OtpInvite,
  FollowUp,
  OutreachReport,
  SoulJournal,
  UserTeam,
  UserSector,
} from '@repo/dto';
