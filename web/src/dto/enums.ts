export enum user_role {
  super_admin = 'super_admin',
  church_admin = 'church_admin',
  team_lead = 'team_lead',
  member = 'member',
  guest = 'guest',
}

export enum account_status {
  pending = 'pending',
  active = 'active',
  inactive = 'inactive',
}

export enum response_status {
  saved = 'saved',
  not_saved = 'not_saved',
  already_saved = 'already_saved',
}

export enum follow_up_status {
  pending = 'pending',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
}
