import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { ServerOptions } from 'socket.io';
import { setApp } from './app';
import { SerializerInterceptor } from './shared/interceptors/serializer.interceptor';

/**
 * https://stackoverflow.com/questions/65957386/cors-error-with-socket-io-connections-on-chrome-v88-and-nestjs-server
 */
export class WorkaroundSocketAdapter extends IoAdapter {
  createIOServer(
    port: number,
    options?: ServerOptions & { namespace?: string; server?: unknown },
  ) {
    return super.createIOServer(port, { ...options, cors: true });
  }
}

export const configureApplication = (app: INestApplication): void => {
  app.useWebSocketAdapter(new WorkaroundSocketAdapter(app));
  app.useGlobalInterceptors(new SerializerInterceptor());
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
  setApp(app);
};
