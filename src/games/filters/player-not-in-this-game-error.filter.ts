import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';

@Catch(PlayerNotInThisGameError)
export class PlayerNotInThisGameErrorFilter
  implements ExceptionFilter<PlayerNotInThisGameError>
{
  catch(exception: PlayerNotInThisGameError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(401).json({
      statusCode: 401,
      path: request.url,
      error: `you do not take part in this game`,
    });
  }
}
