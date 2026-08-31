import { z } from 'zod';

export const visitorIntakeSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  address: z.string().min(1, 'Residential address is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional().default(''),
  prayer_request: z.string().optional().default(''),
  invited_by_member_id: z.string().optional().default(''),
  invited_by_text: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export type VisitorIntakeFormValues = z.infer<typeof visitorIntakeSchema>;

export const churchSettingsSchema = z.object({
  foundation_class_min_attendance: z.number().min(1, 'Must be at least 1').max(10, 'Must be 10 or less'),
});

export type ChurchSettingsFormValues = z.infer<typeof churchSettingsSchema>;
