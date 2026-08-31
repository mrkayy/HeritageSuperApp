import { z } from 'zod';

export const followUpSchema = z.object({
  soul_id: z.string().min(1, 'Soul is required'),
  assigned_to_user_id: z.string().min(1, 'Assignee is required'),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  notes: z.string().optional().default(''),
});

export type FollowUpFormValues = z.infer<typeof followUpSchema>;
