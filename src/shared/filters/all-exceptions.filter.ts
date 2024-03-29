import { assertIsError } from '@/utils/assert-is-error';
import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Handle all exceptions gracefully
 */
@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  // skipcq: JS-0105
  catch(exception: unknown, host: ArgumentsHost) {
    assertIsError(exception);
    const socket = host.switchToWs().getClient<Socket>();
    socket.emit('exception', { message: exception.message });
  }
}
