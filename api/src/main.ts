import 'dotenv/config'; // load .env before any module reads process.env
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { validateEnv } from './config/env';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind Nginx, trust it to pass the real client address, which the login limit relies on.
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

bootstrap().catch((err: Error) => {
  // Print setting problems plainly, without a long stack trace.
  console.error(err.message);
  process.exit(1);
});
