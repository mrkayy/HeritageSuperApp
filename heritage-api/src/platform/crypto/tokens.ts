import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 32 random bytes, URL-safe. Used for session cookies and emailed tokens. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Only hashes are persisted; a DB leak never yields usable tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}${'*'.repeat(Math.max(1, user.length - 1))}@${domain}`;
}
