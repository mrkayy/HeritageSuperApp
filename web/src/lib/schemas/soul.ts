import { z } from 'zod';

export const soulRegistrationSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  gender: z.string().min(1, 'Gender is required'),
  age_range: z.string().min(1, 'Age range is required'),
  address: z.string().optional().default(''),
  response_status: z.enum(['saved', 'not_saved', 'already_saved']).default('saved'),
  note: z.string().optional().default(''),
  latitude: z.number().optional().default(0.0),
  longitude: z.number().optional().default(0.0),
  sector_id: z.string().optional().default(''),
  team_id: z.string().optional().default(''),
  added_by_user_id: z.string().optional().default(''),
  outreach_date: z.string().optional().default(''),
  is_active: z.boolean().optional().default(false),
});

export type SoulRegistrationFormValues = z.infer<typeof soulRegistrationSchema>;
