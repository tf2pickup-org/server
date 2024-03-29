import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { ServerOptions } from 'socket.io';
import { setApp } from './app';
import { SerializerInterceptor } from './shared/interceptors/serializer.interceptor';
// skipcq: JS-C1003
import * as cookieParser from 'cookie-parser';
import { ZodFilter } from './shared/filters/zod.filter';

/**
 * https://stackoverflow.com/questions/65957386/cors-error-with-socket-io-connections-on-chrome-v88-and-nestjs-server
 */
export class WorkaroundSocketAdapter extends IoAdapter {
  createIOServer(
    port: number,
    options?: ServerOptions & { namespace?: string; server?: unknown },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return super.createIOServer(port, { ...options, cors: true });
  }
}

export const configureApplication = (app: INestApplication): void => {
  app.useWebSocketAdapter(new WorkaroundSocketAdapter(app));
  app.useGlobalInterceptors(new SerializerInterceptor());
  app.useGlobalFilters(new ZodFilter());
  app.enableCors({ origin: true, credentials: true });
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
  app.use(cookieParser());
  setApp(app);
};
