import { z } from 'zod';

export const transportRequestSchema = z.object({
  soulName: z.string().min(1, 'Soul name is required'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  specialNeeds: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export type TransportRequestFormValues = z.infer<typeof transportRequestSchema>;
