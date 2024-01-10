import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { ZodError } from 'zod';
import { Response } from 'express';
import { Socket } from 'socket.io';

@Catch(ZodError)
export class ZodFilter<T extends ZodError = ZodError>
  implements ExceptionFilter
{
  catch(exception: T, host: ArgumentsHost) {
    switch (host.getType()) {
      case 'http': {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        return response.status(HttpStatusCode.BadRequest).json({
          errors: exception.errors,
          message: exception.message,
          statusCode: HttpStatusCode.BadRequest,
        });
      }

      case 'ws': {
        const ctx = host.switchToWs();
        const client = ctx.getClient<Socket>();
        return client.emit('exception', {
          errors: exception.errors,
          message: exception.message,
        });
      }
    }
  }
}
