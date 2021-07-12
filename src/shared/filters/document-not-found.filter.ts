import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { Error } from 'mongoose';

@Catch(Error.DocumentNotFoundError)
export class DocumentNotFoundFilter implements ExceptionFilter {
  catch(exception: Error.DocumentNotFoundError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(404).json({
      statusCode: 404,
      path: request.url,
    });
  }
}
