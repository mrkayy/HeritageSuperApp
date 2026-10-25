import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --import tsx prisma/seed.ts',
  },
  datasource: {
    // Use DIRECT_URL (non-pooled) when available for migrations; fall back to DATABASE_URL
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
});

