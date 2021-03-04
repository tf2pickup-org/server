import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { mongoose } from '@typegoose/typegoose';
import { Request, Response } from 'express';

@Catch(mongoose.Error.DocumentNotFoundError)
export class DocumentNotFoundFilter implements ExceptionFilter {

  catch(exception: mongoose.Error.DocumentNotFoundError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response
      .status(404)
      .json({
        statusCode: 404,
        path: request.url,
      });
  }

}
