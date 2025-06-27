import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //Elimina propiedades desconocidas del DTO
      forbidNonWhitelisted: true, //Lanza error si llegan propiedades extra
      transform: true, //Convierte tipos automáticamente (string → number, enum, etc)
      transformOptions: { enableImplicitConversion: true }, //Para enums y números
    }),
  );
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
