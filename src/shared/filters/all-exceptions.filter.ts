import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Handle all exceptions gracefully
 */
@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  // skipcq: JS-0105
  catch(exception: any, host: ArgumentsHost) {
    const socket = host.switchToWs().getClient<Socket>();
    socket.emit('exception', { message: exception.toString() });
  }
}
