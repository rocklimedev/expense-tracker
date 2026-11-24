import 'dotenv/config'; // load .env before any decorator reads process.env (scheduler timezone)
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim().replace(/\/+$/, '');
  const allowedOrigins = ['https://expense-tracker.spsyndicate.net'];
  if (frontendOrigin) allowedOrigins.push(frontendOrigin);
  app.enableCors(
    process.env.NODE_ENV === 'production' || frontendOrigin
      ? { origin: allowedOrigins }
      : undefined,
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
