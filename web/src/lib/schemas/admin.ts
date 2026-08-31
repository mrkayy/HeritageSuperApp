import { z } from 'zod';

export const churchSchema = z.object({
  name: z.string().min(1, 'Church name is required'),
  center: z.string().optional().default(''),
  description: z.string().optional().default(''),
});

export type ChurchFormValues = z.infer<typeof churchSchema>;

export const sectorSchema = z.object({
  sector_name: z.string().min(1, 'Sector name is required'),
  description: z.string().optional().default(''),
  region: z.string().optional().default(''),
  church_id: z.string().optional().default(''),
});

export type SectorFormValues = z.infer<typeof sectorSchema>;

export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional().default(''),
});

export type TeamFormValues = z.infer<typeof teamSchema>;

export const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum([
    'super_admin',
    'general_overseer',
    'resident_pastor',
    'church_admin',
    'sector_lead',
    'team_lead',
    'assistant_team_lead',
    'membership_team_lead',
    'membership_assistant_team_lead',
    'info_center_lead',
    'info_center_worker',
    'training_coordinator',
    'class_teacher',
    'steward',
    'member',
    'first_timer',
    'guest',
  ]),
  used: z.boolean().default(false),
  expires_at: z.string().min(1, 'Expiry date is required'),
  sector_id: z.string().nullable().optional().default(null),
  church_id: z.string().nullable().optional().default(null),
  created_by_user_id: z.string().nullable().optional().default(null),
  used_by_user_id: z.string().nullable().optional().default(null),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;
