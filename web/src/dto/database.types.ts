/**
 * Shared database entity types for use across apps/web and apps/api.
 * These are plain TypeScript interfaces derived from the database schema,
 * and intentionally free of any framework-specific decorators or Supabase-specific types.
 */

import {
  user_role,
  account_status,
  response_status,
  follow_up_status,
} from './enums';

// ─── Core Entity Types ────────────────────────────────────────────────────────

export interface AdminUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: user_role;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LocalChurch {
  church_id: string;
  name: string;
  center: string;
  slug: string;
  description?: string | null;
  created_at?: string | null;
}

export interface Sector {
  sector_id: string;
  church_id: string;
  sector_name: string;
  description?: string | null;
  created_at?: string | null;
}

export interface Team {
  team_id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: user_role;
  account_status: account_status;
  church_id?: string | null;
  sector_id?: string | null;
  team_id?: string | null;
  username?: string | null;
  phone_number?: string | null;
  email_verified?: boolean | null;
  is_profile_complete?: boolean;
  verification_otp?: string | null;
  created_by_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // optional nested relations (populated by API)
  church?: LocalChurch | null;
  sector?: Sector | null;
  team?: Team | null;
  userTeams?: UserTeam[];
  userSectors?: UserSector[];
}

export interface UserTeam {
  steward_team_id: string;
  user_id: string;
  team_id: string;
  created_at?: string | null;
  updated_at?: string | null;
  team?: Team;
}

export interface UserSector {
  user_sector_id: string;
  user_id: string;
  sector_id: string;
  created_at?: string | null;
  sector?: Sector;
}

export interface Soul {
  soul_id: string;
  full_name: string;
  phone: string;
  gender?: string | null;
  age_range?: string | null;
  address?: string | null;
  outreach_date?: string | null;
  response_status?: response_status | null;
  is_active?: boolean | null;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sector_id?: string | null;
  team_id?: string | null;
  added_by_user_id?: string | null;
  created_at?: string | null;
}

export interface OtpInvite {
  id: string;
  email: string;
  otp_code: string;
  role: user_role;
  church_id: string;
  sector_id: string;
  used: boolean;
  expires_at: string;
  created_by_user_id: string;
  used_by_user_id?: string | null;
  created_at?: string | null;
}

export interface FollowUp {
  follow_up_id: string;
  soul_id?: string | null;
  assigned_to_user_id?: string | null;
  due_date: string;
  status: follow_up_status | null;
  created_at?: string | null;
}

export interface OutreachReport {
  id: string;
  soul_id: string;
  user_id?: string | null;
  team_id?: string | null;
  sector_id?: string | null;
  outreach_date: string;
  response_status: response_status;
  invited_to_church?: boolean | null;
  note?: string | null;
  created_at?: string | null;
}

export interface SoulJournal {
  journal_id: string;
  soul_id: string;
  user_id?: string | null;
  note: string;
  created_at?: string | null;
}

export interface TransportRequest {
  request_id: string;
  soul_id: string;
  pickup_address?: string | null;
  assigned_team_id?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface ChurchEvent {
  id: string;
  church_id?: string | null;
  name: string;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ChurchTeam {
  church_team_id: string;
  church_id?: string | null;
  team_id?: string | null;
  created_at?: string | null;
}

export interface TeamVolunteer {
  volunteer_id: string;
  team_id?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OutreachTarget {
  target_id: string;
  user_id?: string | null;
  owner_type?: user_role | null;
  target_count: number;
  period: string;
  created_at?: string | null;
}

// ─── View / Aggregate Types ───────────────────────────────────────────────────

export interface FollowUpProgress {
  user_id?: string | null;
  total_follow_ups?: number | null;
  completed?: number | null;
  completion_rate?: number | null;
}

export interface InviteStats {
  user_id?: string | null;
  invited_count?: number | null;
  not_invited_count?: number | null;
}

export interface ResponseStatusSummary {
  user_id?: string | null;
  saved?: number | null;
  not_saved?: number | null;
  already_saved?: number | null;
}

export interface RecentOutreachActivity {
  type?: string | null;
  description?: string | null;
  created_at?: string | null;
}

export interface TeamRanking {
  team_id?: string | null;
  rank_position?: number | null;
  souls_reached?: number | null;
}

export interface WeeklyOutreachSummary {
  week_number?: number | null;
  total_souls?: number | null;
}

export interface MonthlyOutreachProgress {
  user_id?: string | null;
  souls_reached?: number | null;
  target_count?: number | null;
  progress_percent?: number | null;
}

// ─── Admin Dashboard Aggregate ────────────────────────────────────────────────

export interface AdminDashboard {
  followUpProgress: FollowUpProgress[];
  inviteStats: InviteStats[];
  localChurchCount: number;
  userCount: number;
  recentOutreachActivity: RecentOutreachActivity[];
  responseStatusSummary: ResponseStatusSummary[];
  weeklyOutreachSummary: WeeklyOutreachSummary[];
  teamRanking: TeamRanking[];
}
