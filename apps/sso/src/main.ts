import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const portValue = process.env['SSO_PORT'] ?? '3001';
  const port = Number.parseInt(portValue, 10);
  await app.listen(Number.isNaN(port) ? 3001 : port);
}

void bootstrap();
