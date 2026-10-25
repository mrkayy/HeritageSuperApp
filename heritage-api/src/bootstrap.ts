import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AppConfig } from './platform/config/config.module.js';

export async function createConfiguredApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    forceCloseConnections: true,
  });
  const config = app.get(AppConfig);

  // Set global API route prefix while keeping root & health probes accessible
  app.setGlobalPrefix('api', {
    exclude: ['/', 'api', 'health/live', 'health/ready', 'api/health/live', 'api/health/ready'],
  });

  app.use(cookieParser());
  app.disable('x-powered-by');

  // Disable ETags and enforce cache-control so dynamic API responses & confidential PII are never 304-cached
  app.set('etag', false);
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Behind a reverse proxy in production so req.ip reflects the client (throttling/audit).
  app.set('trust proxy', 1);

  // Enable CORS with support for Idempotency-Key and dynamic dev origin matching
  const allowedOrigins = config.get('ALLOWED_ORIGINS');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile native apps, curl, server-to-server, uptime monitors)
      if (!origin) {
        return callback(null, true);
      }
      // In development or local test, allow any localhost/127.0.0.1 port (Vite, React dev servers)
      if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Match explicit configured allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'Idempotency-Key',
      'x-heritage-client',
      'x-request-id',
    ],
    exposedHeaders: ['Idempotency-Key', 'x-request-id'],
  });

  app.enableShutdownHooks();

  return app;
}
