import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';

@Catch(GameInWrongStateError)
export class GameInWrongStateErrorFilter
  implements ExceptionFilter<GameInWrongStateError>
{
  catch(exception: GameInWrongStateError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(400).json({
      statusCode: 400,
      path: request.url,
      error: `the game is in an invalid state (${exception.gameState})`,
    });
  }
}
