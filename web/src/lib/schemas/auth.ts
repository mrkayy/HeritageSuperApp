import { z } from 'zod';

export const loginSchema = z.object({
  googleEmail: z.string().email('Please enter a valid email address'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export const guestRegistrationSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type GuestRegistrationFormValues = z.infer<typeof guestRegistrationSchema>;

export const memberRegistrationSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
    role: z.enum(['member', 'guest']),
    team_id: z.string().optional().default(''),
    sector_id: z.string().optional().default(''),
    church_id: z.string().optional().default(''),
    otp: z.string().min(6, 'OTP is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type MemberRegistrationFormValues = z.infer<typeof memberRegistrationSchema>;
