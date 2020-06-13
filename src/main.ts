import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import { LogLevel } from '@nestjs/common';

async function bootstrap() {
  let logLevels: LogLevel[];

  if (process.env.NODE_ENV === 'production') {
    logLevels = ['error', 'warn', 'log', 'verbose'];
  } else {
    logLevels = ['error', 'warn', 'log', 'verbose', 'debug'];
  }

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  app.enableCors();
  app.use(helmet());
  app.use(helmet
    .contentSecurityPolicy({
      directives: {
        defaultSrc: ['\'none\''],
        baseUri: ['\'none\''],
        formAction: ['\'none\''],
        scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
