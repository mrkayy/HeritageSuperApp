export const MEMBERSHIP_STAGES = [
  { value: 'first_time_guest', label: 'First Time Guest' },
  { value: 'foundation_class', label: 'Foundation Class' },
  { value: 'sunday_school_module_1', label: 'Sunday School Module 1' },
  { value: 'sunday_school_module_2', label: 'Sunday School Module 2' },
  { value: 'sunday_school_module_3', label: 'Sunday School Module 3' },
  { value: 'membership_class', label: 'Membership Class' },
  { value: 'stewardship', label: 'Stewardship' },
  { value: 'mit', label: 'Minister In Training' },
  { value: 'resident_pastor', label: 'Resident Pastor' },
] as const;

export const USER_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'general_overseer', label: 'General Overseer' },
  { value: 'resident_pastor', label: 'Resident Pastor' },
  { value: 'church_admin', label: 'Church Admin' },
  { value: 'sector_lead', label: 'Sector Lead' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'assistant_team_lead', label: 'Assistant Team Lead' },
  { value: 'membership_team_lead', label: 'Membership Team Lead' },
  { value: 'membership_assistant_team_lead', label: 'Membership Assistant Team Lead' },
  { value: 'info_center_lead', label: 'Information Center Lead' },
  { value: 'info_center_worker', label: 'Information Center Worker' },
  { value: 'training_coordinator', label: 'Training Coordinator' },
  { value: 'class_teacher', label: 'Class Teacher' },
  { value: 'steward', label: 'Steward' },
  { value: 'member', label: 'Member' },
  { value: 'first_timer', label: 'First Timer' },
  { value: 'guest', label: 'Guest' },
] as const;

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

export const AGE_RANGES = [
  { value: '0-17', label: '0-17' },
  { value: '18-25', label: '18-25' },
  { value: '26-35', label: '26-35' },
  { value: '36-45', label: '36-45' },
  { value: '46-55', label: '46-55' },
  { value: '56+', label: '56+' },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' },
] as const;

export const RESPONSE_STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved' },
  { value: 'not_saved', label: 'Not Saved' },
  { value: 'already_saved', label: 'Already Saved' },
] as const;

export function formatStage(stage?: string): string {
  if (!stage) return 'First Time Guest';
  const cleaned = stage.replace(/'/g, '');
  const found = MEMBERSHIP_STAGES.find((s) => s.value === cleaned);
  if (found) return found.label;
  return cleaned.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMonthName(monthNum?: number | null): string | null {
  if (!monthNum) return null;
  const m = MONTHS.find(item => item.value === monthNum);
  return m ? m.label : null;
}

export function getRoleBadgeVariant(role?: string) {
  switch (role) {
    case 'super_admin':
    case 'church_admin':
      return 'default' as const;
    case 'resident_pastor':
    case 'team_lead':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}
