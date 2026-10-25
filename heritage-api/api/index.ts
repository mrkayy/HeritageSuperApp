import type { IncomingMessage, ServerResponse } from 'node:http';
import { createConfiguredApp } from '../dist/bootstrap.js';

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
