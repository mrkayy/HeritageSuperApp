import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createConfiguredApp } from './bootstrap.js';
import { AppConfig } from './platform/config/config.module.js';

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedHandler: ExpressHandler | null = null;

async function getHandler(): Promise<ExpressHandler> {
  if (!cachedHandler) {
    const app = await createConfiguredApp();
    await app.init();
    cachedHandler = app.getHttpAdapter().getInstance() as ExpressHandler;
  }
  return cachedHandler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expressApp = await getHandler();
  return expressApp(req, res);
}

// Standalone server mode for local development, docker, and non-serverless runtimes
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const app = await createConfiguredApp();
  const config = app.get(AppConfig);
  const port = process.env.PORT ? Number(process.env.PORT) : config.get('PORT');
  await app.listen(port);
}


