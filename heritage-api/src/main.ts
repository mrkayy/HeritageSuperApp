import { NestFactory } from '@nestjs/core';
import { createConfiguredApp } from './bootstrap.js';
import { AppConfig } from './platform/config/config.module.js';

async function bootstrap() {
  const app = await createConfiguredApp();
  const config = app.get(AppConfig);
  await app.listen(config.get('PORT'));
}
await bootstrap();

