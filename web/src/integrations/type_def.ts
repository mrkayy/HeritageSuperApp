export interface Church {
  id?: string;
  church_id?: string;
  name: string;
  center?: string;
  description?: string;
  slug?: string;
  created_at?: string;
}

export type LocalChurch = Church;

export interface Sector {
  id?: string;
  sector_id?: string;
  name?: string;
  sector_name?: string;
  description?: string;
  church_id?: string;
  church_name?: string;
  member_count?: number;
  created_at?: string;
}

export interface Team {
  id?: string;
  team_id?: string;
  name?: string;
  team_name?: string;
  description?: string;
  church_id?: string;
  sector_id?: string;
  created_at?: string;
}

export interface User {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

export type AdminUser = User;
export type Admin = User;

export interface Invite {
  id: string;
  email: string;
  otp_code: string;
  role: string;
  used: boolean;
  expires_at: string;
  created_at: string;
  sector_id?: string;
}

export type OtpInvite = Invite;

export interface Soul {
  soul_id?: string;
  id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age_range?: string;
  address?: string;
  church_id?: string;
  sector_id?: string;
  team_id?: string;
  added_by_user_id?: string;
  converted_by?: string;
  response_status?: string;
  status?: string;
  is_active?: boolean;
  note?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  outreach_date?: string;
  created_at?: string;
}

export interface FollowUp {
  follow_up_id?: string;
  id?: string;
  soul_id: string;
  assigned_to_user_id?: string;
  assigned_to?: string;
  due_date?: string;
  scheduled_date?: string;
  completed_date?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  soul?: {
    full_name?: string;
    phone?: string;
  };
  assigned_user?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface Transportation {
  request_id?: string;
  transportation_id?: string;
  id?: string;
  soul_id: string;
  pickup_address?: string;
  pickup_location?: string;
  dropoff_location?: string;
  assigned_team_id?: string;
  scheduled_date?: string;
  status?: string;
  driver_id?: string;
  notes?: string;
  created_at?: string;
  soul?: {
    full_name?: string;
    phone?: string;
  };
  assigned_team?: {
    name?: string;
  };
}
