import { z } from 'zod';

export const memberProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .refine((val) => val.trim().split(/\s+/).length >= 2, {
      message: 'Please provide both first name and surname (e.g. John Doe)',
    }),
  email: z.string().email('Invalid email address'),
  role: z.enum([
    'super_admin',
    'general_overseer',
    'resident_pastor',
    'church_admin',
    'sector_lead',
    'team_lead',
    'steward',
    'member',
    'first_timer',
    'guest',
  ]),
  current_stage: z.string().min(1, 'Current stage is required'),
  church_id: z.string().optional().default(''),
  sector_id: z.string().optional().default(''),
  team_id: z.string().optional().default(''),
});

export type MemberProfileFormValues = z.infer<typeof memberProfileSchema>;

export const memberCRMSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  surname: z.string().min(1, 'Surname is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional().default(''),
  phoneNumber: z.string().optional().default(''),
  homeAddress: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  role: z.string().default(''),
  dateOfBirthDay: z.number().nullable().optional().default(null),
  dateOfBirthMonth: z.number().nullable().optional().default(null),
  maritalStatus: z.string().optional().default(''),
  weddingAnniversaryDay: z.number().nullable().optional().default(null),
  weddingAnniversaryMonth: z.number().nullable().optional().default(null),
  jobOccupation: z.string().optional().default(''),
  emergencyContactName: z.string().optional().default(''),
  emergencyContactPhone: z.string().optional().default(''),
  allergies: z.string().optional().default(''),
  medicalNotes: z.string().optional().default(''),
  currentStage: z.string().optional().default('first_time_guest'),
});

export type MemberCRMFormValues = z.infer<typeof memberCRMSchema>;

export const memberInfoCenterSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  surname: z.string().min(1, 'Surname is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional().default(''),
  phoneNumber: z.string().optional().default(''),
  role: z.string().optional().default('member'),
  currentStage: z.string().optional().default('first_time_guest'),
  sectorId: z.string().optional().default(''),
  teamId: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  homeAddress: z.string().optional().default(''),
});

export type MemberInfoCenterFormValues = z.infer<typeof memberInfoCenterSchema>;

export const guardianRelationshipSchema = z.object({
  selectedRelativeId: z.string().min(1, 'Please select a relative'),
  relationshipType: z.enum(['parent', 'guardian', 'grandparent', 'sibling_guardian']),
});

export type GuardianRelationshipFormValues = z.infer<typeof guardianRelationshipSchema>;
