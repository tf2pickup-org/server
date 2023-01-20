import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { ConfigurationEntryNotFoundError } from '../errors/configuration-entry-not-found.error';

@Catch(ConfigurationEntryNotFoundError)
export class ConfigurationEntryErrorFilter implements ExceptionFilter {
  // skipcq: JS-0105
  catch(exception: ConfigurationEntryNotFoundError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(404).json({
      statusCode: 404,
      error: exception.message,
      key: exception.key,
    });
  }
}
