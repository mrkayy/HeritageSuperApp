import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AppConfig } from './platform/config/config.module.js';

export async function createConfiguredApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    forceCloseConnections: true,
  });
  const config = app.get(AppConfig);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.disable('x-powered-by');
  // Behind a reverse proxy in production so req.ip reflects the client (throttling/audit).
  app.set('trust proxy', 1);
  app.enableCors({ origin: config.get('ALLOWED_ORIGINS'), credentials: true });
  app.enableShutdownHooks();

  return app;
}
