import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { MongoError } from 'mongodb';

@Catch(MongoError)
export class MongoDbErrorFilter implements ExceptionFilter {
  catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 11000: // duplicate key error
        response.status(422).json({
          statusCode: 422,
          message: 'duplicate found',
        });
        break;

      default:
        new Logger().error(exception);
        response.status(500).json({
          statusCode: 500,
          message: 'Internal server error',
        });
    }
  }
}
