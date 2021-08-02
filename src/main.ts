import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import { LogLevel } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

/**
 * https://stackoverflow.com/questions/65957386/cors-error-with-socket-io-connections-on-chrome-v88-and-nestjs-server
 */
export class WorkaroundSocketAdapter extends IoAdapter {
  createIOServer(
    port: number,
    options?: ServerOptions & { namespace?: string; server?: any },
  ) {
    return super.createIOServer(port, { ...options, cors: true });
  }
}

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

  app.useWebSocketAdapter(new WorkaroundSocketAdapter(app));
  app.enableCors();
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
