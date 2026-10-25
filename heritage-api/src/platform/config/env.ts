import { z } from 'zod';

/**
 * Validated environment. Startup fails fast on missing/invalid configuration
 * (master-architecture §6: no default secrets, no silent fallbacks in production).
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  WEB_URL: z.string().url(),
  ALLOWED_ORIGINS: z
    .string()
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  SESSION_COOKIE_NAME: z.string().default('hof_session'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(168),
  SESSION_IDLE_HOURS: z.coerce.number().positive().default(24),
  CLAIM_TOKEN_TTL_HOURS: z.coerce.number().positive().default(72),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().positive().default(15),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().min(3),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.message}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required in production');
  }
  return env;
}
